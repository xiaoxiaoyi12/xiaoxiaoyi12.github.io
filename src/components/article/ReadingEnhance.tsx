'use client';

import { useState, useEffect, useCallback } from 'react';

/** Reading progress bar — fixed at top of viewport */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 h-[2px] z-50 transition-[width] duration-100"
      style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
    />
  );
}

/** Back-to-top button — appears after scrolling 400px */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={scrollUp}
      aria-label="回到顶部"
      className="fixed bottom-6 right-6 w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-sm cursor-pointer hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors z-40 flex items-center justify-center shadow-sm"
    >
      ↑
    </button>
  );
}

/** Copy button injected into each pre>code block */
export function CopyCodeButtons() {
  useEffect(() => {
    const blocks = document.querySelectorAll('.prose pre');
    const buttons: HTMLButtonElement[] = [];

    blocks.forEach(pre => {
      if (pre.querySelector('.copy-code-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.textContent = '复制';
      btn.setAttribute('aria-label', '复制代码');

      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent || pre.textContent || '';
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = '已复制';
          setTimeout(() => { btn.textContent = '复制'; }, 2000);
        } catch {
          btn.textContent = '失败';
          setTimeout(() => { btn.textContent = '复制'; }, 2000);
        }
      });

      (pre as HTMLElement).style.position = 'relative';
      pre.appendChild(btn);
      buttons.push(btn);
    });

    return () => {
      buttons.forEach(btn => btn.remove());
    };
  }, []);

  return null;
}
