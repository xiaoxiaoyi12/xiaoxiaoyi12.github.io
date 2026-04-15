'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4 opacity-30">:(</div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        出了点问题
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {error.message || '发生了未知错误'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white border-none cursor-pointer hover:opacity-85 transition-opacity"
      >
        重试
      </button>
    </div>
  );
}
