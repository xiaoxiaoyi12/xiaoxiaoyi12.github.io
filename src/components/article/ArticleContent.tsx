import Link from 'next/link';
import TagList from './TagList';
import ArticleSidebar from './ArticleSidebar';
import ArticleNavigation from './ArticleNavigation';
import { ReadingProgress, BackToTop, CopyCodeButtons } from './ReadingEnhance';
import type { Article, ArticleNavigation as NavType } from '@/lib/types';

interface Props {
  article: Article;
  navigation: NavType;
}

export default function ArticleContent({ article, navigation }: Props) {
  const displayTitle = article.type === 'posts'
    ? article.title.replace(/^日志\s*[-–]\s*/, '')
    : article.title;

  return (
    <>
      <ReadingProgress />
      <ArticleSidebar related={navigation.related} />

      <article>
        <div className="flex items-center gap-3 pt-3">
          <Link href="/" className="text-[var(--accent)] text-[13px] no-underline hover:text-[var(--accent-hover)] transition-colors">
            ← 返回首页
          </Link>
          <span className="text-[13px] text-[var(--text-dimmed)] tabular-nums">{article.date}</span>
          <span className="text-[13px] text-[var(--text-dimmed)]">· 约 {article.readingTime} 分钟</span>
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

        <ArticleNavigation prev={navigation.prev} next={navigation.next} />
      </article>

      <CopyCodeButtons />
      <BackToTop />
    </>
  );
}
