import Link from 'next/link';
import TagList from './TagList';
import type { ArticleMeta } from '@/lib/types';
import { TYPE_LABELS } from '@/lib/types';
import type { FuseResultMatch } from 'fuse.js';

function highlightText(text: string, indices: readonly [number, number][] | undefined): React.ReactNode {
  if (!indices?.length) return text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const [start, end] of indices) {
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(
      <mark key={start} className="bg-[var(--accent-bg)] text-[var(--accent)] rounded-sm px-0.5">
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

interface ArticleCardProps {
  article: ArticleMeta;
  showType?: boolean;
  matches?: readonly FuseResultMatch[];
  matchKeys?: string[];
}

export default function ArticleCard({ article, showType = false, matches, matchKeys }: ArticleCardProps) {
  const href = `/${article.type}/${article.slug}/`;
  const rawTitle = article.title;
  let displayTitle = rawTitle;
  let titleOffset = 0;
  if (article.type === 'posts') {
    const prefix = rawTitle.match(/^日志\s*[-–]\s*/);
    if (prefix) {
      titleOffset = prefix[0].length;
      displayTitle = rawTitle.slice(titleOffset);
    }
  }
  const titleMatch = matches?.find(m => m.key === 'title');
  const excerptMatch = matches?.find(m => m.key === 'excerpt');
  const adjustedTitleIndices = titleMatch?.indices
    ? titleMatch.indices
      .map(([s, e]) => [s - titleOffset, e - titleOffset] as [number, number])
      .filter(([s, e]) => e >= 0 && s < displayTitle.length)
      .map(([s, e]) => [Math.max(0, s), Math.min(displayTitle.length - 1, e)] as [number, number])
    : undefined;
  const hitKeys = new Set(matchKeys || matches?.map(m => m.key) || []);
  const hitLabels = [
    hitKeys.has('title') ? '标题' : null,
    hitKeys.has('tags') ? '标签' : null,
    hitKeys.has('category') ? '分类' : null,
    (hitKeys.has('excerpt') || hitKeys.has('content')) ? '内容' : null,
  ].filter(Boolean) as string[];

  return (
    <Link
      href={href}
      className="block no-underline px-5 py-4 mb-0.5 rounded-[10px] border-l-[3px] border-l-transparent transition-colors hover:bg-[var(--accent-bg)] hover:border-l-[var(--accent)]"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-[var(--text-dimmed)] tabular-nums">{article.date}</span>
        {showType && (
          <span className="text-[11px] text-[var(--accent)] bg-[var(--accent-bg)] px-2 py-px rounded-lg font-medium">
            {TYPE_LABELS[article.type]}
          </span>
        )}
      </div>
      <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1 leading-snug hover:text-[var(--accent)]">
        {adjustedTitleIndices?.length ? highlightText(displayTitle, adjustedTitleIndices) : displayTitle}
      </div>
      {hitLabels.length > 0 && (
        <div className="flex items-center gap-1 mb-1">
          {hitLabels.map(label => (
            <span
              key={label}
              className="text-[10px] text-[var(--text-dimmed)] border border-[var(--border-light)] rounded-md px-1.5 py-0.5"
            >
              命中{label}
            </span>
          ))}
        </div>
      )}
      {article.excerpt && (
        <div className="text-[13px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
          {excerptMatch ? highlightText(article.excerpt, excerptMatch.indices) : article.excerpt}
        </div>
      )}
      {article.tags.length > 0 && <TagList tags={article.tags} />}
    </Link>
  );
}
