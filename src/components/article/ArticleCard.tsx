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
}

export default function ArticleCard({ article, showType = false, matches }: ArticleCardProps) {
  const href = `/${article.type}/${article.slug}/`;
  const displayTitle = article.type === 'posts' ? article.title.replace(/^日志\s*[-–]\s*/, '') : article.title;
  const titleMatch = matches?.find(m => m.key === 'title');
  const excerptMatch = matches?.find(m => m.key === 'excerpt');

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
        {titleMatch ? highlightText(displayTitle, titleMatch.indices) : displayTitle}
      </div>
      {article.excerpt && (
        <div className="text-[13px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
          {excerptMatch ? highlightText(article.excerpt, excerptMatch.indices) : article.excerpt}
        </div>
      )}
      {article.tags.length > 0 && <TagList tags={article.tags} />}
    </Link>
  );
}
