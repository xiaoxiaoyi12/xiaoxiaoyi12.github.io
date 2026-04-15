import Link from 'next/link';
import TagList from './TagList';
import type { Article } from '@/lib/types';

export default function ArticleContent({ article }: { article: Article }) {
  const editUrl = `/admin/edit/?type=${article.type}&file=${article.filename}`;
  const displayTitle = article.type === 'posts'
    ? article.title.replace(/^日志\s*[-–]\s*/, '')
    : article.title;

  return (
    <article>
      <div className="flex items-center gap-3 pt-3">
        <Link href="/" className="text-[var(--accent)] text-[13px] no-underline hover:text-[var(--accent-hover)] transition-colors">
          ← 返回首页
        </Link>
        <span className="text-[13px] text-[var(--text-dimmed)] tabular-nums">{article.date}</span>
      </div>

      <div className="prose mt-4">
        <h1 className="!mt-2">{displayTitle}</h1>
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>

      {article.tags.length > 0 && (
        <div className="mt-8 pt-4 border-t border-[var(--border)]">
          <TagList tags={article.tags} max={99} />
        </div>
      )}

      <div className="mt-6 flex gap-3 pb-10">
        <Link
          href={editUrl}
          className="text-[13px] text-[var(--text-muted)] no-underline hover:text-[var(--accent)] transition-colors"
        >
          编辑
        </Link>
        <Link
          href="/admin/"
          className="text-[13px] text-[var(--text-muted)] no-underline hover:text-[var(--accent)] transition-colors"
        >
          删除
        </Link>
      </div>
    </article>
  );
}
