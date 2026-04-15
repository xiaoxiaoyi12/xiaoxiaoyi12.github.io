import Link from 'next/link';
import type { ArticleMeta } from '@/lib/types';

interface Props {
  prev: ArticleMeta | null;
  next: ArticleMeta | null;
}

export default function ArticleNavigation({ prev, next }: Props) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-10 pt-6 border-t border-[var(--border)] flex justify-between gap-4 pb-10">
      {prev ? (
        <Link
          href={`/${prev.type}/${prev.slug}/`}
          className="flex-1 min-w-0 no-underline group"
        >
          <span className="text-[11px] text-[var(--text-dimmed)]">上一篇</span>
          <p className="text-[14px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mt-0.5 truncate">
            ← {prev.title}
          </p>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={`/${next.type}/${next.slug}/`}
          className="flex-1 min-w-0 no-underline text-right group"
        >
          <span className="text-[11px] text-[var(--text-dimmed)]">下一篇</span>
          <p className="text-[14px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mt-0.5 truncate">
            {next.title} →
          </p>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
