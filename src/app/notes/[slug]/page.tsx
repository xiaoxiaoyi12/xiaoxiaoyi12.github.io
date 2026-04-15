import { notFound } from 'next/navigation';
import { getArticle, getArticlesByType, getAllArticles, getSlugs } from '@/lib/content';
import { getRelatedArticles } from '@/lib/recommend';
import ArticleContent from '@/components/article/ArticleContent';
import type { ArticleNavigation } from '@/lib/types';

const TYPE = 'notes' as const;

export async function generateStaticParams() {
  return getSlugs(TYPE).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(TYPE, slug);
  if (!article) return { title: 'Not Found' };
  return {
    title: `${article.title} | 依人相的月光集市`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.date,
      url: `https://xiaoxiaoyi12.github.io/${TYPE}/${article.slug}/`,
      siteName: '依人相的月光集市',
    },
    twitter: {
      card: 'summary' as const,
      title: article.title,
      description: article.excerpt,
    },
  };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(TYPE, slug);
  if (!article) notFound();

  const sameType = getArticlesByType(TYPE);
  const idx = sameType.findIndex(a => a.slug === slug);
  const navigation: ArticleNavigation = {
    prev: idx < sameType.length - 1 ? sameType[idx + 1] : null,
    next: idx > 0 ? sameType[idx - 1] : null,
    related: getRelatedArticles(article, getAllArticles()),
  };

  return <ArticleContent article={article} navigation={navigation} />;
}
