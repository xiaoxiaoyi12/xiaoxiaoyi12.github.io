'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FrontMatterForm from '@/components/admin/FrontMatterForm';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import { createClient } from '@/lib/github-api';
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
      const filename = `${date}-${slug}.md`;
      const path = `content/${type}/${filename}`;
      const fm = buildFrontMatter({ title, date, tags, category: (type === 'notes' || type === 'readings') ? category : undefined });
      const content = `${fm}\n\n${body}`;
      await client.saveFile(path, content, null, `Add ${filename}`);
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
        <h1 className="text-xl font-bold text-[var(--text-primary)]">新建文章</h1>
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

      <MarkdownEditor value={body} onChange={setBody} />
    </div>
  );
}
