import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl mb-4 opacity-30">404</div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        页面未找到
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        你访问的页面不存在或已被移除
      </p>
      <Link
        href="/"
        className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white no-underline hover:opacity-85 transition-opacity"
      >
        返回首页
      </Link>
    </div>
  );
}
