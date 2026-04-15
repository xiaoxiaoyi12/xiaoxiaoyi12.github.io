'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FrontMatterForm from '@/components/admin/FrontMatterForm';
import TiptapEditor from '@/components/admin/TiptapEditor';
import { createClient } from '@/lib/github-api';
import {
  dataUrlToRawBase64,
  generateImageFilename,
  getImageStoragePath,
  getImagePublicPath,
} from '@/lib/image-upload';
import type { ContentType } from '@/lib/types';

function buildFrontMatter(meta: { title: string; date: string; tags: string[]; category?: string }) {
  const lines = ['---'];
  lines.push(`title: "${meta.title}"`);
  lines.push(`date: ${meta.date}`);
  if (meta.category) lines.push(`category: "${meta.category}"`);
  lines.push(`tags: [${meta.tags.join(', ')}]`);
  lines.push('---');
  return lines.join('\n');
}

export default function NewArticlePage() {
  const router = useRouter();
  const [type, setType] = useState<ContentType>('thoughts');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [publishing, setPublishing] = useState(false);

  const publish = async () => {
    if (!title) { alert('请输入标题'); return; }
    if (!slug) { alert('请输入 slug'); return; }
    const client = createClient();
    if (!client) { alert('请先配置 GitHub Token'); return; }

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
      const content = `${fm}\n\n${finalBody}`;

      if (imageFiles.length > 0) {
        imageFiles.push({ path: articlePath, content, encoding: 'utf-8' });
        await client.commitMultipleFiles(imageFiles, `Add ${articleFilename} with ${imageFiles.length - 1} images`);
      } else {
        await client.saveFile(articlePath, content, null, `Add ${articleFilename}`);
      }

      alert('已提交，约 2 分钟后生效');
      router.push('/admin/');
    } catch (e) {
      alert('发布失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setPublishing(false);
  };

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
        onTypeChange={setType} onTitleChange={setTitle} onDateChange={setDate}
        onSlugChange={setSlug} onCategoryChange={setCategory} onTagsChange={setTags}
      />

      <TiptapEditor value={body} onChange={setBody} />
    </div>
  );
}
