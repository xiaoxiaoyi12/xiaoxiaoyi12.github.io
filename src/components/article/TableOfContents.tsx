'use client';

import { useState, useEffect, useRef } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function TableOfContents() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Extract headings from DOM after render
  useEffect(() => {
    const article = document.querySelector('.prose');
    if (!article) return;

    const headings = article.querySelectorAll('h2, h3');
    const tocItems: TocItem[] = [];

    headings.forEach(el => {
      if (el.id) {
        tocItems.push({
          id: el.id,
          text: el.textContent || '',
          level: el.tagName === 'H2' ? 2 : 3,
        });
      }
    });

    setItems(tocItems);

    // Set up IntersectionObserver
    observerRef.current = new IntersectionObserver(
      entries => {
        // Find the first visible heading
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );

    headings.forEach(el => {
      if (el.id) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <nav>
      <h4 className="text-[11px] font-semibold text-[var(--text-dimmed)] uppercase tracking-wider mb-2">
        目录
      </h4>
      <ul className="list-none p-0 m-0 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {items.map(item => (
          <li key={item.id} className={item.level === 3 ? 'pl-3' : ''}>
            <a
              href={`#${item.id}`}
              onClick={e => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`block text-[12px] leading-relaxed py-0.5 no-underline transition-colors ${
                activeId === item.id
                  ? 'text-[var(--accent)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
