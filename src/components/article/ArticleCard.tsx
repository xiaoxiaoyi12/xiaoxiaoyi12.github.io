import Link from 'next/link';
import TagList from './TagList';
import type { ArticleMeta } from '@/lib/types';
import { TYPE_LABELS } from '@/lib/types';

export default function ArticleCard({ article, showType = false }: { article: ArticleMeta; showType?: boolean }) {
  const href = `/${article.type}/${article.slug}/`;

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
        {article.type === 'posts' ? article.title.replace(/^日志\s*[-–]\s*/, '') : article.title}
      </div>
      {article.excerpt && (
        <div className="text-[13px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
          {article.excerpt}
        </div>
      )}
      {article.tags.length > 0 && <TagList tags={article.tags} />}
    </Link>
  );
}
