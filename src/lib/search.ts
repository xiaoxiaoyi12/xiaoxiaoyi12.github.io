import Fuse, { type FuseResultMatch } from 'fuse.js';

export interface SearchItem {
  slug: string;
  type: string;
  title: string;
  date: string;
  tags: string[];
  category: string;
  excerpt: string;
  content?: string;
}

export interface SearchResult extends SearchItem {
  matches?: readonly FuseResultMatch[];
  matchKeys?: string[];
}

let fuseInstance: Fuse<SearchItem> | null = null;
let fuseShortInstance: Fuse<SearchItem> | null = null;
let searchItems: SearchItem[] | null = null;
let loadPromise: Promise<void> | null = null;

function createFuse(items: SearchItem[], minMatchCharLength: number) {
  return new Fuse(items, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'tags', weight: 0.2 },
      { name: 'category', weight: 0.1 },
      { name: 'excerpt', weight: 0.1 },
      { name: 'content', weight: 0.2 },
    ],
    threshold: 0.4,
    includeMatches: true,
    minMatchCharLength,
  });
}

async function ensureLoaded(): Promise<void> {
  if (fuseInstance && searchItems) return;

  if (!loadPromise) {
    loadPromise = fetch('/search-index.json')
      .then(res => {
        if (!res.ok) throw new Error('搜索索引加载失败');
        return res.json();
      })
      .then((items: SearchItem[]) => {
        searchItems = items;
        fuseInstance = createFuse(items, 2);
      })
      .catch(() => {
        loadPromise = null; // Allow retry on failure
      });
  }

  await loadPromise;
  if (!fuseInstance || !searchItems) throw new Error('搜索索引加载失败');
}

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function buildSnippet(
  content: string,
  indices: readonly [number, number][],
  context = 40,
) {
  if (!indices.length) return { snippet: content.slice(0, 200), adjustedIndices: [] as [number, number][] };
  const [start, end] = indices[0];
  const sliceStart = Math.max(0, start - context);
  const sliceEnd = Math.min(content.length, end + context);
  const prefix = sliceStart > 0 ? '…' : '';
  const suffix = sliceEnd < content.length ? '…' : '';
  const base = content.slice(sliceStart, sliceEnd);
  const snippet = `${prefix}${base}${suffix}`;
  const shift = prefix.length - sliceStart;
  const adjusted = indices
    .map(([s, e]) => [s + shift, e + shift] as [number, number])
    .filter(([s, e]) => e >= prefix.length && s < prefix.length + base.length)
    .map(([s, e]) => [
      Math.max(0, s),
      Math.min(snippet.length - 1, e),
    ] as [number, number]);
  return { snippet, adjustedIndices: adjusted };
}

export async function search(query: string): Promise<SearchResult[]> {
  await ensureLoaded();
  const items = searchItems || [];
  const trimmed = query.trim();
  const useShort = trimmed.length === 1 && hasCjk(trimmed);
  const fuse = useShort
    ? (fuseShortInstance || (fuseShortInstance = createFuse(items, 1)))
    : fuseInstance!;

  return fuse.search(trimmed, { limit: 50 }).map(r => {
    const matches = r.matches || [];
    const rawKeys = Array.from(new Set(matches.map(m => m.key as string)));
    const contentMatch = matches.find(m => m.key === 'content');
    const excerptMatch = matches.find(m => m.key === 'excerpt');
    let excerpt = r.item.excerpt || '';
    let nextMatches = matches.slice();

    if (contentMatch?.indices?.length && r.item.content) {
      const { snippet, adjustedIndices } = buildSnippet(r.item.content, contentMatch.indices);
      excerpt = snippet;
      const patched = {
        ...contentMatch,
        key: 'excerpt',
        indices: adjustedIndices,
      };
      nextMatches = matches
        .filter(m => m.key !== 'excerpt' && m.key !== 'content')
        .concat(patched);
    } else if (excerptMatch?.indices?.length) {
      nextMatches = matches.filter(m => m.key !== 'content');
    }

    return {
      ...r.item,
      excerpt,
      matches: nextMatches,
      matchKeys: rawKeys,
    };
  });
}

/**
 * 预加载搜索索引（在用户聚焦搜索框时调用）
 */
export function preloadSearchIndex(): void {
  ensureLoaded().catch(() => {});
}
