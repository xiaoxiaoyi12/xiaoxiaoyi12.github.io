# V1 Blog Next.js Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Jekyll blog to Next.js with SSG, preserving all existing content and visual design, adding a basic admin panel with GitHub API CRUD.

**Architecture:** Next.js 15 App Router with static export. Content stored as Markdown in `content/` directories, processed at build time with unified (remark + rehype). Admin panel is a client-side SPA within the same Next.js app at `/admin`, using GitHub API for file operations.

**Tech Stack:** Next.js 15, TypeScript 5, Tailwind CSS 4, unified/remark/rehype, rehype-pretty-code (shiki), gray-matter, react-markdown, pnpm

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/globals.css`, `.gitignore` (update)

- [ ] **Step 1: Initialize project with pnpm**

```bash
cd /Users/juan/Desktop/xiaoxiaoyi12.github.io
pnpm init
pnpm add next@latest react@latest react-dom@latest typescript@latest @types/react @types/react-dom
pnpm add tailwindcss@latest @tailwindcss/postcss postcss
pnpm add gray-matter remark remark-gfm remark-rehype rehype-stringify rehype-pretty-code shiki
pnpm add react-markdown
pnpm add -D @types/node
```

- [ ] **Step 2: Create next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 5: Create src/styles/globals.css with theme variables**

```css
@import 'tailwindcss';

/* ========= Dark Theme ========= */
[data-theme="dark"] {
  --bg-page: #0d1117;
  --bg-card: #161b22;
  --bg-header: linear-gradient(135deg, #0d1117 0%, #111922 50%, #0f1923 100%);
  --border: #21262d;
  --border-light: #30363d;
  --text-primary: #c9d1d9;
  --text-secondary: #b0b8c1;
  --text-muted: #8b949e;
  --text-dimmed: #484f58;
  --accent: #7eb8ff;
  --accent-hover: #a5cfff;
  --accent-bg: rgba(126, 184, 255, 0.06);
  --accent-border: rgba(126, 184, 255, 0.15);
  --blockquote-bg: rgba(126, 184, 255, 0.04);
  --table-row-even: rgba(22, 27, 34, 0.5);
  --inline-code-color: #e6edf3;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.3);
  --card-hover-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

/* ========= Light Theme ========= */
[data-theme="light"] {
  --bg-page: #faf8f4;
  --bg-card: #fff;
  --bg-header: linear-gradient(135deg, #f0ece4 0%, #faf8f4 100%);
  --border: #e5dfd2;
  --border-light: #ece6d9;
  --text-primary: #2c2a25;
  --text-secondary: #5c574d;
  --text-muted: #918b7e;
  --text-dimmed: #c0b9a8;
  --accent: #6b8f45;
  --accent-hover: #587836;
  --accent-bg: rgba(107, 143, 69, 0.06);
  --accent-border: rgba(107, 143, 69, 0.2);
  --blockquote-bg: rgba(107, 143, 69, 0.04);
  --table-row-even: rgba(245, 241, 234, 0.6);
  --inline-code-color: #2c2a25;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.06);
  --card-hover-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

body {
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  line-height: 1.75;
  background: var(--bg-page);
  color: var(--text-secondary);
}

/* Prose styles for article content */
.prose h1, .prose h2, .prose h3, .prose h4 {
  color: var(--text-primary);
  font-weight: 600;
}
.prose h1 { font-size: 1.5em; margin-top: 1.2em; margin-bottom: 0.5em; }
.prose h2 {
  font-size: 1.3em;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border);
}
.prose h3 { font-size: 1.1em; margin-top: 1.2em; margin-bottom: 0.5em; }
.prose p { color: var(--text-secondary); margin-bottom: 1em; }
.prose a { color: var(--accent); text-decoration: none; }
.prose a:hover { text-decoration: underline; }
.prose ul, .prose ol { color: var(--text-secondary); padding-left: 1.5em; }
.prose li { margin-bottom: 0.4em; line-height: 1.75; }
.prose code {
  background: var(--bg-card);
  color: var(--inline-code-color);
  padding: 0.15em 0.45em;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: "Menlo", "Monaco", "Consolas", monospace;
  border: 1px solid var(--border);
}
.prose pre {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}
.prose pre code {
  background: none;
  padding: 0;
  font-size: 0.85em;
  line-height: 1.6;
  border: none;
}
.prose blockquote {
  border-left: 3px solid var(--accent);
  padding: 0.5em 1em;
  margin: 1em 0;
  color: var(--text-muted);
  background: var(--blockquote-bg);
  border-radius: 0 6px 6px 0;
}
.prose table { width: 100%; border-collapse: collapse; margin: 1em 0; }
.prose th, .prose td {
  padding: 10px 14px;
  border: 1px solid var(--border);
  text-align: left;
  color: var(--text-secondary);
}
.prose th { background: var(--bg-card); color: var(--text-primary); font-weight: 600; }
.prose tr:nth-child(even) { background: var(--table-row-even); }
.prose hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.prose img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
```

- [ ] **Step 6: Create minimal root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '依人相的月光集市',
  description: '只在深夜营业，售卖代码与随想',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var saved = localStorage.getItem('theme') || 'system';
            var theme = saved === 'system'
              ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
              : saved;
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create placeholder page**

```typescript
// src/app/page.tsx
export default function Home() {
  return <div>Blog coming soon</div>;
}
```

- [ ] **Step 8: Update package.json scripts**

Add to package.json:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

- [ ] **Step 9: Update .gitignore**

Append to existing .gitignore:
```
node_modules/
.next/
out/
```

- [ ] **Step 10: Verify build works**

```bash
pnpm dev
# Open http://localhost:3000, verify page loads
# Ctrl+C
pnpm build
# Verify `out/` directory is created
```

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts src/ .gitignore
git commit -m "feat: initialize Next.js project skeleton"
```

---

## Task 2: Content Migration

**Files:**
- Create: `content/posts/`, `content/notes/`, `content/readings/`, `content/thoughts/`
- Create: `scripts/migrate-content.js` (temporary migration script)

- [ ] **Step 1: Create migration script**

```javascript
// scripts/migrate-content.js
const fs = require('fs');
const path = require('path');

const MAPPINGS = [
  { from: '_posts', to: 'content/posts' },
  { from: '_notes', to: 'content/notes' },
  { from: '_readings', to: 'content/readings' },
  { from: '_thoughts', to: 'content/thoughts' },
];

// Fields to remove from front matter
const REMOVE_FIELDS = ['layout', 'protected', 'encrypted', 'encrypted_key', 'key_salt', 'password_hint', 'source', 'salt'];

for (const { from, to } of MAPPINGS) {
  const srcDir = path.join(__dirname, '..', from);
  const destDir = path.join(__dirname, '..', to);

  if (!fs.existsSync(srcDir)) {
    console.log(`Skipping ${from} (not found)`);
    continue;
  }

  fs.mkdirSync(destDir, { recursive: true });

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    let content = fs.readFileSync(path.join(srcDir, file), 'utf-8');

    // Parse front matter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) {
      // No front matter, copy as-is
      fs.writeFileSync(path.join(destDir, file), content);
      console.log(`  ${file} (no front matter, copied as-is)`);
      continue;
    }

    let frontMatter = fmMatch[1];
    const body = fmMatch[2];

    // Remove unwanted fields
    for (const field of REMOVE_FIELDS) {
      frontMatter = frontMatter.replace(new RegExp(`^${field}:.*$\\n?`, 'gm'), '');
    }

    // Clean up empty lines in front matter
    frontMatter = frontMatter.replace(/\n{3,}/g, '\n').trim();

    // Skip encrypted content (body starts with {% raw %})
    if (body.trim().startsWith('{%')) {
      console.log(`  ${file} (SKIPPED - encrypted content)`);
      continue;
    }

    const result = `---\n${frontMatter}\n---\n${body}`;
    fs.writeFileSync(path.join(destDir, file), result);
    console.log(`  ${file}`);
  }

  console.log(`Migrated ${from} → ${to}`);
}
```

- [ ] **Step 2: Run migration**

```bash
node scripts/migrate-content.js
```

- [ ] **Step 3: Verify migrated files**

```bash
ls content/posts/ | wc -l
ls content/notes/ | wc -l
ls content/readings/ | wc -l
ls content/thoughts/ | wc -l
# Spot-check a few front matters
head -8 content/posts/2026-04-14-daily-log.md
head -8 content/notes/2026-04-14-synthetic-data-flywheel.md
```

- [ ] **Step 4: Delete migration script**

```bash
rm scripts/migrate-content.js
```

- [ ] **Step 5: Commit**

```bash
git add content/
git commit -m "feat: migrate content from Jekyll to content/ directories"
```

---

## Task 3: Content Library

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/content.ts`
- Create: `src/lib/markdown.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// src/lib/types.ts
export type ContentType = 'posts' | 'notes' | 'readings' | 'thoughts';

export interface ArticleMeta {
  slug: string;
  type: ContentType;
  title: string;
  date: string;
  tags: string[];
  category?: string;
  excerpt: string;
  filename: string;
}

export interface Article extends ArticleMeta {
  content: string; // rendered HTML
}

export const TYPE_LABELS: Record<ContentType, string> = {
  posts: '文章',
  notes: '笔记',
  readings: '阅读',
  thoughts: '感想',
};

export const ALL_TYPES: ContentType[] = ['posts', 'notes', 'readings', 'thoughts'];
```

- [ ] **Step 2: Create content reader**

```typescript
// src/lib/content.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { renderMarkdown } from './markdown';
import type { ArticleMeta, Article, ContentType } from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content');

function slugFromFilename(filename: string): string {
  // Remove date prefix (YYYY-MM-DD-) and .md suffix
  return filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
}

function excerptFromBody(body: string, maxLen = 200): string {
  // Strip markdown syntax for excerpt
  const plain = body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + '...' : plain;
}

export function getArticlesByType(type: ContentType): ArticleMeta[] {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(filename => {
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data } = matter(raw);
    const slug = slugFromFilename(filename);
    const body = matter(raw).content;

    return {
      slug,
      type,
      title: data.title || slug,
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      category: data.category || undefined,
      excerpt: excerptFromBody(body),
      filename,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function getAllArticles(): ArticleMeta[] {
  const all: ArticleMeta[] = [];
  for (const type of ['posts', 'notes', 'readings', 'thoughts'] as ContentType[]) {
    all.push(...getArticlesByType(type));
  }
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getArticle(type: ContentType, slug: string): Promise<Article | null> {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const filename = files.find(f => slugFromFilename(f) === slug);
  if (!filename) return null;

  const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
  const { data, content: body } = matter(raw);

  const html = await renderMarkdown(body);

  return {
    slug,
    type,
    title: data.title || slug,
    date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    category: data.category || undefined,
    excerpt: excerptFromBody(body),
    filename,
    content: html,
  };
}

export function getSlugs(type: ContentType): string[] {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(slugFromFilename);
}
```

- [ ] **Step 3: Create markdown renderer**

```typescript
// src/lib/markdown.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypePrettyCode from 'rehype-pretty-code';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypePrettyCode, { theme: 'github-dark' })
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(md: string): Promise<string> {
  const result = await processor.process(md);
  return String(result);
}
```

- [ ] **Step 4: Verify by running build**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat: add content library (types, content reader, markdown renderer)"
```

---

## Task 4: Theme System + Root Layout + Header

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create ThemeToggle component**

```typescript
// src/components/layout/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';

const MODES = ['dark', 'light', 'system'] as const;
type ThemeMode = typeof MODES[number];
const ICONS: Record<ThemeMode, string> = { dark: '🌙', light: '☀️', system: '🖥️' };
const LABELS: Record<ThemeMode, string> = { dark: '暗色模式', light: '亮色模式', system: '跟随系统' };

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode((localStorage.getItem('theme') as ThemeMode) || 'system');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'system') {
        document.documentElement.setAttribute('data-theme', resolveTheme('system'));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, mounted]);

  const toggle = () => {
    const idx = MODES.indexOf(mode);
    const next = MODES[(idx + 1) % MODES.length];
    setMode(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', resolveTheme(next));
  };

  if (!mounted) return <button className="text-[var(--text-muted)] text-[15px] p-1.5 cursor-pointer bg-transparent border-none hover:text-[var(--text-primary)] transition-colors">🌙</button>;

  return (
    <button
      onClick={toggle}
      title={LABELS[mode]}
      aria-label={LABELS[mode]}
      className="text-[var(--text-muted)] text-[15px] p-1.5 cursor-pointer bg-transparent border-none hover:text-[var(--text-primary)] transition-colors"
    >
      {ICONS[mode]}
    </button>
  );
}
```

- [ ] **Step 2: Create Header component**

```typescript
// src/components/layout/Header.tsx
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="border-b border-[var(--border)]" style={{ background: 'var(--bg-header)' }}>
      <div className="max-w-[980px] mx-auto px-4 flex items-center justify-between py-4 gap-4">
        <Link href="/" className="no-underline flex flex-col gap-0.5 group">
          <span className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors tracking-tight">
            依人相的月光集市
          </span>
          <span className="text-[13px] text-[var(--text-muted)]">
            只在深夜营业，售卖代码与随想
          </span>
        </Link>
        <nav className="flex items-center">
          <Link href="/bookmark/" className="text-[var(--text-muted)] text-sm font-semibold px-4 py-1.5 no-underline hover:text-[var(--text-primary)] transition-colors">
            书签
          </Link>
          <Link href="/admin/" className="text-[var(--text-muted)] text-sm font-semibold px-4 py-1.5 no-underline hover:text-[var(--text-primary)] transition-colors">
            创作
          </Link>
          <span className="w-px h-4 bg-[var(--border-light)] mx-1" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Update root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '依人相的月光集市',
  description: '只在深夜营业，售卖代码与随想',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var saved = localStorage.getItem('theme') || 'system';
            var theme = saved === 'system'
              ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
              : saved;
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}} />
      </head>
      <body>
        <Header />
        <main className="max-w-[980px] mx-auto px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify**

```bash
pnpm dev
# Check header renders, theme toggle works, dark/light/system cycling
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add header with theme toggle (dark/light/system)"
```

---

## Task 5: Homepage (Tabs + Article List)

**Files:**
- Create: `src/components/article/ArticleCard.tsx`
- Create: `src/components/article/TagList.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create TagList component**

```typescript
// src/components/article/TagList.tsx
export default function TagList({ tags, max = 4 }: { tags: string[]; max?: number }) {
  const shown = tags.slice(0, max);
  const overflow = tags.length - max;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {shown.map(tag => (
        <span key={tag} className="text-[11px] text-[var(--accent)] border border-[var(--accent-border)] bg-[var(--accent-bg)] px-2 py-px rounded-[10px] whitespace-nowrap leading-relaxed">
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[11px] text-[var(--text-dimmed)]">+{overflow}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ArticleCard component**

```typescript
// src/components/article/ArticleCard.tsx
import Link from 'next/link';
import TagList from './TagList';
import type { ArticleMeta } from '@/lib/types';
import { TYPE_LABELS } from '@/lib/types';

export default function ArticleCard({ article, showType = false }: { article: ArticleMeta; showType?: boolean }) {
  const href = `/${article.type}/${article.slug}/`;

  return (
    <Link
      href={href}
      className="block no-underline px-5 py-4 mb-0.5 rounded-[10px] border-l-[3px] border-l-transparent transition-colors hover:bg-[var(--accent-bg)] hover:border-l-[var(--accent)]"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-[var(--text-dimmed)] tabular-nums">{article.date}</span>
        {showType && (
          <span className="text-[11px] text-[var(--accent)] bg-[var(--accent-bg)] px-2 py-px rounded-lg font-medium">
            {TYPE_LABELS[article.type]}
          </span>
        )}
      </div>
      <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1 leading-snug hover:text-[var(--accent)]">
        {article.type === 'posts' ? article.title.replace(/^日志\s*[-–]\s*/, '') : article.title}
      </div>
      {article.excerpt && (
        <div className="text-[13px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
          {article.excerpt}
        </div>
      )}
      {article.tags.length > 0 && <TagList tags={article.tags} />}
    </Link>
  );
}
```

- [ ] **Step 3: Build homepage**

```typescript
// src/app/page.tsx
import { getArticlesByType } from '@/lib/content';
import type { ContentType, ArticleMeta } from '@/lib/types';
import HomeClient from './HomeClient';

export default function Home() {
  const posts = getArticlesByType('posts');
  const notes = getArticlesByType('notes');
  const readings = getArticlesByType('readings');
  const thoughts = getArticlesByType('thoughts');

  // Group notes and readings by category
  const notesGrouped = groupByCategory(notes);
  const readingsGrouped = groupByCategory(readings);

  return (
    <HomeClient
      posts={posts}
      notesGrouped={notesGrouped}
      readingsGrouped={readingsGrouped}
      thoughts={thoughts}
      allArticles={[...posts, ...notes, ...readings, ...thoughts]}
    />
  );
}

function groupByCategory(items: ArticleMeta[]): Record<string, ArticleMeta[]> {
  const groups: Record<string, ArticleMeta[]> = {};
  for (const item of items) {
    const cat = item.category || '未分类';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}
```

- [ ] **Step 4: Create HomeClient (client component with tabs and search)**

```typescript
// src/app/HomeClient.tsx
'use client';

import { useState, useMemo } from 'react';
import ArticleCard from '@/components/article/ArticleCard';
import type { ArticleMeta, ContentType } from '@/lib/types';

const TABS: { key: ContentType | 'all'; label: string }[] = [
  { key: 'posts', label: '文章' },
  { key: 'notes', label: '笔记' },
  { key: 'readings', label: '阅读' },
  { key: 'thoughts', label: '感想' },
];

interface Props {
  posts: ArticleMeta[];
  notesGrouped: Record<string, ArticleMeta[]>;
  readingsGrouped: Record<string, ArticleMeta[]>;
  thoughts: ArticleMeta[];
  allArticles: ArticleMeta[];
}

export default function HomeClient({ posts, notesGrouped, readingsGrouped, thoughts, allArticles }: Props) {
  const [activeTab, setActiveTab] = useState<ContentType>('posts');
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [query, allArticles]);

  return (
    <section>
      <nav className="flex items-center py-5 gap-1">
        <div className="flex gap-0 overflow-x-auto flex-shrink min-w-0" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as ContentType); setQuery(''); }}
              className={`bg-transparent border-none border-b-2 px-3.5 py-1.5 text-sm font-semibold cursor-pointer transition-all whitespace-nowrap ${
                activeTab === tab.key && !query
                  ? 'text-[var(--accent)] border-b-[var(--accent)]'
                  : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex-shrink-0">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索..."
            className="bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-[13px] rounded-lg w-[140px] focus:w-[200px] focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-dimmed)]"
          />
        </div>
      </nav>

      {/* Search results */}
      {searchResults !== null && (
        <div>
          {searchResults.length === 0 ? (
            <p className="text-[var(--text-dimmed)] italic py-5">未找到匹配内容</p>
          ) : (
            searchResults.map(a => <ArticleCard key={`${a.type}/${a.slug}`} article={a} showType />)
          )}
        </div>
      )}

      {/* Tab content */}
      {searchResults === null && (
        <>
          {activeTab === 'posts' && (
            <div>{posts.map(a => <ArticleCard key={a.slug} article={a} />)}</div>
          )}

          {activeTab === 'notes' && (
            <div>
              {Object.keys(notesGrouped).length === 0 && <p className="text-[var(--text-dimmed)] italic py-5">暂无笔记</p>}
              {Object.entries(notesGrouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-[var(--text-muted)] text-sm mt-7 mb-2 font-semibold uppercase tracking-wider">{cat}</h3>
                  {items.map(a => <ArticleCard key={a.slug} article={a} />)}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'readings' && (
            <div>
              {Object.keys(readingsGrouped).length === 0 && <p className="text-[var(--text-dimmed)] italic py-5">暂无阅读笔记</p>}
              {Object.entries(readingsGrouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-[var(--text-muted)] text-sm mt-7 mb-2 font-semibold uppercase tracking-wider">{cat}</h3>
                  {items.map(a => <ArticleCard key={a.slug} article={a} />)}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'thoughts' && (
            <div>
              {thoughts.length === 0 && <p className="text-[var(--text-dimmed)] italic py-5">暂无生活感想</p>}
              {thoughts.map(a => <ArticleCard key={a.slug} article={a} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Verify homepage**

```bash
pnpm dev
# Verify: 4 tabs work, articles display correctly, search filters
```

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/HomeClient.tsx src/components/article/
git commit -m "feat: add homepage with tabs, article cards, and search"
```

---

## Task 6: Article Detail Pages

**Files:**
- Create: `src/app/posts/[slug]/page.tsx`
- Create: `src/app/notes/[slug]/page.tsx`
- Create: `src/app/readings/[slug]/page.tsx`
- Create: `src/app/thoughts/[slug]/page.tsx`
- Create: `src/components/article/ArticleContent.tsx`

- [ ] **Step 1: Create ArticleContent component**

```typescript
// src/components/article/ArticleContent.tsx
import Link from 'next/link';
import TagList from './TagList';
import type { Article } from '@/lib/types';

export default function ArticleContent({ article }: { article: Article }) {
  const editUrl = `/admin/edit/${article.type}/${article.filename}`;
  const displayTitle = article.type === 'posts'
    ? article.title.replace(/^日志\s*[-–]\s*/, '')
    : article.title;

  return (
    <article>
      <div className="flex items-center gap-3 pt-3">
        <Link href="/" className="text-[var(--accent)] text-[13px] no-underline hover:text-[var(--accent-hover)] transition-colors">
          ← 返回首页
        </Link>
        <span className="text-[13px] text-[var(--text-dimmed)] tabular-nums">{article.date}</span>
      </div>

      <div className="prose mt-4">
        <h1 className="!mt-2">{displayTitle}</h1>
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>

      {article.tags.length > 0 && (
        <div className="mt-8 pt-4 border-t border-[var(--border)]">
          <TagList tags={article.tags} max={99} />
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href={editUrl}
          className="text-[13px] text-[var(--text-muted)] no-underline hover:text-[var(--accent)] transition-colors"
        >
          ✏️ 编辑
        </Link>
        <Link
          href="/admin/"
          className="text-[13px] text-[var(--text-muted)] no-underline hover:text-[var(--accent)] transition-colors"
        >
          🗑️ 删除
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Create shared page generator function**

```typescript
// src/app/posts/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getArticle, getSlugs } from '@/lib/content';
import ArticleContent from '@/components/article/ArticleContent';

export async function generateStaticParams() {
  return getSlugs('posts').map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('posts', slug);
  if (!article) return { title: 'Not Found' };
  return { title: `${article.title} | 依人相的月光集市` };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('posts', slug);
  if (!article) notFound();
  return <ArticleContent article={article} />;
}
```

- [ ] **Step 3: Create notes page**

```typescript
// src/app/notes/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getArticle, getSlugs } from '@/lib/content';
import ArticleContent from '@/components/article/ArticleContent';

export async function generateStaticParams() {
  return getSlugs('notes').map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('notes', slug);
  if (!article) return { title: 'Not Found' };
  return { title: `${article.title} | 依人相的月光集市` };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('notes', slug);
  if (!article) notFound();
  return <ArticleContent article={article} />;
}
```

- [ ] **Step 4: Create readings page**

```typescript
// src/app/readings/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getArticle, getSlugs } from '@/lib/content';
import ArticleContent from '@/components/article/ArticleContent';

export async function generateStaticParams() {
  return getSlugs('readings').map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('readings', slug);
  if (!article) return { title: 'Not Found' };
  return { title: `${article.title} | 依人相的月光集市` };
}

export default async function ReadingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('readings', slug);
  if (!article) notFound();
  return <ArticleContent article={article} />;
}
```

- [ ] **Step 5: Create thoughts page**

```typescript
// src/app/thoughts/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getArticle, getSlugs } from '@/lib/content';
import ArticleContent from '@/components/article/ArticleContent';

export async function generateStaticParams() {
  return getSlugs('thoughts').map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('thoughts', slug);
  if (!article) return { title: 'Not Found' };
  return { title: `${article.title} | 依人相的月光集市` };
}

export default async function ThoughtPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle('thoughts', slug);
  if (!article) notFound();
  return <ArticleContent article={article} />;
}
```

- [ ] **Step 6: Verify**

```bash
pnpm dev
# Click an article from homepage, verify it renders correctly
# Test all 4 content types
```

- [ ] **Step 7: Commit**

```bash
git add src/app/posts/ src/app/notes/ src/app/readings/ src/app/thoughts/ src/components/article/ArticleContent.tsx
git commit -m "feat: add article detail pages for all 4 content types"
```

---

## Task 7: Admin Layout + GitHub API + Settings

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/lib/github-api.ts`
- Create: `src/components/admin/AdminSidebar.tsx`
- Create: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Create GitHub API client**

```typescript
// src/lib/github-api.ts
export interface FileEntry {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
}

export interface FileContent {
  content: string;
  sha: string;
}

export class GitHubClient {
  private token: string;
  private repo: string;
  private branch: string;
  private baseUrl: string;

  constructor(token: string, repo: string, branch = 'master') {
    this.token = token;
    this.repo = repo;
    this.branch = branch;
    this.baseUrl = `https://api.github.com/repos/${repo}`;
  }

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error: ${res.status}`);
    }
    return res.json();
  }

  async testConnection(): Promise<{ login: string }> {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error('Token 无效');
    return res.json();
  }

  async listFiles(dir: string): Promise<FileEntry[]> {
    const data = await this.request(`/contents/${dir}?ref=${this.branch}`);
    return Array.isArray(data) ? data.filter((f: FileEntry) => f.type === 'file') : [];
  }

  async getFile(path: string): Promise<FileContent> {
    const data = await this.request(`/contents/${path}?ref=${this.branch}`);
    const content = atob(data.content.replace(/\n/g, ''));
    return { content: decodeURIComponent(escape(content)), sha: data.sha };
  }

  async saveFile(path: string, content: string, sha: string | null, message: string): Promise<void> {
    const body: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: this.branch,
    };
    if (sha) body.sha = sha;
    await this.request(`/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  async deleteFile(path: string, sha: string, message: string): Promise<void> {
    await this.request(`/contents/${path}`, {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch: this.branch }),
    });
  }
}

// Settings helpers
export function getGitHubSettings() {
  if (typeof window === 'undefined') return { token: '', repo: '', branch: 'master' };
  return {
    token: localStorage.getItem('gh-token') || '',
    repo: localStorage.getItem('gh-repo') || 'xiaoxiaoyi12/xiaoxiaoyi12.github.io',
    branch: localStorage.getItem('gh-branch') || 'master',
  };
}

export function saveGitHubSettings(token: string, repo: string, branch: string) {
  localStorage.setItem('gh-token', token);
  localStorage.setItem('gh-repo', repo);
  localStorage.setItem('gh-branch', branch);
}

export function createClient(): GitHubClient | null {
  const { token, repo, branch } = getGitHubSettings();
  if (!token) return null;
  return new GitHubClient(token, repo, branch);
}
```

- [ ] **Step 2: Create AdminSidebar**

```typescript
// src/components/admin/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/', label: '文章列表', icon: '📄' },
  { href: '/admin/new/', label: '新建文章', icon: '✏️' },
  { href: '/admin/settings/', label: '设置', icon: '⚙️' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 border-r border-[var(--border)] min-h-[calc(100vh-65px)] p-4 hidden md:block">
      <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-4 uppercase tracking-wider">管理后台</h2>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname === item.href.slice(0, -1);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline transition-colors ${
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
    </aside>
  );
}
```

- [ ] **Step 3: Create admin layout**

```typescript
// src/app/admin/layout.tsx
'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex -mx-4 -mt-0">
      <AdminSidebar />
      <div className="flex-1 p-6 min-w-0">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create settings page**

```typescript
// src/app/admin/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getGitHubSettings, saveGitHubSettings, GitHubClient } from '@/lib/github-api';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [testStatus, setTestStatus] = useState('');

  useEffect(() => {
    const s = getGitHubSettings();
    setToken(s.token);
    setRepo(s.repo);
    setBranch(s.branch);
  }, []);

  const save = () => {
    saveGitHubSettings(token, repo, branch);
    setTestStatus('已保存');
    setTimeout(() => setTestStatus(''), 2000);
  };

  const test = async () => {
    setTestStatus('测试中...');
    try {
      const client = new GitHubClient(token, repo, branch);
      const user = await client.testConnection();
      setTestStatus(`✅ 已连接: ${user.login}`);
    } catch (e) {
      setTestStatus(`❌ ${e instanceof Error ? e.message : '连接失败'}`);
    }
  };

  const inputClass = "w-full bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-2 text-sm rounded-lg focus:outline-none focus:border-[var(--accent)] transition-colors";
  const labelClass = "block text-sm font-medium text-[var(--text-secondary)] mb-1.5";
  const btnClass = "px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors";

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">设置</h1>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>GitHub Personal Access Token</label>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} className={inputClass} placeholder="ghp_..." />
        </div>
        <div>
          <label className={labelClass}>仓库（owner/repo）</label>
          <input type="text" value={repo} onChange={e => setRepo(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>分支</label>
          <input type="text" value={branch} onChange={e => setBranch(e.target.value)} className={inputClass} />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={save} className={`${btnClass} bg-[var(--accent)] text-white border-none hover:opacity-85`}>
            保存
          </button>
          <button onClick={test} className={`${btnClass} bg-transparent text-[var(--accent)] border border-[var(--accent-border)] hover:bg-[var(--accent-bg)]`}>
            测试连接
          </button>
        </div>

        {testStatus && (
          <p className="text-sm text-[var(--text-muted)] mt-2">{testStatus}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
pnpm dev
# Navigate to /admin/settings, verify form renders, save/test works
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/github-api.ts src/components/admin/ src/app/admin/
git commit -m "feat: add admin layout, sidebar, GitHub API client, settings page"
```

---

## Task 8: Admin Article List + Delete

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create admin article list page**

```typescript
// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, getGitHubSettings } from '@/lib/github-api';
import { TYPE_LABELS, ALL_TYPES } from '@/lib/types';
import type { ContentType } from '@/lib/types';

interface ArticleEntry {
  name: string;
  path: string;
  sha: string;
  type: ContentType;
  title: string;
  date: string;
  tags: string[];
}

function parseFrontMatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val: unknown = line.slice(colonIdx + 1).trim();
    // Parse simple arrays like [tag1, tag2]
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    // Remove quotes
    if (typeof val === 'string') val = val.replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return fm;
}

export default function AdminListPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    const client = createClient();
    if (!client) {
      setError('请先在设置中配置 GitHub Token');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const all: ArticleEntry[] = [];
      for (const type of ALL_TYPES) {
        try {
          const files = await client.listFiles(`content/${type}`);
          for (const f of files) {
            if (!f.name.endsWith('.md')) continue;
            try {
              const file = await client.getFile(f.path);
              const fm = parseFrontMatter(file.content);
              all.push({
                name: f.name,
                path: f.path,
                sha: f.sha,
                type,
                title: (fm.title as string) || f.name,
                date: (fm.date as string) || '',
                tags: Array.isArray(fm.tags) ? fm.tags as string[] : [],
              });
            } catch {
              all.push({ name: f.name, path: f.path, sha: f.sha, type, title: f.name, date: '', tags: [] });
            }
          }
        } catch {
          // Directory might not exist
        }
      }
      all.sort((a, b) => b.date.localeCompare(a.date));
      setArticles(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = articles;
    if (filterType !== 'all') list = list.filter(a => a.type === filterType);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [articles, filterType, query]);

  async function deleteArticle(article: ArticleEntry) {
    if (!confirm(`确定删除 ${article.title}?\n文件: ${article.path}`)) return;
    const client = createClient();
    if (!client) return;
    try {
      // Get fresh sha
      const file = await client.getFile(article.path);
      await client.deleteFile(article.path, file.sha, `Delete ${article.name}`);
      setArticles(prev => prev.filter(a => a.path !== article.path));
    } catch (e) {
      alert('删除失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
  }

  if (loading) return <div className="text-[var(--text-muted)] py-10">加载中...</div>;
  if (error) return (
    <div className="py-10">
      <p className="text-[var(--text-muted)] mb-4">{error}</p>
      <button onClick={() => router.push('/admin/settings/')} className="text-[var(--accent)] underline cursor-pointer bg-transparent border-none text-sm">
        前往设置
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">文章列表</h1>
        <button
          onClick={() => router.push('/admin/new/')}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white border-none cursor-pointer hover:opacity-85 transition-opacity"
        >
          + 新建文章
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as ContentType | 'all')}
          className="bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-sm rounded-lg"
        >
          <option value="all">全部</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索..."
          className="bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-sm rounded-lg flex-1 max-w-xs focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-dimmed)]"
        />
        <button onClick={loadArticles} className="text-[var(--text-muted)] text-sm bg-transparent border-none cursor-pointer hover:text-[var(--text-primary)]">
          🔄 刷新
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--text-dimmed)] italic py-5">无文章</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">日期</th>
              <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">类型</th>
              <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">标题</th>
              <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.path} className="border-b border-[var(--border)] hover:bg-[var(--accent-bg)] transition-colors">
                <td className="py-2.5 px-3 text-[var(--text-dimmed)] tabular-nums whitespace-nowrap">{a.date}</td>
                <td className="py-2.5 px-3 text-[var(--text-muted)]">{TYPE_LABELS[a.type]}</td>
                <td className="py-2.5 px-3">
                  <button
                    onClick={() => router.push(`/admin/edit/${a.type}/${a.name}`)}
                    className="text-[var(--text-primary)] bg-transparent border-none cursor-pointer text-sm text-left hover:text-[var(--accent)] transition-colors"
                  >
                    {a.title}
                  </button>
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => router.push(`/admin/edit/${a.type}/${a.name}`)}
                    className="text-[var(--text-muted)] bg-transparent border-none cursor-pointer text-sm hover:text-[var(--accent)] mr-2"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteArticle(a)}
                    className="text-[var(--text-muted)] bg-transparent border-none cursor-pointer text-sm hover:text-red-500"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm dev
# Navigate to /admin, verify article list loads, filter/search works, delete works
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add admin article list with filter, search, and delete"
```

---

## Task 9: Admin Editor (New + Edit)

**Files:**
- Create: `src/app/admin/new/page.tsx`
- Create: `src/app/admin/edit/[type]/[filename]/page.tsx`
- Create: `src/components/admin/MarkdownEditor.tsx`
- Create: `src/components/admin/FrontMatterForm.tsx`

- [ ] **Step 1: Create FrontMatterForm component**

```typescript
// src/components/admin/FrontMatterForm.tsx
'use client';

import { ALL_TYPES, TYPE_LABELS } from '@/lib/types';
import type { ContentType } from '@/lib/types';

interface Props {
  type: ContentType;
  title: string;
  date: string;
  slug: string;
  category: string;
  tags: string[];
  onTypeChange: (t: ContentType) => void;
  onTitleChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onSlugChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

export default function FrontMatterForm(props: Props) {
  const showCategory = props.type === 'notes' || props.type === 'readings';
  const inputClass = "w-full bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:border-[var(--accent)] transition-colors";
  const labelClass = "block text-xs font-medium text-[var(--text-muted)] mb-1";

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const val = input.value.trim().replace(/,$/, '');
      if (val && !props.tags.includes(val)) {
        props.onTagsChange([...props.tags, val]);
      }
      input.value = '';
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
      <div>
        <label className={labelClass}>类型</label>
        <select value={props.type} onChange={e => props.onTypeChange(e.target.value as ContentType)} disabled={props.disabled} className={inputClass}>
          {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>日期</label>
        <input type="date" value={props.date} onChange={e => props.onDateChange(e.target.value)} className={inputClass} />
      </div>
      <div className="col-span-2">
        <label className={labelClass}>标题</label>
        <input type="text" value={props.title} onChange={e => props.onTitleChange(e.target.value)} placeholder="文章标题" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Slug（URL 路径）</label>
        <input type="text" value={props.slug} onChange={e => props.onSlugChange(e.target.value)} placeholder="url-slug" className={inputClass} />
      </div>
      {showCategory && (
        <div>
          <label className={labelClass}>分类</label>
          <input type="text" value={props.category} onChange={e => props.onCategoryChange(e.target.value)} placeholder="分类名" className={inputClass} />
        </div>
      )}
      <div className="col-span-2">
        <label className={labelClass}>标签（回车添加）</label>
        <input type="text" onKeyDown={handleTagKeyDown} placeholder="输入标签后按回车" className={inputClass} />
        {props.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {props.tags.map((tag, i) => (
              <span key={tag} className="text-[11px] text-[var(--accent)] border border-[var(--accent-border)] bg-[var(--accent-bg)] px-2 py-px rounded-[10px] inline-flex items-center gap-1">
                {tag}
                <button onClick={() => props.onTagsChange(props.tags.filter((_, j) => j !== i))} className="bg-transparent border-none text-[var(--text-muted)] cursor-pointer text-xs leading-none hover:text-[var(--accent)]">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create MarkdownEditor component**

```typescript
// src/components/admin/MarkdownEditor.tsx
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
```

- [ ] **Step 3: Create new article page**

```typescript
// src/app/admin/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FrontMatterForm from '@/components/admin/FrontMatterForm';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import { createClient } from '@/lib/github-api';
import type { ContentType } from '@/lib/types';

function buildFrontMatter(meta: { title: string; date: string; tags: string[]; category?: string }) {
  const lines = ['---'];
  lines.push(`title: "${meta.title}"`);
  lines.push(`date: ${meta.date}`);
  if (meta.category) lines.push(`category: "${meta.category}"`);
  lines.push(`tags: [${meta.tags.join(', ')}]`);
  lines.push('---');
  return lines.join('\n');
}

export default function NewArticlePage() {
  const router = useRouter();
  const [type, setType] = useState<ContentType>('thoughts');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [publishing, setPublishing] = useState(false);

  const publish = async () => {
    if (!title) { alert('请输入标题'); return; }
    if (!slug) { alert('请输入 slug'); return; }
    const client = createClient();
    if (!client) { alert('请先配置 GitHub Token'); return; }

    setPublishing(true);
    try {
      const filename = `${date}-${slug}.md`;
      const path = `content/${type}/${filename}`;
      const fm = buildFrontMatter({ title, date, tags, category: (type === 'notes' || type === 'readings') ? category : undefined });
      const content = `${fm}\n\n${body}`;
      await client.saveFile(path, content, null, `Add ${filename}`);
      alert('已提交，约 2 分钟后生效');
      router.push('/admin/');
    } catch (e) {
      alert('发布失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setPublishing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">新建文章</h1>
        <button
          onClick={publish}
          disabled={publishing}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white border-none cursor-pointer hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {publishing ? '发布中...' : '发布'}
        </button>
      </div>

      <FrontMatterForm
        type={type} title={title} date={date} slug={slug} category={category} tags={tags}
        onTypeChange={setType} onTitleChange={setTitle} onDateChange={setDate}
        onSlugChange={setSlug} onCategoryChange={setCategory} onTagsChange={setTags}
      />

      <MarkdownEditor value={body} onChange={setBody} />
    </div>
  );
}
```

- [ ] **Step 4: Create edit article page**

```typescript
// src/app/admin/edit/[type]/[filename]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import FrontMatterForm from '@/components/admin/FrontMatterForm';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import { createClient } from '@/lib/github-api';
import type { ContentType } from '@/lib/types';

function parseFrontMatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { fm: {} as Record<string, unknown>, body: content };
  const fm: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val: unknown = line.slice(colonIdx + 1).trim();
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    if (typeof val === 'string') val = val.replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return { fm, body: match[2] };
}

function buildFrontMatter(meta: { title: string; date: string; tags: string[]; category?: string }) {
  const lines = ['---'];
  lines.push(`title: "${meta.title}"`);
  lines.push(`date: ${meta.date}`);
  if (meta.category) lines.push(`category: "${meta.category}"`);
  lines.push(`tags: [${meta.tags.join(', ')}]`);
  lines.push('---');
  return lines.join('\n');
}

export default function EditArticlePage({ params }: { params: Promise<{ type: string; filename: string }> }) {
  const { type: rawType, filename } = use(params);
  const type = rawType as ContentType;
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadArticle();
  }, [type, filename]);

  async function loadArticle() {
    const client = createClient();
    if (!client) { setLoading(false); return; }
    try {
      const file = await client.getFile(`content/${type}/${filename}`);
      setSha(file.sha);
      const { fm, body: articleBody } = parseFrontMatter(file.content);
      setTitle((fm.title as string) || '');
      setDate((fm.date as string) || '');
      setCategory((fm.category as string) || '');
      setTags(Array.isArray(fm.tags) ? fm.tags as string[] : []);
      setSlug(filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''));
      setBody(articleBody);
    } catch (e) {
      alert('加载失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setLoading(false);
  }

  const publish = async () => {
    if (!title) { alert('请输入标题'); return; }
    const client = createClient();
    if (!client) { alert('请先配置 GitHub Token'); return; }

    setPublishing(true);
    try {
      const path = `content/${type}/${filename}`;
      const fm = buildFrontMatter({ title, date, tags, category: (type === 'notes' || type === 'readings') ? category : undefined });
      const content = `${fm}\n\n${body}`;
      await client.saveFile(path, content, sha, `Update ${filename}`);
      alert('已提交，约 2 分钟后生效');
      router.push('/admin/');
    } catch (e) {
      alert('发布失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setPublishing(false);
  };

  if (loading) return <div className="text-[var(--text-muted)] py-10">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">编辑: {title || filename}</h1>
        <button
          onClick={publish}
          disabled={publishing}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white border-none cursor-pointer hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {publishing ? '保存中...' : '保存'}
        </button>
      </div>

      <FrontMatterForm
        type={type} title={title} date={date} slug={slug} category={category} tags={tags}
        onTypeChange={() => {}} onTitleChange={setTitle} onDateChange={setDate}
        onSlugChange={setSlug} onCategoryChange={setCategory} onTagsChange={setTags}
        disabled
      />

      <MarkdownEditor value={body} onChange={setBody} />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
pnpm dev
# Test: create new article, edit existing article, markdown preview
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/new/ src/app/admin/edit/ src/components/admin/MarkdownEditor.tsx src/components/admin/FrontMatterForm.tsx
git commit -m "feat: add admin markdown editor with new/edit article pages"
```

---

## Task 10: GitHub Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deployment workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      # Copy bookmark build artifacts into output
      - run: |
          if [ -d "bookmark" ]; then
            cp -r bookmark out/bookmark
          fi
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions deployment workflow"
```

---

## Task 11: Clean Up Jekyll Files

**Files:**
- Delete: `_config.yml`, `_layouts/`, `_includes/`, `assets/`, `admin/index.html`, `scripts/`, `index.md` (if exists), `Gemfile` (if exists)

- [ ] **Step 1: Remove Jekyll files**

```bash
rm -f _config.yml index.md Gemfile Gemfile.lock
rm -rf _layouts _includes assets admin scripts
```

- [ ] **Step 2: Update CLAUDE.md**

Update the project description and directory structure in CLAUDE.md to reflect the new Next.js architecture.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Jekyll files, migration to Next.js complete"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Full build test**

```bash
pnpm build
```

Expected: Build succeeds, `out/` directory contains all static pages.

- [ ] **Step 2: Verify output structure**

```bash
ls out/
ls out/posts/
ls out/notes/
ls out/admin/
```

- [ ] **Step 3: Serve and test locally**

```bash
npx serve out
# Open http://localhost:3000
# Test: homepage tabs, article detail pages, admin settings, admin list, admin editor
```

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat: V1 complete — Next.js blog with admin CRUD"
```
