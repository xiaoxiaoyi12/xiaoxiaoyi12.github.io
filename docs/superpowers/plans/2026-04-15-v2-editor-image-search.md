# V2 编辑器升级 + 图片上传 + 搜索增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将博客管理后台从 textarea 升级为 Tiptap 所见即所得编辑器，支持图片拖拽上传到 GitHub 仓库，首页搜索升级为 Fuse.js 模糊搜索。

**Architecture:** Tiptap + tiptap-markdown 实现 MD↔ProseMirror 直接转换（不经过 HTML）。图片编辑时暂存 base64，保存时通过 Git Data API 与文章一次性批量 commit。构建时生成静态搜索索引 JSON，运行时 Fuse.js 客户端模糊搜索。

**Tech Stack:** Tiptap, tiptap-markdown, @tiptap/extension-image, @tiptap/extension-table, Fuse.js, GitHub Git Data API

---

## File Structure

```
src/
  components/admin/
    MarkdownEditor.tsx      ← 删除（被 TiptapEditor 替代）
    TiptapEditor.tsx        ← 新建：Tiptap 编辑器主组件
    EditorToolbar.tsx       ← 新建：工具栏组件
  lib/
    github-api.ts           ← 修改：新增 commitMultipleFiles 方法
    image-upload.ts         ← 新建：图片压缩 + 文件名生成
    search.ts               ← 新建：Fuse.js 搜索封装
  app/
    admin/new/page.tsx      ← 修改：替换编辑器 + 批量提交逻辑
    admin/edit/page.tsx     ← 修改：替换编辑器 + 批量提交逻辑
    HomeClient.tsx          ← 修改：替换搜索逻辑为 Fuse.js
  components/article/
    ArticleCard.tsx         ← 修改：支持匹配高亮
scripts/
  generate-search-index.mjs ← 新建：构建时生成搜索索引
public/
  images/                   ← 新建目录：图片存储
```

---

### Task 1: 安装依赖并验证 tiptap-markdown 兼容性

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 Tiptap 相关依赖**

```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header tiptap-markdown
```

- [ ] **Step 2: 安装 Fuse.js**

```bash
pnpm add fuse.js
```

- [ ] **Step 3: 移除 react-markdown**

```bash
pnpm remove react-markdown
```

- [ ] **Step 4: 验证依赖安装成功**

```bash
pnpm build
```

Expected: 构建成功（MarkdownEditor.tsx 引用了 react-markdown，会报错 — 这是预期的，下一个 Task 会替换它）

如果构建因 MarkdownEditor 的 react-markdown 导入报错，暂时注释掉 MarkdownEditor.tsx 的内容，导出一个空组件占位：

```tsx
// src/components/admin/MarkdownEditor.tsx — 临时占位，Task 2 会删除此文件
export default function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} />;
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/admin/MarkdownEditor.tsx
git commit -m "feat(v2): install tiptap, fuse.js deps; remove react-markdown"
```

---

### Task 2: 创建 EditorToolbar 组件

**Files:**
- Create: `src/components/admin/EditorToolbar.tsx`

- [ ] **Step 1: 创建工具栏组件**

```tsx
// src/components/admin/EditorToolbar.tsx
'use client';

import type { Editor } from '@tiptap/react';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 text-sm rounded transition-colors border-none cursor-pointer ${
        isActive
          ? 'bg-[var(--accent)] text-white'
          : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--accent-bg)] hover:text-[var(--text-primary)]'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[var(--border)] mx-1" />;
}

export default function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-card)] rounded-t-lg flex-wrap">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="加粗 (Ctrl+B)"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="删除线"
      >
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="行内代码"
      >
        {'<>'}
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="标题 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="标题 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="标题 3"
      >
        H3
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="无序列表"
      >
        &#8226; 列表
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="有序列表"
      >
        1. 列表
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="引用"
      >
        &ldquo; 引用
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="代码块"
      >
        {'{ }'} 代码
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => {
          const url = window.prompt('输入链接 URL:');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        isActive={editor.isActive('link')}
        title="插入链接"
      >
        🔗 链接
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="水平线"
      >
        ― 分割
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="撤销 (Ctrl+Z)"
      >
        ↩ 撤销
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="重做 (Ctrl+Shift+Z)"
      >
        ↪ 重做
      </ToolbarButton>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/EditorToolbar.tsx
git commit -m "feat(v2): add EditorToolbar component"
```

---

### Task 3: 创建 TiptapEditor 组件

**Files:**
- Create: `src/components/admin/TiptapEditor.tsx`
- Delete: `src/components/admin/MarkdownEditor.tsx`

- [ ] **Step 1: 创建 TiptapEditor 主组件**

```tsx
// src/components/admin/TiptapEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
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
      onChange(editor.storage.markdown.getMarkdown());
    },
  });

  return (
    <div className="border border-[var(--border-light)] rounded-lg overflow-hidden bg-[var(--bg-primary)]">
      <EditorToolbar editor={editor} />
      <div className="p-4 min-h-[400px] prose prose-invert max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[360px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 删除旧的 MarkdownEditor**

```bash
rm src/components/admin/MarkdownEditor.tsx
```

- [ ] **Step 3: 验证构建**

```bash
pnpm dev
```

打开 http://localhost:3000/admin/new/ — 此时会报错因为 new/edit 页面仍引用 MarkdownEditor。这是预期的，Task 4 修复。

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/TiptapEditor.tsx
git rm src/components/admin/MarkdownEditor.tsx
git commit -m "feat(v2): add TiptapEditor, remove MarkdownEditor"
```

---

### Task 4: 集成 TiptapEditor 到 admin 页面

**Files:**
- Modify: `src/app/admin/new/page.tsx`
- Modify: `src/app/admin/edit/page.tsx`

- [ ] **Step 1: 修改 new/page.tsx — 替换编辑器引用**

在 `src/app/admin/new/page.tsx` 中：

将导入行：
```tsx
import MarkdownEditor from '@/components/admin/MarkdownEditor';
```
替换为：
```tsx
import TiptapEditor from '@/components/admin/TiptapEditor';
```

将使用处：
```tsx
<MarkdownEditor value={body} onChange={setBody} />
```
替换为：
```tsx
<TiptapEditor value={body} onChange={setBody} />
```

- [ ] **Step 2: 修改 edit/page.tsx — 替换编辑器引用**

在 `src/app/admin/edit/page.tsx` 中：

将导入行：
```tsx
import MarkdownEditor from '@/components/admin/MarkdownEditor';
```
替换为：
```tsx
import TiptapEditor from '@/components/admin/TiptapEditor';
```

将使用处：
```tsx
<MarkdownEditor value={body} onChange={setBody} />
```
替换为：
```tsx
<TiptapEditor value={body} onChange={setBody} />
```

- [ ] **Step 3: 验证**

```bash
pnpm dev
```

打开 http://localhost:3000/admin/new/ — 应该看到 Tiptap 编辑器带工具栏。测试：
1. 输入 `## 标题` 然后空格 → 应自动转为 H2
2. 点击工具栏加粗按钮 → 文字变粗
3. 输入 `- ` → 自动变无序列表

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/new/page.tsx src/app/admin/edit/page.tsx
git commit -m "feat(v2): integrate TiptapEditor into admin new/edit pages"
```

---

### Task 5: 图片压缩与文件名工具

**Files:**
- Create: `src/lib/image-upload.ts`

- [ ] **Step 1: 创建图片工具模块**

```typescript
// src/lib/image-upload.ts

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = 1920;
const COMPRESS_QUALITY = 0.85;

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

/**
 * 压缩图片：超过 MAX_WIDTH 时等比缩放，输出 base64 data URL。
 * SVG 和 GIF 不压缩，直接转 base64。
 */
export async function compressImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageUploadError(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大支持 10MB`);
  }

  // SVG 和 GIF 不做压缩
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return fileToBase64DataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= MAX_WIDTH) {
        // 无需压缩，直接返回 data URL
        resolve(fileToBase64DataUrl(file));
        URL.revokeObjectURL(img.src);
        return;
      }
      height = Math.round(height * (MAX_WIDTH / width));
      width = MAX_WIDTH;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL(file.type || 'image/png', COMPRESS_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new ImageUploadError('无法读取图片'));
    };
    img.src = URL.createObjectURL(file);
  });
}

function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageUploadError('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 生成规范化的图片文件名：{timestamp}-{sanitized-name}.{ext}
 */
export function generateImageFilename(originalName: string): string {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop()?.toLowerCase() || 'png';
  const name = originalName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
  return `${timestamp}-${name || 'image'}.${ext}`;
}

/**
 * 生成图片在仓库中的存储路径
 */
export function getImageStoragePath(type: string, filename: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `public/images/${type}/${month}/${filename}`;
}

/**
 * 生成图片在网站上的访问路径（保存到 Markdown 中的路径）
 */
export function getImagePublicPath(type: string, filename: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `/images/${type}/${month}/${filename}`;
}

/**
 * 从 data URL 中提取 raw base64（去掉 data:image/...;base64, 前缀）
 */
export function dataUrlToRawBase64(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
}

/**
 * 判断 src 是否为 base64 data URL（即未上传的新图片）
 */
export function isDataUrl(src: string): boolean {
  return src.startsWith('data:');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/image-upload.ts
git commit -m "feat(v2): add image compression and filename utilities"
```

---

### Task 6: Git Data API 批量提交

**Files:**
- Modify: `src/lib/github-api.ts`

- [ ] **Step 1: 在 GitHubClient 类中添加 commitMultipleFiles 方法**

在 `src/lib/github-api.ts` 的 `GitHubClient` 类中，`deleteFile` 方法之后添加：

```typescript
  async commitMultipleFiles(
    files: { path: string; content: string; encoding: 'utf-8' | 'base64' }[],
    message: string
  ): Promise<void> {
    // 1. Get latest commit SHA from branch ref
    const ref = await this.request(`/git/ref/heads/${this.branch}`);
    const latestCommitSha = ref.object.sha;

    // 2. Get base tree SHA
    const latestCommit = await this.request(`/git/commits/${latestCommitSha}`);
    const baseTreeSha = latestCommit.tree.sha;

    // 3. Create blobs for each file
    const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
    for (const file of files) {
      const blob = await this.request('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({
          content: file.content,
          encoding: file.encoding,
        }),
      });
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    }

    // 4. Create new tree
    const newTree = await this.request('/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    // 5. Create commit
    const newCommit = await this.request('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [latestCommitSha],
      }),
    });

    // 6. Update branch ref to point to new commit
    await this.request(`/git/refs/heads/${this.branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha }),
    });
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/github-api.ts
git commit -m "feat(v2): add Git Data API batch commit method"
```

---

### Task 7: 编辑器图片拖拽/粘贴/按钮上传

**Files:**
- Modify: `src/components/admin/TiptapEditor.tsx`
- Modify: `src/components/admin/EditorToolbar.tsx`

- [ ] **Step 1: 在 TiptapEditor 中添加图片拖拽和粘贴处理**

替换 `src/components/admin/TiptapEditor.tsx` 的完整内容为：

```tsx
// src/components/admin/TiptapEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import { Plugin } from '@tiptap/pm/state';
import EditorToolbar from './EditorToolbar';
import { compressImage, ImageUploadError } from '@/lib/image-upload';

interface TiptapEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

async function handleImageFiles(files: File[], editor: ReturnType<typeof useEditor>) {
  if (!editor) return;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const dataUrl = await compressImage(file);
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    } catch (e) {
      alert(e instanceof ImageUploadError ? e.message : '图片处理失败');
    }
  }
}

function createImageDropPastePlugin(editor: ReturnType<typeof useEditor>) {
  return new Plugin({
    props: {
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const images = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!images.length) return false;
        event.preventDefault();
        handleImageFiles(images, editor);
        return true;
      },
      handlePaste(view, event) {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const images = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!images.length) return false;
        event.preventDefault();
        handleImageFiles(images, editor);
        return true;
      },
    },
  });
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
      onChange(editor.storage.markdown.getMarkdown());
    },
  });

  // Register drop/paste plugin after editor is created
  if (editor && !editor.isDestroyed) {
    const existingPlugins = editor.state.plugins;
    const hasImagePlugin = existingPlugins.some(p => (p as unknown as { key: string }).key?.includes('imageDropPaste'));
    if (!hasImagePlugin) {
      const plugin = createImageDropPastePlugin(editor);
      Object.defineProperty(plugin, 'key', { value: 'imageDropPaste$' });
      editor.registerPlugin(plugin);
    }
  }

  return (
    <div className="border border-[var(--border-light)] rounded-lg overflow-hidden bg-[var(--bg-primary)]">
      <EditorToolbar editor={editor} />
      <div className="p-4 min-h-[400px] prose prose-invert max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[360px] [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在 EditorToolbar 中添加图片上传按钮**

在 `src/components/admin/EditorToolbar.tsx` 中，找到链接按钮后面，水平线按钮之前，添加图片按钮：

在链接 ToolbarButton 之后添加：

```tsx
      <ToolbarButton
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = async () => {
            if (!input.files?.length) return;
            const { compressImage, ImageUploadError } = await import('@/lib/image-upload');
            for (const file of Array.from(input.files)) {
              try {
                const dataUrl = await compressImage(file);
                editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
              } catch (e) {
                alert(e instanceof ImageUploadError ? e.message : '图片处理失败');
              }
            }
          };
          input.click();
        }}
        title="插入图片"
      >
        🖼 图片
      </ToolbarButton>
```

同时在文件顶部确保没有额外 import（compressImage 通过动态 import 加载）。

- [ ] **Step 3: 验证**

```bash
pnpm dev
```

打开 http://localhost:3000/admin/new/ — 测试：
1. 拖拽一张图片到编辑器 → 图片以 base64 显示在编辑器中
2. 粘贴剪贴板中的图片 → 同上
3. 点击工具栏图片按钮 → 弹出文件选择器 → 选择图片后显示
4. 尝试拖入一个 > 10MB 的文件 → 应弹出提示"文件过大"

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/TiptapEditor.tsx src/components/admin/EditorToolbar.tsx
git commit -m "feat(v2): add image drag/paste/button upload to editor"
```

---

### Task 8: 保存逻辑 — 批量提交文章 + 图片

**Files:**
- Modify: `src/app/admin/new/page.tsx`
- Modify: `src/app/admin/edit/page.tsx`

- [ ] **Step 1: 修改 new/page.tsx 的 publish 函数**

在 `src/app/admin/new/page.tsx` 中，添加 import：

```tsx
import {
  isDataUrl,
  dataUrlToRawBase64,
  generateImageFilename,
  getImageStoragePath,
  getImagePublicPath,
} from '@/lib/image-upload';
```

替换 `publish` 函数为：

```tsx
  const publish = async () => {
    if (!title) { alert('请输入标题'); return; }
    if (!slug) { alert('请输入 slug'); return; }
    const client = createClient();
    if (!client) { alert('请先配置 GitHub Token'); return; }

    setPublishing(true);
    try {
      const fm = buildFrontMatter({ title, date, tags, category: (type === 'notes' || type === 'readings') ? category : undefined });

      // Collect new images (data URLs) from markdown body
      let finalBody = body;
      const imageFiles: { path: string; content: string; encoding: 'utf-8' | 'base64' }[] = [];
      const dataUrlPattern = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
      let match;
      while ((match = dataUrlPattern.exec(body)) !== null) {
        const [fullMatch, alt, dataUrl] = match;
        const ext = dataUrl.match(/^data:image\/(\w+)/)?.[1] || 'png';
        const filename = generateImageFilename((alt || 'image') + '.' + ext);
        const storagePath = getImageStoragePath(type, filename);
        const publicPath = getImagePublicPath(type, filename);
        imageFiles.push({
          path: storagePath,
          content: dataUrlToRawBase64(dataUrl),
          encoding: 'base64',
        });
        finalBody = finalBody.replace(fullMatch, `![${alt}](${publicPath})`);
      }

      const articlePath = `content/${type}/${date}-${slug}.md`;
      const content = `${fm}\n\n${finalBody}`;

      if (imageFiles.length > 0) {
        // Batch commit: article + all images
        imageFiles.push({
          path: articlePath,
          content,
          encoding: 'utf-8',
        });
        await client.commitMultipleFiles(imageFiles, `Add ${date}-${slug}.md with ${imageFiles.length - 1} images`);
      } else {
        // Simple commit: article only
        await client.saveFile(articlePath, content, null, `Add ${date}-${slug}.md`);
      }

      alert('已提交，约 2 分钟后生效');
      router.push('/admin/');
    } catch (e) {
      alert('发布失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setPublishing(false);
  };
```

- [ ] **Step 2: 修改 edit/page.tsx 的 publish 函数**

在 `src/app/admin/edit/page.tsx` 中，添加同样的 import：

```tsx
import {
  isDataUrl,
  dataUrlToRawBase64,
  generateImageFilename,
  getImageStoragePath,
  getImagePublicPath,
} from '@/lib/image-upload';
```

替换 `publish` 函数为：

```tsx
  const publish = async () => {
    if (!title) { alert('请输入标题'); return; }
    const client = createClient();
    if (!client) { alert('请先配置 GitHub Token'); return; }

    setPublishing(true);
    try {
      const path = `content/${type}/${filename}`;
      const fm = buildFrontMatter({ title, date, tags, category: (type === 'notes' || type === 'readings') ? category : undefined });

      // Collect new images (data URLs) from markdown body
      let finalBody = body;
      const imageFiles: { path: string; content: string; encoding: 'utf-8' | 'base64' }[] = [];
      const dataUrlPattern = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
      let match;
      while ((match = dataUrlPattern.exec(body)) !== null) {
        const [fullMatch, alt, dataUrl] = match;
        const ext = dataUrl.match(/^data:image\/(\w+)/)?.[1] || 'png';
        const imgFilename = generateImageFilename((alt || 'image') + '.' + ext);
        const storagePath = getImageStoragePath(type, imgFilename);
        const publicPath = getImagePublicPath(type, imgFilename);
        imageFiles.push({
          path: storagePath,
          content: dataUrlToRawBase64(dataUrl),
          encoding: 'base64',
        });
        finalBody = finalBody.replace(fullMatch, `![${alt}](${publicPath})`);
      }

      const content = `${fm}\n\n${finalBody}`;

      if (imageFiles.length > 0) {
        // Batch commit: article + all images
        imageFiles.push({
          path,
          content,
          encoding: 'utf-8',
        });
        await client.commitMultipleFiles(imageFiles, `Update ${filename} with ${imageFiles.length - 1} images`);
      } else {
        // Simple commit: article only
        await client.saveFile(path, content, sha, `Update ${filename}`);
      }

      alert('已提交，约 2 分钟后生效');
      router.push('/admin/');
    } catch (e) {
      alert('发布失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setPublishing(false);
  };
```

- [ ] **Step 3: 验证**

```bash
pnpm dev
```

1. 打开 /admin/new/，输入标题和正文，拖入一张图片，保存
2. 检查 GitHub 仓库 — 应有单个 commit 包含文章 MD 和 public/images/ 下的图片
3. 文章 MD 中图片路径应为 `/images/{type}/{YYYY-MM}/{filename}`，不是 data URL
4. 编辑一篇纯文本文章并保存 — 应正常使用旧的单文件 commit

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/new/page.tsx src/app/admin/edit/page.tsx
git commit -m "feat(v2): batch commit articles with images via Git Data API"
```

---

### Task 9: 搜索索引生成脚本

**Files:**
- Create: `scripts/generate-search-index.mjs`
- Modify: `package.json`

- [ ] **Step 1: 创建搜索索引生成脚本**

```javascript
// scripts/generate-search-index.mjs
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'search-index.json');
const TYPES = ['posts', 'notes', 'readings', 'thoughts'];

function excerptFromBody(body, maxLen = 200) {
  return body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\|[^\n]*\|/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

const index = [];

for (const type of TYPES) {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const filename of files) {
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data, content } = matter(raw);

    index.push({
      slug: filename.replace(/\.md$/, ''),
      type,
      title: data.title || filename.replace(/\.md$/, ''),
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      category: data.category || '',
      excerpt: excerptFromBody(content),
    });
  }
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index));
console.log(`Search index generated: ${index.length} articles`);
```

- [ ] **Step 2: 修改 package.json build script**

在 `package.json` 中，将：

```json
"build": "next build",
```

替换为：

```json
"build": "node scripts/generate-search-index.mjs && next build",
```

- [ ] **Step 3: 验证**

```bash
node scripts/generate-search-index.mjs
```

Expected: 输出 `Search index generated: 41 articles`（或当前文章数量）

```bash
cat public/search-index.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), 'articles'); print(json.dumps(d[0], ensure_ascii=False, indent=2))"
```

Expected: 输出文章数量和第一篇文章的 JSON 结构

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-search-index.mjs package.json
git commit -m "feat(v2): add search index generation script"
```

---

### Task 10: Fuse.js 搜索封装

**Files:**
- Create: `src/lib/search.ts`

- [ ] **Step 1: 创建搜索模块**

```typescript
// src/lib/search.ts
import Fuse from 'fuse.js';

export interface SearchItem {
  slug: string;
  type: string;
  title: string;
  date: string;
  tags: string[];
  category: string;
  excerpt: string;
}

export interface SearchResult extends SearchItem {
  matches?: readonly Fuse.FuseResultMatch[];
}

let fuseInstance: Fuse<SearchItem> | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureLoaded(): Promise<Fuse<SearchItem>> {
  if (fuseInstance) return fuseInstance;

  if (!loadPromise) {
    loadPromise = fetch('/search-index.json')
      .then(res => {
        if (!res.ok) throw new Error('搜索索引加载失败');
        return res.json();
      })
      .then((items: SearchItem[]) => {
        fuseInstance = new Fuse(items, {
          keys: [
            { name: 'title', weight: 0.5 },
            { name: 'tags', weight: 0.3 },
            { name: 'excerpt', weight: 0.2 },
          ],
          threshold: 0.4,
          includeMatches: true,
          minMatchCharLength: 2,
        });
      })
      .catch(() => {
        loadPromise = null; // Allow retry on failure
      });
  }

  await loadPromise;
  if (!fuseInstance) throw new Error('搜索索引加载失败');
  return fuseInstance;
}

export async function search(query: string): Promise<SearchResult[]> {
  const fuse = await ensureLoaded();
  return fuse.search(query, { limit: 50 }).map(r => ({
    ...r.item,
    matches: r.matches,
  }));
}

/**
 * 预加载搜索索引（在用户聚焦搜索框时调用）
 */
export function preloadSearchIndex(): void {
  ensureLoaded().catch(() => {});
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/search.ts
git commit -m "feat(v2): add Fuse.js search module"
```

---

### Task 11: 首页搜索替换为 Fuse.js

**Files:**
- Modify: `src/app/HomeClient.tsx`

- [ ] **Step 1: 读取当前 HomeClient.tsx**

先阅读 `src/app/HomeClient.tsx` 了解当前搜索实现。

- [ ] **Step 2: 修改 HomeClient.tsx 搜索逻辑**

在 `src/app/HomeClient.tsx` 中：

添加 import：
```tsx
import { search as fuseSearch, preloadSearchIndex } from '@/lib/search';
import type { SearchResult } from '@/lib/search';
```

将搜索相关状态和逻辑替换。找到现有的 `query` state 和 `useMemo` 过滤逻辑，替换为：

```tsx
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      fuseSearch(query.trim()).then(results => {
        setSearchResults(results);
        setSearching(false);
      }).catch(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
```

搜索框添加 `onFocus` 预加载：
```tsx
<input
  type="text"
  value={query}
  onChange={e => setQuery(e.target.value)}
  onFocus={() => preloadSearchIndex()}
  placeholder="搜索文章..."
  ...
/>
```

搜索结果渲染部分，将原来使用 `useMemo` 过滤的逻辑替换为 `searchResults`：

当 `query` 非空时，显示 `searchResults` 而不是 tab 内容。搜索结果列表使用现有的 `ArticleCard` 组件，并传入 matches 数据。

- [ ] **Step 3: 验证**

```bash
pnpm dev
```

打开 http://localhost:3000/ — 测试：
1. 聚焦搜索框 → 无可见变化，但 network tab 应显示加载了 search-index.json
2. 输入 "javscript" → 应模糊匹配到包含 "javascript" 的文章
3. 输入标签名 → 应匹配相关文章
4. 清空搜索框 → 恢复正常 tab 视图

- [ ] **Step 4: Commit**

```bash
git add src/app/HomeClient.tsx
git commit -m "feat(v2): replace substring search with Fuse.js fuzzy search"
```

---

### Task 12: 搜索结果高亮

**Files:**
- Modify: `src/components/article/ArticleCard.tsx`

- [ ] **Step 1: 添加高亮工具函数并修改 ArticleCard**

在 `src/components/article/ArticleCard.tsx` 中：

添加 Fuse match 类型 import 和高亮函数：

```tsx
import type Fuse from 'fuse.js';

function highlightText(text: string, indices: readonly [number, number][] | undefined): React.ReactNode {
  if (!indices?.length) return text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const [start, end] of indices) {
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(<mark key={start} className="bg-[var(--accent-bg)] text-[var(--accent)] rounded-sm px-0.5">{text.slice(start, end + 1)}</mark>);
    lastIndex = end + 1;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
```

修改 ArticleCard 的 props 类型，添加可选的 `matches`：

```tsx
interface ArticleCardProps {
  article: ArticleMeta;
  showType?: boolean;
  matches?: readonly Fuse.FuseResultMatch[];
}
```

在标题渲染处，找到标题的匹配数据并高亮：

```tsx
const titleMatch = matches?.find(m => m.key === 'title');
// 在渲染标题的地方使用：
{titleMatch ? highlightText(displayTitle, titleMatch.indices) : displayTitle}
```

在摘要渲染处，同理：

```tsx
const excerptMatch = matches?.find(m => m.key === 'excerpt');
// 在渲染摘要的地方使用：
{excerptMatch ? highlightText(article.excerpt, excerptMatch.indices) : article.excerpt}
```

- [ ] **Step 2: 在 HomeClient 中传递 matches 到 ArticleCard**

在搜索结果渲染处：

```tsx
{searchResults.map(r => (
  <ArticleCard key={`${r.type}/${r.slug}`} article={r} showType matches={r.matches} />
))}
```

- [ ] **Step 3: 验证**

```bash
pnpm dev
```

搜索测试：输入关键词 → 搜索结果中标题和摘要的匹配文字应该有高亮标记（蓝色背景）。

- [ ] **Step 4: Commit**

```bash
git add src/components/article/ArticleCard.tsx src/app/HomeClient.tsx
git commit -m "feat(v2): add search result highlighting"
```

---

### Task 13: 构建验证 + .gitignore 更新

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 更新 .gitignore**

确保 `public/search-index.json` 不被提交（构建时生成）：

在 `.gitignore` 中添加：
```
public/search-index.json
```

- [ ] **Step 2: 完整构建验证**

```bash
pnpm build
```

Expected: 构建成功，输出包含 "Search index generated: XX articles"，然后正常的 Next.js 构建输出。

- [ ] **Step 3: 本地预览验证**

```bash
pnpm start
```

打开 http://localhost:3000 验证：
1. 首页搜索 — 输入关键词，模糊匹配，高亮显示
2. /admin/new/ — Tiptap 编辑器，工具栏，拖拽图片
3. /admin/edit/?type=posts&file=2026-04-14-daily-log.md — 加载已有文章，所见即所得编辑

- [ ] **Step 4: Commit 并推送**

```bash
git add .gitignore
git commit -m "feat(v2): complete V2 - editor upgrade, image upload, fuzzy search"
git push origin master
```
