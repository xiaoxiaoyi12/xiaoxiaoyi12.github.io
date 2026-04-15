import Fuse, { type FuseResultMatch } from 'fuse.js';

export interface SearchItem {
  slug: string;
  type: string;
  title: string;
  date: string;
  tags: string[];
  category: string;
  excerpt: string;
}

export interface SearchResult extends SearchItem {
  matches?: readonly FuseResultMatch[];
}

let fuseInstance: Fuse<SearchItem> | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureLoaded(): Promise<Fuse<SearchItem>> {
  if (fuseInstance) return fuseInstance;

  if (!loadPromise) {
    loadPromise = fetch('/search-index.json')
      .then(res => {
        if (!res.ok) throw new Error('搜索索引加载失败');
        return res.json();
      })
      .then((items: SearchItem[]) => {
        fuseInstance = new Fuse(items, {
          keys: [
            { name: 'title', weight: 0.5 },
            { name: 'tags', weight: 0.3 },
            { name: 'excerpt', weight: 0.2 },
          ],
          threshold: 0.4,
          includeMatches: true,
          minMatchCharLength: 2,
        });
      })
      .catch(() => {
        loadPromise = null; // Allow retry on failure
      });
  }

  await loadPromise;
  if (!fuseInstance) throw new Error('搜索索引加载失败');
  return fuseInstance;
}

export async function search(query: string): Promise<SearchResult[]> {
  const fuse = await ensureLoaded();
  return fuse.search(query, { limit: 50 }).map(r => ({
    ...r.item,
    matches: r.matches,
  }));
}

/**
 * 预加载搜索索引（在用户聚焦搜索框时调用）
 */
export function preloadSearchIndex(): void {
  ensureLoaded().catch(() => {});
}
