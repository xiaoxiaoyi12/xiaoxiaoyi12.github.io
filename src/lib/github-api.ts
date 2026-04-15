export interface FileEntry {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
}

export interface FileContent {
  content: string;
  sha: string;
}

export class GitHubClient {
  private token: string;
  private repo: string;
  private branch: string;
  private baseUrl: string;

  constructor(token: string, repo: string, branch = 'master') {
    this.token = token;
    this.repo = repo;
    this.branch = branch;
    this.baseUrl = `https://api.github.com/repos/${repo}`;
  }

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error: ${res.status}`);
    }
    return res.json();
  }

  async testConnection(): Promise<{ login: string }> {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error('Token 无效');
    return res.json();
  }

  async listFiles(dir: string): Promise<FileEntry[]> {
    const data = await this.request(`/contents/${dir}?ref=${this.branch}`);
    return Array.isArray(data) ? data.filter((f: FileEntry) => f.type === 'file') : [];
  }

  async getFile(filePath: string): Promise<FileContent> {
    const data = await this.request(`/contents/${filePath}?ref=${this.branch}`);
    const content = atob(data.content.replace(/\n/g, ''));
    return { content: decodeURIComponent(escape(content)), sha: data.sha };
  }

  async saveFile(filePath: string, content: string, sha: string | null, message: string): Promise<void> {
    const body: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: this.branch,
    };
    if (sha) body.sha = sha;
    await this.request(`/contents/${filePath}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  async deleteFile(filePath: string, sha: string, message: string): Promise<void> {
    await this.request(`/contents/${filePath}`, {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch: this.branch }),
    });
  }
}

export function getGitHubSettings() {
  if (typeof window === 'undefined') return { token: '', repo: '', branch: 'master' };
  return {
    token: localStorage.getItem('gh-token') || '',
    repo: localStorage.getItem('gh-repo') || 'xiaoxiaoyi12/xiaoxiaoyi12.github.io',
    branch: localStorage.getItem('gh-branch') || 'master',
  };
}

export function saveGitHubSettings(token: string, repo: string, branch: string) {
  localStorage.setItem('gh-token', token);
  localStorage.setItem('gh-repo', repo);
  localStorage.setItem('gh-branch', branch);
}

export function createClient(): GitHubClient | null {
  const { token, repo, branch } = getGitHubSettings();
  if (!token) return null;
  return new GitHubClient(token, repo, branch);
}
