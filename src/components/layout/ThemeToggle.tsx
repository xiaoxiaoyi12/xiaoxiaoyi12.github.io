'use client';

import { useEffect, useState } from 'react';

const MODES = ['dark', 'light', 'system'] as const;
type ThemeMode = typeof MODES[number];
const ICONS: Record<ThemeMode, string> = { dark: '🌙', light: '☀️', system: '🖥️' };
const LABELS: Record<ThemeMode, string> = { dark: '暗色模式', light: '亮色模式', system: '跟随系统' };

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode((localStorage.getItem('theme') as ThemeMode) || 'system');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'system') {
        document.documentElement.setAttribute('data-theme', resolveTheme('system'));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, mounted]);

  const toggle = () => {
    const idx = MODES.indexOf(mode);
    const next = MODES[(idx + 1) % MODES.length];
    setMode(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', resolveTheme(next));
  };

  if (!mounted) return <button className="text-[var(--text-muted)] text-[15px] p-1.5 cursor-pointer bg-transparent border-none hover:text-[var(--text-primary)] transition-colors">🌙</button>;

  return (
    <button
      onClick={toggle}
      title={LABELS[mode]}
      aria-label={LABELS[mode]}
      className="text-[var(--text-muted)] text-[15px] p-1.5 cursor-pointer bg-transparent border-none hover:text-[var(--text-primary)] transition-colors"
    >
      {ICONS[mode]}
    </button>
  );
}
