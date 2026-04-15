import { Suspense } from 'react';
import { getArticlesByType } from '@/lib/content';
import type { ArticleMeta } from '@/lib/types';
import HomeClient from './HomeClient';

export default function Home() {
  const posts = getArticlesByType('posts');
  const notes = getArticlesByType('notes');
  const readings = getArticlesByType('readings');
  const thoughts = getArticlesByType('thoughts');

  const notesGrouped = groupByCategory(notes);
  const readingsGrouped = groupByCategory(readings);

  return (
    <Suspense>
      <HomeClient
        posts={posts}
        notesGrouped={notesGrouped}
        readingsGrouped={readingsGrouped}
        thoughts={thoughts}
      />
    </Suspense>
  );
}

function groupByCategory(items: ArticleMeta[]): Record<string, ArticleMeta[]> {
  const groups: Record<string, ArticleMeta[]> = {};
  for (const item of items) {
    const cat = item.category || '未分类';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}
