'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FrontMatterForm from '@/components/admin/FrontMatterForm';
import TiptapEditor from '@/components/admin/TiptapEditor';
import { useToast } from '@/components/admin/Toast';
import { useAdminShortcuts } from '@/components/admin/KeyboardShortcuts';
import { createClient } from '@/lib/github-api';
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

function generateSlug(title: string): string {
  // Extract English words and numbers, ignore Chinese
  const english = title.replace(/[^\w\s-]/g, '').trim();
  if (english) {
    return english.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
  }
  // All Chinese: use a short random slug
  return 'post-' + Date.now().toString(36);
}

export default function NewArticlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState<ContentType>('thoughts');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [draftChecked, setDraftChecked] = useState(false);
  const isDirty = useRef(false);
  const stateRef = useRef({ title, date, slug, category, tags, body, type });

  // Keep ref in sync for interval access
  useEffect(() => {
    stateRef.current = { title, date, slug, category, tags, body, type };
  }, [title, date, slug, category, tags, body, type]);

  // Track unsaved changes
  useEffect(() => {
    isDirty.current = !!(title || body);
  }, [title, body]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty.current) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Draft restore on load
  useEffect(() => {
    const key = getDraftKey('new');
    const draft = loadDraft(key);
    if (draft && draft.title) {
      if (confirm(`发现未保存的草稿「${draft.title}」，是否恢复？`)) {
        setTitle(draft.title);
        setBody(draft.body);
        setDate(draft.date);
        setTags(draft.tags);
        setCategory(draft.category);
        setSlug(draft.slug);
        setType(draft.type as ContentType);
        setSlugManual(true);
      } else {
        clearDraft(key);
      }
    }
    setDraftChecked(true);
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!draftChecked) return;
    const interval = setInterval(() => {
      const s = stateRef.current;
      if (s.title || s.body) {
        saveDraft(getDraftKey('new'), {
          title: s.title, body: s.body, date: s.date,
          tags: s.tags, category: s.category, slug: s.slug,
          type: s.type, savedAt: Date.now(),
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [draftChecked]);

  const publish = async () => {
    if (!title) { toast('请输入标题', 'error'); return; }
    if (!slug) { toast('请输入 slug', 'error'); return; }
    const client = createClient();
    if (!client) { toast('请先配置 GitHub Token', 'error'); return; }

    setPublishing(true);
    try {
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

      const articleFilename = `${date}-${slug}.md`;
      const articlePath = `content/${type}/${articleFilename}`;

      // Check for duplicate slug/date (file already exists)
      try {
        await client.getFile(articlePath);
        toast('已存在同名文章，请修改日期或 slug', 'error');
        setPublishing(false);
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg && !msg.includes('Not Found') && !msg.includes('404')) {
          throw e;
        }
      }
      const content = `${fm}\n\n${finalBody}`;

      if (imageFiles.length > 0) {
        imageFiles.push({ path: articlePath, content, encoding: 'utf-8' });
        await client.commitMultipleFiles(imageFiles, `Add ${articleFilename} with ${imageFiles.length - 1} images`);
      } else {
        await client.saveFile(articlePath, content, null, `Add ${articleFilename}`);
      }

      isDirty.current = false;
      clearDraft(getDraftKey('new'));
      toast('已提交，约 2 分钟后生效', 'success');
      router.push('/admin/');
    } catch (e) {
      toast('发布失败: ' + (e instanceof Error ? e.message : '未知错误'), 'error');
    }
    setPublishing(false);
  };

  useAdminShortcuts({
    onSave: () => publish(),
    onBack: () => router.push('/admin/'),
  });

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
          <h1 className="text-xl font-bold text-[var(--text-primary)]">新建文章</h1>
        </div>
        <button
          onClick={publish}
          disabled={publishing}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white border-none cursor-pointer hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {publishing ? '发布中...' : '发布'}
        </button>
      </div>

      <FrontMatterForm
        type={type} title={title} date={date} slug={slug} category={category} tags={tags}
        onTypeChange={setType}
        onTitleChange={(v) => {
          setTitle(v);
          if (!slugManual) setSlug(generateSlug(v));
        }}
        onDateChange={setDate}
        onSlugChange={(v) => { setSlug(v); setSlugManual(true); }}
        onCategoryChange={setCategory} onTagsChange={setTags}
      />

      <TiptapEditor value={body} onChange={setBody} />
    </div>
  );
}
