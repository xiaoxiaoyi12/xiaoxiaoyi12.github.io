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
import { Plugin } from '@tiptap/pm/state';
import EditorToolbar from './EditorToolbar';
import { compressImage, ImageUploadError } from '@/lib/image-upload';
import { useToast } from './Toast';

interface TiptapEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

async function handleImageFiles(
  files: File[],
  editor: ReturnType<typeof useEditor>,
  onError?: (message: string) => void
) {
  if (!editor) return;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const dataUrl = await compressImage(file);
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    } catch (e) {
      const msg = e instanceof ImageUploadError ? e.message : '图片处理失败';
      console.error(msg);
      onError?.(msg);
    }
  }
}

function createImageDropPastePlugin(
  editor: ReturnType<typeof useEditor>,
  onError?: (message: string) => void
) {
  return new Plugin({
    props: {
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const images = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!images.length) return false;
        event.preventDefault();
        handleImageFiles(images, editor, onError);
        return true;
      },
      handlePaste(view, event) {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const images = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!images.length) return false;
        event.preventDefault();
        handleImageFiles(images, editor, onError);
        return true;
      },
    },
  });
}

export default function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const { toast } = useToast();
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

  // Register drop/paste plugin after editor is created
  if (editor && !editor.isDestroyed) {
    const existingPlugins = editor.state.plugins;
    const hasImagePlugin = existingPlugins.some(
      p => (p as unknown as { key: string }).key?.includes('imageDropPaste')
    );
    if (!hasImagePlugin) {
      const plugin = createImageDropPastePlugin(editor, (msg) => toast(msg, 'error'));
      Object.defineProperty(plugin, 'key', { value: 'imageDropPaste$' });
      editor.registerPlugin(plugin);
    }
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
      <EditorToolbar editor={editor} />
      <div
        className={[
          'prose max-w-none p-4 min-h-[400px]',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:min-h-[360px]',
          '[&_.ProseMirror_img]:max-w-full',
          '[&_.ProseMirror_img]:rounded-lg',
          '[&_.ProseMirror_img]:my-4',
        ].join(' ')}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
