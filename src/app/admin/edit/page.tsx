'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import FrontMatterForm from '@/components/admin/FrontMatterForm';
import TiptapEditor from '@/components/admin/TiptapEditor';
import { useToast } from '@/components/admin/Toast';
import { useAdminShortcuts } from '@/components/admin/KeyboardShortcuts';
import { createClient } from '@/lib/github-api';
import { parseFrontMatter } from '@/lib/frontmatter';
import { getDraftKey, saveDraft, loadDraft, clearDraft } from '@/lib/draft';
import {
  dataUrlToRawBase64,
  generateImageFilename,
  getImageStoragePath,
  getImagePublicPath,
} from '@/lib/image-upload';
import type { ContentType } from '@/lib/types';

function escapeYamlString(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function formatTags(tags: string[]): string {
  return tags.map(t => `"${escapeYamlString(t)}"`).join(', ');
}

function buildFrontMatter(meta: { title: string; date: string; tags: string[]; category?: string }) {
  const lines = ['---'];
  lines.push(`title: "${escapeYamlString(meta.title)}"`);
  lines.push(`date: ${meta.date}`);
  if (meta.category) lines.push(`category: "${escapeYamlString(meta.category)}"`);
  lines.push(`tags: [${formatTags(meta.tags)}]`);
  lines.push('---');
  return lines.join('\n');
}

function EditPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const type = (searchParams.get('type') || 'posts') as ContentType;
  const filename = searchParams.get('file') || '';

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [draftChecked, setDraftChecked] = useState(false);
  const isDirty = useRef(false);
  const loadedState = useRef({
    title: '',
    date: '',
    category: '',
    tags: [] as string[],
    body: '',
  });
  const stateRef = useRef({ title, date, slug, category, tags, body, type });

  useEffect(() => {
    stateRef.current = { title, date, slug, category, tags, body, type };
  }, [title, date, slug, category, tags, body, type]);

  // Track unsaved changes
  useEffect(() => {
    const base = loadedState.current;
    const tagsChanged = (tags || []).join('|') !== (base.tags || []).join('|');
    isDirty.current =
      title !== base.title ||
      date !== base.date ||
      category !== base.category ||
      body !== base.body ||
      tagsChanged;
  }, [title, date, body, tags, category]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty.current) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    if (!filename) { setLoading(false); return; }
    loadArticle();
  }, [type, filename]);

  async function loadArticle() {
    const client = createClient();
    if (!client) { setLoading(false); return; }
    try {
      const file = await client.getFile(`content/${type}/${filename}`);
      setSha(file.sha);
      const { fm, body: articleBody } = parseFrontMatter(file.content);
      setTitle((fm.title as string) || '');
      setDate((fm.date as string) || '');
      setCategory((fm.category as string) || '');
      setTags(Array.isArray(fm.tags) ? fm.tags as string[] : []);
      setSlug(filename.replace(/\.md$/, ''));
      setBody(articleBody);
      loadedState.current = {
        title: (fm.title as string) || '',
        date: (fm.date as string) || '',
        category: (fm.category as string) || '',
        tags: Array.isArray(fm.tags) ? fm.tags as string[] : [],
        body: articleBody,
      };
    } catch (e) {
      toast('加载失败: ' + (e instanceof Error ? e.message : '未知错误'), 'error');
    }
    setLoading(false);

    // Check for draft after loading article
    const key = getDraftKey('edit', filename);
    const draft = loadDraft(key);
    if (draft && draft.title) {
      if (confirm(`发现未保存的草稿「${draft.title}」，是否恢复？`)) {
        setTitle(draft.title);
        setBody(draft.body);
        setDate(draft.date);
        setTags(draft.tags);
        setCategory(draft.category);
      } else {
        clearDraft(key);
      }
    }
    setDraftChecked(true);
  }

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!draftChecked || !filename) return;
    const interval = setInterval(() => {
      const s = stateRef.current;
      if (s.title || s.body) {
        saveDraft(getDraftKey('edit', filename), {
          title: s.title, body: s.body, date: s.date,
          tags: s.tags, category: s.category, slug: s.slug,
          type: s.type, savedAt: Date.now(),
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [draftChecked, filename]);

  const publish = async () => {
    if (!title) { toast('请输入标题', 'error'); return; }
    const client = createClient();
    if (!client) { toast('请先配置 GitHub Token', 'error'); return; }

    setPublishing(true);
    try {
      const desiredFilename = `${date}-${slug}.md`;
      let filePath = `content/${type}/${filename}`;
      let targetPath = filePath;
      let shouldDeleteOld = false;

      if (desiredFilename !== filename) {
        const ok = confirm('日期已变更，是否重命名文件（URL 会变化）？\n取消将保留旧 URL。');
        if (ok) {
          targetPath = `content/${type}/${desiredFilename}`;
          shouldDeleteOld = true;
          // Check for duplicate target
          try {
            await client.getFile(targetPath);
            toast('目标文件已存在，请修改日期', 'error');
            setPublishing(false);
            return;
          } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            if (msg && !msg.includes('Not Found') && !msg.includes('404')) {
              throw e;
            }
          }
        }
      }
      const fm = buildFrontMatter({ title, date, tags, category: (type === 'notes' || type === 'readings') ? category : undefined });

      // Collect new images (data URLs) from markdown body
      let finalBody = body;
      const imageFiles: { path: string; content: string; encoding: 'utf-8' | 'base64' }[] = [];
      const dataUrlPattern = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
      let match;
      while ((match = dataUrlPattern.exec(body)) !== null) {
        const [fullMatch, alt, dataUrl] = match;
        const ext = dataUrl.match(/^data:image\/(\w+)/)?.[1] || 'png';
        const imgFilename = generateImageFilename((alt || 'image') + '.' + ext);
        const storagePath = getImageStoragePath(type, imgFilename);
        const publicPath = getImagePublicPath(type, imgFilename);
        imageFiles.push({
          path: storagePath,
          content: dataUrlToRawBase64(dataUrl),
          encoding: 'base64',
        });
        finalBody = finalBody.replace(fullMatch, `![${alt}](${publicPath})`);
      }

      const content = `${fm}\n\n${finalBody}`;

      if (imageFiles.length > 0) {
        imageFiles.push({ path: targetPath, content, encoding: 'utf-8' });
        await client.commitMultipleFiles(imageFiles, `Update ${desiredFilename} with ${imageFiles.length - 1} images`);
      } else {
        if (targetPath !== filePath) {
          await client.saveFile(targetPath, content, null, `Rename ${filename} -> ${desiredFilename}`);
        } else {
          await client.saveFile(filePath, content, sha, `Update ${filename}`);
        }
      }
      if (shouldDeleteOld) {
        await client.deleteFile(filePath, sha, `Delete old file ${filename}`);
      }

      isDirty.current = false;
      clearDraft(getDraftKey('edit', filename));
      toast('已保存，约 2 分钟后生效', 'success');
      router.push('/admin/');
    } catch (e) {
      toast('保存失败: ' + (e instanceof Error ? e.message : '未知错误'), 'error');
    }
    setPublishing(false);
  };

  useAdminShortcuts({
    onSave: () => publish(),
    onBack: () => router.push('/admin/'),
  });

  if (!filename) return <div className="text-[var(--text-muted)] py-10">未指定文件</div>;
  if (loading) return <div className="text-[var(--text-muted)] py-10">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/')}
            className="text-[var(--text-muted)] bg-transparent border-none cursor-pointer text-sm hover:text-[var(--accent)] transition-colors"
          >
            ← 返回
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">编辑: {title || filename}</h1>
        </div>
        <button
          onClick={publish}
          disabled={publishing}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white border-none cursor-pointer hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {publishing ? '保存中...' : '保存'}
        </button>
      </div>

      <FrontMatterForm
        type={type} title={title} date={date} slug={slug} category={category} tags={tags}
        onTypeChange={() => {}} onTitleChange={setTitle} onDateChange={setDate}
        onSlugChange={setSlug} onCategoryChange={setCategory} onTagsChange={setTags}
        disabled
      />

      <TiptapEditor value={body} onChange={setBody} />
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={<div className="text-[var(--text-muted)] py-10">加载中...</div>}>
      <EditPageContent />
    </Suspense>
  );
}
