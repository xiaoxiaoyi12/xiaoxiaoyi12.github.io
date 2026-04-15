'use client';

import { ALL_TYPES, TYPE_LABELS } from '@/lib/types';
import type { ContentType } from '@/lib/types';

interface Props {
  type: ContentType;
  title: string;
  date: string;
  slug: string;
  category: string;
  tags: string[];
  onTypeChange: (t: ContentType) => void;
  onTitleChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onSlugChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

export default function FrontMatterForm(props: Props) {
  const showCategory = props.type === 'notes' || props.type === 'readings';
  const inputClass = "w-full bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:border-[var(--accent)] transition-colors";
  const labelClass = "block text-xs font-medium text-[var(--text-muted)] mb-1";

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const val = input.value.trim().replace(/,$/, '');
      if (val && !props.tags.includes(val)) {
        props.onTagsChange([...props.tags, val]);
      }
      input.value = '';
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
      <div>
        <label className={labelClass}>类型</label>
        <select value={props.type} onChange={e => props.onTypeChange(e.target.value as ContentType)} disabled={props.disabled} className={inputClass}>
          {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>日期</label>
        <input type="date" value={props.date} onChange={e => props.onDateChange(e.target.value)} className={inputClass} />
      </div>
      <div className="col-span-2">
        <label className={labelClass}>标题</label>
        <input type="text" value={props.title} onChange={e => props.onTitleChange(e.target.value)} placeholder="文章标题" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Slug（URL 路径）</label>
        <input type="text" value={props.slug} onChange={e => props.onSlugChange(e.target.value)} placeholder="url-slug" className={inputClass} />
      </div>
      {showCategory && (
        <div>
          <label className={labelClass}>分类</label>
          <input type="text" value={props.category} onChange={e => props.onCategoryChange(e.target.value)} placeholder="分类名" className={inputClass} />
        </div>
      )}
      <div className="col-span-2">
        <label className={labelClass}>标签（回车添加）</label>
        <input type="text" onKeyDown={handleTagKeyDown} placeholder="输入标签后按回车" className={inputClass} />
        {props.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {props.tags.map((tag, i) => (
              <span key={tag} className="text-[11px] text-[var(--accent)] border border-[var(--accent-border)] bg-[var(--accent-bg)] px-2 py-px rounded-[10px] inline-flex items-center gap-1">
                {tag}
                <button onClick={() => props.onTagsChange(props.tags.filter((_, j) => j !== i))} className="bg-transparent border-none text-[var(--text-muted)] cursor-pointer text-xs leading-none hover:text-[var(--accent)]">x</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
