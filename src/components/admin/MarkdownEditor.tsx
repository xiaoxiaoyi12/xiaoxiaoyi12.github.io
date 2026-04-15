'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function MarkdownEditor({ value, onChange }: Props) {
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(400, textareaRef.current.scrollHeight) + 'px';
    }
  }, [value]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-[var(--text-muted)] bg-transparent border border-[var(--border-light)] px-2 py-1 rounded cursor-pointer hover:text-[var(--text-primary)] transition-colors"
        >
          {showPreview ? '隐藏预览' : '显示预览'}
        </button>
      </div>
      <div className={`grid gap-4 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full min-h-[400px] bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-primary)] p-4 text-sm font-mono rounded-lg resize-y focus:outline-none focus:border-[var(--accent)] transition-colors leading-relaxed"
          placeholder="开始写作..."
        />
        {showPreview && (
          <div className="prose min-h-[400px] border border-[var(--border)] rounded-lg p-4 overflow-auto bg-[var(--bg-card)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
