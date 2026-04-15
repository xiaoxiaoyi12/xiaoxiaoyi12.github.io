'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/', label: '文章列表', icon: '📄' },
  { href: '/admin/new/', label: '新建文章', icon: '✏️' },
  { href: '/admin/media/', label: '媒体库', icon: '🖼️' },
  { href: '/admin/settings/', label: '设置', icon: '⚙️' },
];

function NavLinks({ direction = 'col' }: { direction?: 'col' | 'row' }) {
  const pathname = usePathname();

  return (
    <nav className={`flex gap-1 ${direction === 'col' ? 'flex-col' : ''}`}>
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || pathname === item.href.slice(0, -1);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--accent-bg)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminMobileNav() {
  return (
    <div className="md:hidden border-b border-[var(--border)] px-2 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      <NavLinks direction="row" />
    </div>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-[var(--border)] min-h-[calc(100vh-65px)] p-4 hidden md:block">
      <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-4 uppercase tracking-wider">管理后台</h2>
      <NavLinks direction="col" />
    </aside>
  );
}
