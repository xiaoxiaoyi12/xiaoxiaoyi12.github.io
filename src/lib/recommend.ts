import type { ArticleMeta } from './types';

/**
 * Find related articles by tag overlap.
 * Returns up to `limit` articles sorted by overlap count (desc), then date (desc).
 * Falls back to same-type latest articles if no tag overlap found.
 */
export function getRelatedArticles(
  current: ArticleMeta,
  allArticles: ArticleMeta[],
  limit = 3,
): ArticleMeta[] {
  if (current.tags.length === 0) {
    return fallbackSameType(current, allArticles, limit);
  }

  const currentTagSet = new Set(current.tags);

  const scored = allArticles
    .filter(a => !(a.type === current.type && a.slug === current.slug))
    .map(a => ({
      article: a,
      overlap: a.tags.filter(t => currentTagSet.has(t)).length,
    }))
    .filter(s => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.article.date.localeCompare(a.article.date));

  if (scored.length === 0) {
    return fallbackSameType(current, allArticles, limit);
  }

  return scored.slice(0, limit).map(s => s.article);
}

function fallbackSameType(
  current: ArticleMeta,
  allArticles: ArticleMeta[],
  limit: number,
): ArticleMeta[] {
  return allArticles
    .filter(a => a.type === current.type && a.slug !== current.slug)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
