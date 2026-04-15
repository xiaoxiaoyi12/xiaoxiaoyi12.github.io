'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, getGitHubSettings } from '@/lib/github-api';
import { TYPE_LABELS, ALL_TYPES } from '@/lib/types';
import { useToast } from '@/components/admin/Toast';
import { useAdminShortcuts } from '@/components/admin/KeyboardShortcuts';
import type { ContentType } from '@/lib/types';

interface ArticleEntry {
  name: string;
  path: string;
  sha: string;
  type: ContentType;
  title: string;
  date: string;
  tags: string[];
}

function parseFrontMatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val: unknown = line.slice(colonIdx + 1).trim();
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    if (typeof val === 'string') val = val.replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return fm;
}

export default function AdminListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [articles, setArticles] = useState<ArticleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useAdminShortcuts({
    onSearch: () => searchRef.current?.focus(),
  });

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    const client = createClient();
    if (!client) {
      setError('请先在设置中配置 GitHub Token');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch all types in parallel
      const typeResults = await Promise.allSettled(
        ALL_TYPES.map(async type => {
          const files = await client.listFiles(`content/${type}`);
          const mdFiles = files.filter(f => f.name.endsWith('.md'));

          // Fetch all file contents in parallel within each type
          const fileResults = await Promise.allSettled(
            mdFiles.map(async f => {
              const file = await client.getFile(f.path);
              const fm = parseFrontMatter(file.content);
              return {
                name: f.name, path: f.path, sha: f.sha, type,
                title: (fm.title as string) || f.name,
                date: (fm.date as string) || '',
                tags: Array.isArray(fm.tags) ? fm.tags as string[] : [],
              } as ArticleEntry;
            })
          );

          return fileResults.map((r, i) =>
            r.status === 'fulfilled'
              ? r.value
              : { name: mdFiles[i].name, path: mdFiles[i].path, sha: mdFiles[i].sha, type, title: mdFiles[i].name, date: '', tags: [] } as ArticleEntry
          );
        })
      );

      const all = typeResults
        .filter((r): r is PromiseFulfilledResult<ArticleEntry[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      all.sort((a, b) => b.date.localeCompare(a.date));
      setArticles(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
    setLoading(false);
  }

  const stats = useMemo(() => {
    const total = articles.length;
    const byType: Record<string, number> = {};
    for (const t of ALL_TYPES) byType[t] = 0;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      recentByDay[d.toISOString().slice(5, 10)] = 0;
    }
    for (const a of articles) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      if (a.date) {
        const ts = new Date(a.date).getTime();
        if (ts >= sevenDaysAgo) {
          const key = a.date.slice(5, 10);
          if (key in recentByDay) recentByDay[key]++;
        }
      }
    }
    const maxDay = Math.max(...Object.values(recentByDay), 1);
    return { total, byType, recentByDay, maxDay };
  }, [articles]);

  const filtered = useMemo(() => {
    let list = articles;
    if (filterType !== 'all') list = list.filter(a => a.type === filterType);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [articles, filterType, query]);

  async function deleteArticle(article: ArticleEntry) {
    if (!confirm(`确定删除 ${article.title}?\n文件: ${article.path}`)) return;
    const client = createClient();
    if (!client) return;
    try {
      const file = await client.getFile(article.path);
      await client.deleteFile(article.path, file.sha, `Delete ${article.name}`);
      setArticles(prev => prev.filter(a => a.path !== article.path));
      toast('已删除', 'success');
    } catch (e) {
      toast('删除失败: ' + (e instanceof Error ? e.message : '未知错误'), 'error');
    }
  }

  if (loading) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-[var(--border-light)] rounded animate-pulse" />
        <div className="h-9 w-24 bg-[var(--border-light)] rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-8 w-20 bg-[var(--border-light)] rounded-lg animate-pulse" />
        <div className="h-8 w-40 bg-[var(--border-light)] rounded-lg animate-pulse" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-[var(--border)]">
            <div className="h-4 w-20 bg-[var(--border-light)] rounded animate-pulse" />
            <div className="h-4 w-12 bg-[var(--border-light)] rounded animate-pulse" />
            <div className="h-4 flex-1 bg-[var(--border-light)] rounded animate-pulse" />
            <div className="h-4 w-16 bg-[var(--border-light)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return (
    <div className="py-10">
      <p className="text-[var(--text-muted)] mb-4">{error}</p>
      <button onClick={() => router.push('/admin/settings/')} className="text-[var(--accent)] underline cursor-pointer bg-transparent border-none text-sm">
        前往设置
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">文章列表</h1>
        <button
          onClick={() => router.push('/admin/new/')}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white border-none cursor-pointer hover:opacity-85 transition-opacity"
        >
          + 新建文章
        </button>
      </div>

      {/* Dashboard stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">{stats.total}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">总文章</div>
        </div>
        {ALL_TYPES.map(t => (
          <div key={t} className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.byType[t] || 0}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{TYPE_LABELS[t]}</div>
          </div>
        ))}
      </div>

      {/* Recent 7-day activity */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-4 mb-5">
        <div className="text-xs text-[var(--text-muted)] mb-2">近 7 天发布</div>
        <div className="flex items-end gap-1 h-10">
          {Object.entries(stats.recentByDay).map(([day, count]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${Math.max((count / stats.maxDay) * 32, 2)}px`,
                  backgroundColor: count > 0 ? 'var(--accent)' : 'var(--border-light)',
                }}
                title={`${day}: ${count} 篇`}
              />
              <span className="text-[10px] text-[var(--text-dimmed)]">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as ContentType | 'all')}
          className="bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-sm rounded-lg"
        >
          <option value="all">全部</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索... (⌘K)"
          className="bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-sm rounded-lg flex-1 max-w-xs focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-dimmed)]"
        />
        <button onClick={loadArticles} className="text-[var(--text-muted)] text-sm bg-transparent border-none cursor-pointer hover:text-[var(--text-primary)]">
          刷新
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--text-dimmed)] italic py-5">无文章</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">日期</th>
              <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">类型</th>
              <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">标题</th>
              <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.path} className="border-b border-[var(--border)] hover:bg-[var(--accent-bg)] transition-colors">
                <td className="py-2.5 px-3 text-[var(--text-dimmed)] tabular-nums whitespace-nowrap">{a.date}</td>
                <td className="py-2.5 px-3 text-[var(--text-muted)]">{TYPE_LABELS[a.type]}</td>
                <td className="py-2.5 px-3">
                  <button
                    onClick={() => router.push(`/admin/edit/?type=${a.type}&file=${a.name}`)}
                    className="text-[var(--text-primary)] bg-transparent border-none cursor-pointer text-sm text-left hover:text-[var(--accent)] transition-colors"
                  >
                    {a.title}
                  </button>
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => router.push(`/admin/edit/?type=${a.type}&file=${a.name}`)}
                    className="text-[var(--text-muted)] bg-transparent border-none cursor-pointer text-sm hover:text-[var(--accent)] mr-2"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteArticle(a)}
                    className="text-[var(--text-muted)] bg-transparent border-none cursor-pointer text-sm hover:text-red-500"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
