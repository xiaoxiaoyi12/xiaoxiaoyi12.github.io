import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="border-b border-[var(--border)]" style={{ background: 'var(--bg-header)' }}>
      <div className="max-w-[980px] mx-auto px-4 flex items-center justify-between py-4 gap-4">
        <Link href="/" className="no-underline flex flex-col gap-0.5 group">
          <span className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors tracking-tight">
            依人相的月光集市
          </span>
          <span className="text-[13px] text-[var(--text-muted)]">
            只在深夜营业，售卖代码与随想
          </span>
        </Link>
        <nav className="flex items-center">
          <Link href="/bookmark/" className="text-[var(--text-muted)] text-sm font-semibold px-4 py-1.5 no-underline hover:text-[var(--text-primary)] transition-colors">
            书签
          </Link>
          <Link href="/admin/" className="text-[var(--text-muted)] text-sm font-semibold px-4 py-1.5 no-underline hover:text-[var(--text-primary)] transition-colors">
            创作
          </Link>
          <span className="w-px h-4 bg-[var(--border-light)] mx-1" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
