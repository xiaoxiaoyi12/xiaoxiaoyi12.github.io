'use client';

import { useState, useMemo } from 'react';
import ArticleCard from '@/components/article/ArticleCard';
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
  allArticles: ArticleMeta[];
}

export default function HomeClient({ posts, notesGrouped, readingsGrouped, thoughts, allArticles }: Props) {
  const [activeTab, setActiveTab] = useState<ContentType>('posts');
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [query, allArticles]);

  return (
    <section>
      <nav className="flex items-center py-5 gap-1">
        <div className="flex gap-0 overflow-x-auto flex-shrink min-w-0" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setQuery(''); }}
              className={`bg-transparent border-none border-b-2 px-3.5 py-1.5 text-sm font-semibold cursor-pointer transition-all whitespace-nowrap ${
                activeTab === tab.key && !query
                  ? 'text-[var(--accent)] border-b-[var(--accent)]'
                  : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex-shrink-0">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索..."
            className="bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-[13px] rounded-lg w-[140px] focus:w-[200px] focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-dimmed)]"
          />
        </div>
      </nav>

      {/* Search results */}
      {searchResults !== null && (
        <div>
          {searchResults.length === 0 ? (
            <p className="text-[var(--text-dimmed)] italic py-5">未找到匹配内容</p>
          ) : (
            searchResults.map(a => <ArticleCard key={`${a.type}/${a.slug}`} article={a} showType />)
          )}
        </div>
      )}

      {/* Tab content */}
      {searchResults === null && (
        <>
          {activeTab === 'posts' && (
            <div>{posts.map(a => <ArticleCard key={a.slug} article={a} />)}</div>
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
