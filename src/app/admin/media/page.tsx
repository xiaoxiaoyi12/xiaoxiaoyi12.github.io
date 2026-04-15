'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, getGitHubSettings } from '@/lib/github-api';
import { parseFrontMatter } from '@/lib/frontmatter';
import { useToast } from '@/components/admin/Toast';

interface MediaItem {
  name: string;
  path: string;
  sha: string;
  publicPath: string;
  rawUrl: string;
}

const PAGE_SIZE = 40;
const MAX_CONCURRENCY = 6;

function buildRawUrl(repo: string, branch: string, path: string) {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

export default function MediaPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [truncated, setTruncated] = useState(false);
  const [checkingPath, setCheckingPath] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const client = createClient();
    if (!client) {
      setError('请先在设置中配置 GitHub Token');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { repo, branch } = getGitHubSettings();
      const tree = await client.getRepoTreeRecursive();
      setTruncated(tree.truncated);
      const media = tree.tree
        .filter(e => e.type === 'blob' && e.path.startsWith('public/images/'))
        .map(e => {
          const name = e.path.split('/').pop() || e.path;
          const publicPath = e.path.replace(/^public/, '');
          return {
            name,
            path: e.path,
            sha: e.sha,
            publicPath,
            rawUrl: buildRawUrl(repo, branch, e.path),
          } as MediaItem;
        })
        .sort((a, b) => b.path.localeCompare(a.path));
      setItems(media);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.name.toLowerCase().includes(q) || i.path.toLowerCase().includes(q));
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  async function copyText(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg, 'success');
    } catch {
      toast('复制失败', 'error');
    }
  }

  async function mapWithConcurrency<T, R>(
    list: T[],
    limit: number,
    fn: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results = new Array<R>(list.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= list.length) break;
        results[i] = await fn(list[i]);
      }
    });
    await Promise.all(workers);
    return results;
  }

  async function findReferences(publicPath: string, client: ReturnType<typeof createClient>) {
    if (!client) return [];
    const tree = await client.getRepoTreeRecursive();
    const files = tree.tree
      .filter(e => e.type === 'blob' && e.path.startsWith('content/') && e.path.endsWith('.md'))
      .map(e => e.path);

    const refs: { path: string; title: string }[] = [];
    await mapWithConcurrency(files, MAX_CONCURRENCY, async (path) => {
      try {
        const file = await client.getFile(path);
        if (file.content.includes(publicPath)) {
          const { fm } = parseFrontMatter(file.content);
          const title = (fm.title as string) || path.split('/').pop() || path;
          refs.push({ path, title });
        }
      } catch {
        // ignore errors
      }
    });
    return refs;
  }

  async function deleteItem(item: MediaItem) {
    const client = createClient();
    if (!client) return;
    let confirmed = false;
    try {
      setCheckingPath(item.path);
      const refs = await findReferences(item.publicPath, client);
      const preview = refs.slice(0, 5).map(r => `- ${r.title}`).join('\n');
      const more = refs.length > 5 ? `\n... 还有 ${refs.length - 5} 篇` : '';
      const tip = refs.length > 0
        ? `发现该图片被引用于以下文章：\n${preview}${more}\n\n仍要删除吗？`
        : `未发现引用。\n确定删除图片？\n${item.publicPath}`;
      confirmed = confirm(tip);
    } finally {
      setCheckingPath(null);
    }
    if (!confirmed) return;
    try {
      await client.deleteFile(item.path, item.sha, `Delete ${item.name}`);
      setItems(prev => prev.filter(x => x.path !== item.path));
      toast('已删除', 'success');
    } catch (e) {
      toast('删除失败: ' + (e instanceof Error ? e.message : '未知错误'), 'error');
    }
  }

  if (loading) return <p className="text-[var(--text-muted)] py-6">加载中...</p>;
  if (error) return <p className="text-[var(--text-muted)] py-6">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">媒体库</h1>
        <button onClick={load} className="text-[var(--text-muted)] text-sm bg-transparent border-none cursor-pointer hover:text-[var(--text-primary)]">
          刷新
        </button>
      </div>
      {truncated && (
        <div className="text-xs text-[var(--text-dimmed)] mb-3">
          注意：仓库 tree 被截断，列表可能不完整。
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索文件名或路径"
          className="bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-sm rounded-lg w-full max-w-sm focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-dimmed)]"
        />
        <span className="text-xs text-[var(--text-dimmed)]">{filtered.length} 张</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--text-dimmed)] italic py-5">暂无图片</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {pageItems.map(item => (
              <div key={item.path} className="border border-[var(--border-light)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
                <div className="h-40 bg-[var(--bg-page)] flex items-center justify-center overflow-hidden">
                  <img
                    src={item.rawUrl}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-[var(--text-dimmed)] px-2 text-center">{item.name}</span>
                </div>
                <div className="p-2">
                  <div className="text-xs text-[var(--text-muted)] truncate" title={item.path}>
                    {item.path.replace(/^public\//, '')}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => copyText(`![${item.name}](${item.publicPath})`, '已复制 Markdown')}
                      className="text-[11px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--accent)]"
                    >
                      复制 Markdown
                    </button>
                    <button
                      onClick={() => copyText(item.publicPath, '已复制 URL')}
                      className="text-[11px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--accent)]"
                    >
                      复制 URL
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      disabled={checkingPath === item.path}
                      className="text-[11px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer hover:text-red-500 disabled:opacity-50"
                    >
                      {checkingPath === item.path ? '检查中...' : '删除'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-primary)] disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-xs text-[var(--text-dimmed)]">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-primary)] disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
}
