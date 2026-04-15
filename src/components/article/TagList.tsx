import Link from 'next/link';

export default function TagList({ tags, max = 4 }: { tags: string[]; max?: number }) {
  const shown = tags.slice(0, max);
  const overflow = tags.length - max;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {shown.map(tag => (
        <Link
          key={tag}
          href={`/?q=${encodeURIComponent(tag)}`}
          className="text-[11px] text-[var(--accent)] border border-[var(--accent-border)] bg-[var(--accent-bg)] px-2 py-px rounded-[10px] whitespace-nowrap leading-relaxed no-underline hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] transition-colors"
        >
          {tag}
        </Link>
      ))}
      {overflow > 0 && (
        <span className="text-[11px] text-[var(--text-dimmed)]">+{overflow}</span>
      )}
    </div>
  );
}
