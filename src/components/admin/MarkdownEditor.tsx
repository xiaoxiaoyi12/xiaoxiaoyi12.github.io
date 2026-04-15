// src/components/admin/MarkdownEditor.tsx — 临时占位，后续 Task 会删除此文件
export default function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} />;
}
