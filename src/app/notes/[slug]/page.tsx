import { notFound } from 'next/navigation';
import { getArticle, getSlugs } from '@/lib/content';
import ArticleContent from '@/components/article/ArticleContent';

export async function generateStaticParams() {
  return getSlugs('notes').map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('notes', slug);
  if (!article) return { title: 'Not Found' };
  return { title: `${article.title} | 依人相的月光集市` };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('notes', slug);
  if (!article) notFound();
  return <ArticleContent article={article} />;
}
