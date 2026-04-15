'use client';

import { useEffect, useState } from 'react';

interface ShortcutHandlers {
  onSave?: () => void;
  onSearch?: () => void;
  onBack?: () => void;
}

export function useAdminShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 's' && handlers.onSave) {
        e.preventDefault();
        handlers.onSave();
      }
      if (mod && e.key === 'k' && handlers.onSearch) {
        e.preventDefault();
        handlers.onSearch();
      }
      if (e.key === 'Escape' && handlers.onBack) {
        const el = document.activeElement;
        if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.closest('.ProseMirror')) return;
        handlers.onBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers.onSave, handlers.onSearch, handlers.onBack]);
}

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);
  const mod = isMac ? '\u2318' : 'Ctrl';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-sm cursor-pointer hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors z-40"
        aria-label="快捷键帮助"
      >
        ?
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">快捷键</h3>
            <ul className="list-none p-0 m-0 space-y-2 text-sm">
              <li className="flex justify-between text-[var(--text-muted)]">
                <span>保存/发布</span>
                <kbd className="text-xs bg-[var(--bg-page)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">{mod}+S</kbd>
              </li>
              <li className="flex justify-between text-[var(--text-muted)]">
                <span>搜索</span>
                <kbd className="text-xs bg-[var(--bg-page)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">{mod}+K</kbd>
              </li>
              <li className="flex justify-between text-[var(--text-muted)]">
                <span>返回列表</span>
                <kbd className="text-xs bg-[var(--bg-page)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">Esc</kbd>
              </li>
            </ul>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white border-none cursor-pointer hover:opacity-85 transition-opacity"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
