'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import EditorToolbar from './EditorToolbar';

interface TiptapEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

export default function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
        bulletListMarker: '-',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      onChange(md);
    },
  });

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
      <EditorToolbar editor={editor} />
      <div
        className={[
          'prose max-w-none p-4 min-h-[400px]',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:min-h-[360px]',
        ].join(' ')}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
