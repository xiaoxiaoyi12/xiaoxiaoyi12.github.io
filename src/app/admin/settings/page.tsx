'use client';

import { useState, useEffect } from 'react';
import { getGitHubSettings, saveGitHubSettings, GitHubClient } from '@/lib/github-api';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [testStatus, setTestStatus] = useState('');

  useEffect(() => {
    const s = getGitHubSettings();
    setToken(s.token);
    setRepo(s.repo);
    setBranch(s.branch);
  }, []);

  const save = () => {
    saveGitHubSettings(token, repo, branch);
    setTestStatus('已保存');
    setTimeout(() => setTestStatus(''), 2000);
  };

  const test = async () => {
    setTestStatus('测试中...');
    try {
      const client = new GitHubClient(token, repo, branch);
      const user = await client.testConnection();
      setTestStatus(`已连接: ${user.login}`);
    } catch (e) {
      setTestStatus(`连接失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
  };

  const inputClass = "w-full bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-2 text-sm rounded-lg focus:outline-none focus:border-[var(--accent)] transition-colors";
  const labelClass = "block text-sm font-medium text-[var(--text-secondary)] mb-1.5";
  const btnClass = "px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors";

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">设置</h1>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>GitHub Personal Access Token</label>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} className={inputClass} placeholder="ghp_..." />
        </div>
        <div>
          <label className={labelClass}>仓库（owner/repo）</label>
          <input type="text" value={repo} onChange={e => setRepo(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>分支</label>
          <input type="text" value={branch} onChange={e => setBranch(e.target.value)} className={inputClass} />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={save} className={`${btnClass} bg-[var(--accent)] text-white border-none hover:opacity-85`}>
            保存
          </button>
          <button onClick={test} className={`${btnClass} bg-transparent text-[var(--accent)] border border-[var(--accent-border)] hover:bg-[var(--accent-bg)]`}>
            测试连接
          </button>
        </div>

        {testStatus && (
          <p className="text-sm text-[var(--text-muted)] mt-2">{testStatus}</p>
        )}
      </div>
    </div>
  );
}
