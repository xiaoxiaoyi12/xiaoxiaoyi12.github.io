import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-12 py-6 text-center text-xs text-[var(--text-dimmed)]">
      <div className="flex items-center justify-center gap-3">
        <span>&copy; {new Date().getFullYear()} xiaoxiaoyi</span>
        <span className="opacity-30">|</span>
        <Link href="/feed.xml" className="text-[var(--text-muted)] no-underline hover:text-[var(--accent)] transition-colors">
          RSS
        </Link>
      </div>
    </footer>
  );
}
