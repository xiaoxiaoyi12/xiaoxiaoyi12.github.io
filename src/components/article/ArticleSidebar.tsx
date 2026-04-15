import Link from 'next/link';
import TableOfContents from './TableOfContents';
import type { ArticleMeta } from '@/lib/types';

export default function ArticleSidebar({ related }: { related: ArticleMeta[] }) {
  return (
    <aside
      aria-label="目录与推荐"
      className="fixed top-24 w-[200px] hidden min-[1280px]:block max-h-[calc(100vh-120px)] overflow-y-auto"
      style={{ left: 'calc(50% + 490px + 40px)', scrollbarWidth: 'thin' }}
    >
      <TableOfContents />

      {related.length > 0 && (
        <div className="mt-6">
          <h4 className="text-[11px] font-semibold text-[var(--text-dimmed)] uppercase tracking-wider mb-2">
            推荐阅读
          </h4>
          <ul className="list-none p-0 m-0">
            {related.map(a => (
              <li key={`${a.type}/${a.slug}`} className="mb-1.5">
                <Link
                  href={`/${a.type}/${a.slug}/`}
                  className="block text-[12px] leading-relaxed text-[var(--text-muted)] no-underline hover:text-[var(--accent)] transition-colors line-clamp-2"
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
