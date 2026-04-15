'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ArticleCard from '@/components/article/ArticleCard';
import { search as fuseSearch, preloadSearchIndex } from '@/lib/search';
import type { SearchResult } from '@/lib/search';
import type { ArticleMeta, ContentType } from '@/lib/types';

const TABS: { key: ContentType; label: string }[] = [
  { key: 'posts', label: '文章' },
  { key: 'notes', label: '笔记' },
  { key: 'readings', label: '阅读' },
  { key: 'thoughts', label: '感想' },
];

interface Props {
  posts: ArticleMeta[];
  notesGrouped: Record<string, ArticleMeta[]>;
  readingsGrouped: Record<string, ArticleMeta[]>;
  thoughts: ArticleMeta[];
}

export default function HomeClient({ posts, notesGrouped, readingsGrouped, thoughts }: Props) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<ContentType>('posts');
  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchType, setSearchType] = useState<ContentType | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      fuseSearch(query.trim()).then(results => {
        setSearchResults(results);
        setSearching(false);
      }).catch(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    const params = new URLSearchParams(window.location.search);
    if (q) params.set('q', q);
    else params.delete('q');
    const nextUrl = params.toString() ? `/?${params.toString()}` : '/';
    window.history.replaceState(null, '', nextUrl);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) setSearchType('all');
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable = target?.isContentEditable || tag === 'input' || tag === 'textarea';
      if (isEditable) return;
      if ((e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const hasQuery = query.trim().length > 0;
  const filteredResults = searchType === 'all'
    ? searchResults
    : searchResults.filter(r => r.type === searchType);
  const { topTags, recent } = useMemo(() => {
    const notesFlat = Object.values(notesGrouped).flat();
    const readingsFlat = Object.values(readingsGrouped).flat();
    const all = [...posts, ...notesFlat, ...readingsFlat, ...thoughts];
    const tagCounts = new Map<string, number>();
    for (const a of all) {
      for (const t of a.tags || []) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }
    const top = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([tag]) => tag);
    const recentItems = all
      .filter(a => a.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    return { topTags: top, recent: recentItems };
  }, [posts, notesGrouped, readingsGrouped, thoughts]);

  return (
    <section>
      <nav aria-label="内容分类" className="flex items-center py-5 gap-1">
        <div className="flex gap-0 overflow-x-auto flex-shrink min-w-0" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setQuery(''); }}
              className={`bg-transparent border-none border-b-2 px-3.5 py-1.5 text-sm font-semibold cursor-pointer transition-all whitespace-nowrap ${
                activeTab === tab.key && !hasQuery
                  ? 'text-[var(--accent)] border-b-[var(--accent)]'
                  : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => preloadSearchIndex()}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setQuery('');
                e.currentTarget.blur();
              }
            }}
            placeholder="搜索... (/ 或 ⌘K)"
            className="bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-[13px] rounded-lg w-[150px] focus:w-[220px] focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-dimmed)]"
          />
          {hasQuery && (
            <button
              onClick={() => setQuery('')}
              className="text-[12px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--accent)]"
            >
              清空
            </button>
          )}
        </div>
      </nav>

      {/* Search results */}
      {hasQuery && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] text-[var(--text-dimmed)]">
              {searching ? '搜索中...' : `共 ${filteredResults.length} 条结果`}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchType('all')}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                  searchType === 'all'
                    ? 'text-[var(--accent)] border-[var(--accent-border)] bg-[var(--accent-bg)]'
                    : 'text-[var(--text-dimmed)] border-[var(--border-light)] hover:text-[var(--text-primary)]'
                }`}
              >
                全部
              </button>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSearchType(t.key)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                    searchType === t.key
                      ? 'text-[var(--accent)] border-[var(--accent-border)] bg-[var(--accent-bg)]'
                      : 'text-[var(--text-dimmed)] border-[var(--border-light)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {searching && filteredResults.length === 0 ? (
            <p className="text-[var(--text-dimmed)] italic py-5">搜索中...</p>
          ) : filteredResults.length === 0 ? (
            <div className="py-3">
              <p className="text-[var(--text-dimmed)] italic py-4">未找到匹配内容</p>
              {topTags.length > 0 && (
                <div className="mb-4">
                  <div className="text-[12px] text-[var(--text-muted)] mb-2">试试这些关键词</div>
                  <div className="flex flex-wrap gap-2">
                    {topTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setQuery(tag)}
                        className="text-[11px] text-[var(--accent)] border border-[var(--accent-border)] bg-[var(--accent-bg)] px-2 py-1 rounded-[10px] cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {recent.length > 0 && (
                <div>
                  <div className="text-[12px] text-[var(--text-muted)] mb-2">最近更新</div>
                  <div className="flex flex-col gap-1">
                    {recent.map(a => (
                      <Link
                        key={`${a.type}/${a.slug}`}
                        href={`/${a.type}/${a.slug}/`}
                        className="text-[13px] text-[var(--text-primary)] no-underline hover:text-[var(--accent)]"
                      >
                        <span className="text-[11px] text-[var(--text-dimmed)] tabular-nums mr-2">{a.date}</span>
                        {a.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            filteredResults.map(r => (
              <ArticleCard
                key={`${r.type}/${r.slug}`}
                article={r as unknown as ArticleMeta}
                showType
                matches={r.matches}
                matchKeys={r.matchKeys}
              />
            ))
          )}
        </div>
      )}

      {/* Tab content */}
      {!hasQuery && (
        <>
          {activeTab === 'posts' && (
            <div>
              {posts.length === 0 && <p className="text-[var(--text-dimmed)] italic py-5">暂无文章</p>}
              {posts.map(a => <ArticleCard key={a.slug} article={a} />)}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              {Object.keys(notesGrouped).length === 0 && <p className="text-[var(--text-dimmed)] italic py-5">暂无笔记</p>}
              {Object.entries(notesGrouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-[var(--text-muted)] text-sm mt-7 mb-2 font-semibold uppercase tracking-wider">{cat}</h3>
                  {items.map(a => <ArticleCard key={a.slug} article={a} />)}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'readings' && (
            <div>
              {Object.keys(readingsGrouped).length === 0 && <p className="text-[var(--text-dimmed)] italic py-5">暂无阅读笔记</p>}
              {Object.entries(readingsGrouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-[var(--text-muted)] text-sm mt-7 mb-2 font-semibold uppercase tracking-wider">{cat}</h3>
                  {items.map(a => <ArticleCard key={a.slug} article={a} />)}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'thoughts' && (
            <div>
              {thoughts.length === 0 && <p className="text-[var(--text-dimmed)] italic py-5">暂无生活感想</p>}
              {thoughts.map(a => <ArticleCard key={a.slug} article={a} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}
