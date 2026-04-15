# 博客系统 Next.js 重构设计文档

## 1. 项目背景

### 现状
- Jekyll + hacker theme 个人博客，托管在 GitHub Pages
- 4 种内容类型：日志(_posts)、笔记(_notes)、阅读(_readings)、感想(_thoughts)，共 39 篇
- 单文件 admin 后台（admin/index.html，2200 行），支持 GitHub API / 本地服务两种存储模式
- Bookmark Reader 独立仓库，构建后部署到 `/bookmark/` 子路径
- 无 CI/CD，依赖 GitHub Pages 默认 Jekyll 构建

### 重构动机
以学习全栈开发为目标，将博客从 Jekyll 迁移到 Next.js + React + TypeScript 技术栈。

### 不做的事
- 加密功能（暂不实现）
- 评论系统
- Bookmark Reader 集成（保持独立仓库）

## 2. 技术选型

| 层面 | 选型 | 理由 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | SSG 静态导出，SEO 友好，React 全栈 |
| 语言 | TypeScript 5 | 类型安全 |
| 样式 | Tailwind CSS 4 | 与 Bookmark 项目保持一致，高效开发 |
| MD 渲染 | unified (remark + rehype) | 生态成熟，插件丰富，支持 GFM、代码高亮 |
| 代码高亮 | rehype-pretty-code (shiki) | 构建时高亮，零运行时开销 |
| 富文本编辑器 | Tiptap + tiptap-markdown | 所见即所得，保存时转 Markdown，Bookmark 项目已有经验 |
| 搜索 | Fuse.js | 轻量客户端模糊搜索，支持中文 |
| 包管理 | pnpm | 快速、节省磁盘 |
| 部署 | GitHub Actions + GitHub Pages | 自动构建部署 |

## 3. 目录结构

```
xiaoxiaoyi12.github.io/
├── content/                    # Markdown 内容（从 Jekyll 迁移）
│   ├── posts/                  # 日志
│   ├── notes/                  # 笔记
│   ├── readings/               # 阅读
│   └── thoughts/               # 感想
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局（header、theme toggle）
│   │   ├── page.tsx            # 首页（文章列表 + 搜索 + 分类 Tab）
│   │   ├── posts/[slug]/page.tsx
│   │   ├── notes/[slug]/page.tsx
│   │   ├── readings/[slug]/page.tsx
│   │   ├── thoughts/[slug]/page.tsx
│   │   └── admin/              # 管理后台（客户端渲染）
│   │       ├── layout.tsx      # admin 布局（侧边导航）
│   │       ├── page.tsx        # 写作仪表盘（统计 + 热力图 + 草稿）
│   │       ├── articles/page.tsx  # 文章列表
│   │       ├── new/page.tsx    # 新建文章（Tiptap 编辑器）
│   │       ├── edit/[type]/[filename]/page.tsx  # 编辑文章
│   │       └── settings/page.tsx  # 设置
│   ├── components/
│   │   ├── ui/                 # 通用 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Tag.tsx
│   │   ├── layout/             # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── Footer.tsx
│   │   ├── article/            # 文章相关组件
│   │   │   ├── ArticleCard.tsx
│   │   │   ├── ArticleList.tsx
│   │   │   ├── ArticleContent.tsx
│   │   │   └── TagList.tsx
│   │   ├── search/
│   │   │   └── SearchBar.tsx
│   │   └── admin/              # 管理后台组件
│   │       ├── AdminSidebar.tsx
│   │       ├── TiptapEditor.tsx    # Tiptap 编辑器（含工具栏、斜杠命令）
│   │       ├── FrontMatterForm.tsx
│   │       ├── ArticleTable.tsx
│   │       ├── Dashboard.tsx       # 仪表盘（统计卡片 + 最近编辑）
│   │       ├── WritingCalendar.tsx  # 写作日历热力图
│   │       └── DraftList.tsx       # 草稿列表
│   ├── lib/
│   │   ├── content.ts          # 构建时读取 MD 文件、解析 front matter
│   │   ├── markdown.ts         # unified 处理管线配置
│   │   ├── search-index.ts     # 构建时生成搜索索引
│   │   ├── github-api.ts       # GitHub API 封装（admin 用）
│   │   └── types.ts            # 类型定义
│   └── styles/
│       └── globals.css         # Tailwind 入口 + CSS 变量（主题色）
├── public/
│   ├── search-index.json       # 构建时生成的搜索索引
│   └── images/                 # 文章图片（按年/月分目录）
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions 构建部署
```

## 4. 前台设计

### 4.1 首页（/）

沿用现有的 Tab 切换设计，4 个 Tab 对应 4 种内容类型：

- **文章 Tab**：按日期倒序，显示标题、日期、标签
- **笔记 Tab**：按 category 分组，组内按日期倒序
- **阅读 Tab**：按 category 分组，组内按日期倒序
- **感想 Tab**：按日期倒序

顶部搜索栏使用 Fuse.js 对标题和标签做模糊搜索，结果实时过滤。

### 4.2 文章详情页（/posts/[slug]、/notes/[slug] 等）

- 顶部：返回首页按钮 + 日期
- 正文：MD 渲染内容，支持 GFM 表格、代码块高亮、图片
- 底部：标签列表 + 操作按钮（编辑、删除）
- 编辑按钮跳转到 `/admin/edit/[type]/[filename]`
- 删除按钮跳转到 `/admin`，在 admin 中完成删除操作（避免前台页面需要 GitHub Token）
- 右下角固定浮动「写」按钮（所有前台页面可见），点击跳转 `/admin/new`，默认类型为「感想」

**slug 规则**：文件名去掉日期前缀和 `.md` 后缀。例如 `2026-04-14-hello-world.md` → slug 为 `hello-world`，路由为 `/posts/hello-world/`。构建时通过 `generateStaticParams` 生成所有 slug。

### 4.3 发布即可见（本地缓存预览）

静态站点的固有问题：线上编辑 → commit → Actions 构建 → 部署，链路约 2-3 分钟。为消除这个等待感，采用**客户端缓存预览**策略：

1. 用户点击发布，文章通过 GitHub API commit 成功
2. 同时将文章内容（front matter + 渲染后 HTML）写入 `localStorage`，key 格式：`preview:{type}:{slug}`
3. 发布后立刻跳转到文章详情页
4. 文章详情页渲染逻辑：
   - 静态页面（SSG 构建产物）正常渲染
   - 如果是新文章（SSG 中不存在），客户端检查 `localStorage` 中的 preview 缓存，有则渲染缓存内容，并显示提示条：「此内容来自本地预览，正式版本将在几分钟后生效」
   - 如果是编辑已有文章，同样优先展示缓存内容（比 SSG 版本更新）
5. Actions 构建完成、静态页面更新后，缓存自动过期（下次访问检测到 SSG 内容已更新时清除缓存）

**缓存生命周期**：写入后 10 分钟自动过期，避免长期展示过时预览。

```typescript
interface PreviewCache {
  slug: string;
  type: string;
  title: string;
  html: string;           // Tiptap 内容转 HTML
  frontMatter: Record<string, unknown>;
  createdAt: number;       // timestamp
  expiresAt: number;       // createdAt + 10min
}
```

### 4.4 搜索

构建时生成 `search-index.json`：

```typescript
interface SearchItem {
  slug: string;
  type: 'posts' | 'notes' | 'readings' | 'thoughts';
  title: string;
  date: string;
  tags: string[];
  category?: string;
  excerpt: string; // 前 200 字
}
```

前端使用 Fuse.js 配置：

```typescript
const fuse = new Fuse(searchIndex, {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'tags', weight: 0.3 },
    { name: 'excerpt', weight: 0.2 },
    { name: 'category', weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
});
```

### 4.4 主题系统

保留现有的 dark / light / system 三模式切换，用 CSS 变量 + Tailwind `dark:` 前缀实现：

- Dark 主色调：`#7eb8ff`（蓝色），背景 `#0d1117`
- Light 主色调：`#6b8f45`（绿色），背景 `#faf8f4`

ThemeToggle 组件在 Header 中，使用 `localStorage` 持久化，通过 `<html data-theme>` 属性切换。

## 5. 后台设计（/admin）

### 5.1 整体结构

Admin 页面全部标记为 `'use client'`，纯客户端渲染。静态导出时生成空壳 HTML，所有内容在浏览器端通过 GitHub API 动态加载。

访问 admin 页面时，如果 `localStorage` 中没有 GitHub Token，自动跳转到设置页引导配置。

布局：左侧固定侧边栏导航 + 右侧内容区。移动端侧边栏折叠为顶部汉堡菜单。

### 5.2 写作仪表盘（/admin）

Admin 首页不再是文章列表，而是一个写作仪表盘：

- **写作日历热力图**：类似 GitHub contribution graph，按日期显示写作活跃度（颜色深浅 = 当日字数）
- **统计卡片**：本月文章数、总文章数、总字数
- **最近编辑**：最近 5 篇编辑过的文章，可快速点击继续编辑
- **草稿列表**：未发布的草稿（见 5.8 节）

数据来源：通过 GitHub API 读取 `content/` 下各子目录的文件列表，解析 front matter 提取元数据，字数统计在加载时计算并缓存到 `localStorage`。

### 5.3 文章列表页（/admin/articles）

- 类型筛选 Tab（全部 / 日志 / 笔记 / 阅读 / 感想）
- 搜索框（标题 + 标签模糊搜索）
- 表格列：日期、类型、标题、标签、操作（编辑 / 删除）

### 5.4 新建文章（/admin/new）

- 顶部元信息栏（可折叠）：类型选择、标题、日期、slug、分类（笔记/阅读）、标签
- Tiptap 所见即所得编辑器（全屏沉浸式）
  - 支持：标题、加粗、斜体、列表、代码块、链接、图片、引用、分割线、任务列表
  - 斜杠命令（`/`）快速插入块类型
  - Markdown 快捷输入（输入 `## ` 自动变标题、`- ` 变列表等）
  - 保存时通过 `tiptap-markdown` 扩展序列化为 Markdown
- 发布按钮：拼接 front matter + MD 内容 → GitHub API commit → 提示「已提交，约 2 分钟后生效」
- 写作过程中自动保存草稿到 `localStorage`（见 5.8 节）

### 5.5 编辑文章（/admin/edit/[type]/[filename]）

- 通过 GitHub API 读取文件内容
- 解析 front matter 填充元信息栏
- Markdown 内容通过 `tiptap-markdown` 反序列化为 Tiptap 文档
- 编辑后 commit 更新文件
- 支持从前台文章页直接跳转过来

### 5.5 删除文章

- 仅在 admin 列表页触发删除（前台文章页的删除按钮跳转到 admin）
- 弹出确认对话框（显示文章标题和文件路径）
- 确认后通过 GitHub API 删除文件并 commit
- 删除成功后刷新列表

### 5.6 设置页（/admin/settings）

- GitHub Token 输入 + 连接测试
- 仓库名、分支配置
- 主题切换

### 5.7 GitHub API 封装

```typescript
class GitHubClient {
  constructor(token: string, repo: string, branch: string)

  // 读取目录下所有文件
  listFiles(dir: string): Promise<FileEntry[]>

  // 读取单个文件内容
  getFile(path: string): Promise<{ content: string; sha: string }>

  // 创建或更新文件
  saveFile(path: string, content: string, sha: string | null, message: string): Promise<void>

  // 删除文件
  deleteFile(path: string, sha: string, message: string): Promise<void>

  // 测试连接
  testConnection(): Promise<{ login: string }>
}
```

Token 存储在 `localStorage`，仅在客户端使用。

### 5.9 草稿机制

- 编辑器每 30 秒自动将当前内容保存到 `localStorage`，key 格式：`draft:{type}:{slug}` 或 `draft:new:{timestamp}`
- 仪表盘显示所有未发布草稿，可点击恢复编辑
- 发布成功后自动清除对应草稿
- 草稿数据结构：

```typescript
interface Draft {
  id: string;          // draft:new:1713100800 或 draft:notes:some-slug
  type: string;        // posts | notes | readings | thoughts
  title: string;
  content: string;     // Tiptap JSON 或 Markdown
  frontMatter: Record<string, unknown>;
  updatedAt: number;   // timestamp
}
```

## 6. 内容处理管线

### 6.1 构建时（SSG）

```
content/**/*.md
  → gray-matter 解析 front matter
  → unified 管线处理 MD body:
      remark-parse → remark-gfm → remark-rehype
      → rehype-pretty-code (代码高亮)
      → rehype-stringify
  → 生成静态 HTML 页面
  → 同时生成 search-index.json
```

### 6.2 Admin 编辑器

Tiptap 所见即所得编辑器，不需要单独的预览功能。

- 输入：加载已有文章时，通过 `tiptap-markdown` 将 Markdown 反序列化为 Tiptap 文档
- 输出：保存时通过 `tiptap-markdown` 将 Tiptap 文档序列化为 Markdown，拼接 front matter 后提交

## 7. 图片处理

### 7.1 上传流程

在 Tiptap 编辑器中，用户通过以下方式插入图片：
- 粘贴剪贴板中的图片（截图）
- 拖拽图片文件到编辑器
- 工具栏点击图片按钮选择文件

插入后自动触发上传流程：

1. **客户端压缩**：使用 Canvas API 将图片压缩为 WebP 格式，目标大小 ≤ 500KB，最大宽度 1920px
2. **上传到 GitHub**：通过 GitHub API 将图片写入 `public/images/{year}/{month}/{timestamp}-{hash}.webp`
3. **插入链接**：上传完成后，在编辑器中插入 `![alt](/images/{year}/{month}/{timestamp}-{hash}.webp)`

### 7.2 压缩策略

```typescript
async function compressImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const maxWidth = 1920;
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const canvas = new OffscreenCanvas(img.width * scale, img.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 递减质量直到 ≤ 500KB
  for (let quality = 0.85; quality >= 0.4; quality -= 0.1) {
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
    if (blob.size <= 500 * 1024) return blob;
  }
  return canvas.convertToBlob({ type: 'image/webp', quality: 0.4 });
}
```

### 7.3 本地开发

本地写 MD 时，图片直接放在 `public/images/` 目录，用相对路径引用即可。Next.js 会自动处理 `public/` 下的静态资源。

### 7.4 图片目录结构

```
public/
  images/
    2026/
      04/
        1713100800-a1b2c3.webp
        1713101400-d4e5f6.webp
```

按年月分目录，避免单目录文件过多。文件名用时间戳 + 短 hash 保证唯一性。

## 8. Front Matter 格式

保持与现有格式兼容，去掉加密相关字段：

```yaml
---
title: "文章标题"
date: 2026-04-14
tags: [tag1, tag2]
category: "分类名"     # 仅 notes 和 readings
---
```

`layout` 字段不再需要（Next.js 通过路由决定布局）。
`source: admin` 字段保留，标记线上创建的文章。

## 8. 部署架构

### 8.1 GitHub Actions 工作流

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out
      - uses: actions/deploy-pages@v4
```

### 8.2 Next.js 配置

```typescript
// next.config.ts
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },  // 静态导出不支持 Image Optimization
  basePath: '',                    // 根路径部署
  trailingSlash: true,             // 生成 /posts/xxx/index.html 形式
};
```

### 8.3 Bookmark 协调

Bookmark 项目的 CI 当前直接 push 构建产物到博客仓库。迁移后需要调整：

**方案**：博客的 Actions 构建完成后，将 Bookmark 的构建产物复制到 `out/bookmark/` 目录再部署。具体做法是在博客仓库保留 `bookmark/` 目录（构建产物），Actions 中 build 完成后将其复制到 `out/` 下。

## 9. 版本迭代计划

### V1 — 能用（替代 Jekyll，基础 CRUD）

**目标**：完成从 Jekyll 到 Next.js 的迁移，博客能正常展示，admin 能增删改查文章。

| 步骤 | 内容 |
|------|------|
| 1. 项目骨架 | 初始化 Next.js + TypeScript + Tailwind + pnpm；配置 `next.config.ts`（静态导出）；根布局 + dark/light/system 主题切换 |
| 2. 内容迁移 | `_posts/` → `content/posts/` 等四个目录；写脚本批量清理 front matter（去掉 layout、加密字段）；实现 `lib/content.ts` 读取和解析 MD |
| 3. 前台页面 | 首页（4 个 Tab + 按日期/分类排列）；文章详情页（4 种类型）；unified 管线处理 MD（remark + rehype + 代码高亮） |
| 4. 基础 Admin | Admin 布局（侧边导航）+ 设置页（GitHub Token 配置）；GitHub API 封装（CRUD）；文章列表页（筛选 + 搜索）；**Markdown textarea 编辑器**（左右分栏预览）+ front matter 表单 + 新建/编辑/删除 |
| 5. 部署 | GitHub Actions 工作流；Bookmark 构建产物协调（复制到 `out/bookmark/`）；验证所有页面 |
| 6. 清理 | 删除 Jekyll 文件（`_config.yml`、`_layouts/`、`_includes/`、`assets/`）；删除旧 `admin/index.html`；删除加密脚本；更新 CLAUDE.md |

**V1 交付标准**：
- 博客前台所有文章正常展示，样式与现有站点视觉一致
- Admin 后台可通过 GitHub API 新建、编辑、删除文章
- GitHub Actions 自动构建部署成功
- Bookmark 子路径正常访问

**V1 不做的事**：Tiptap 编辑器、搜索、图片上传、草稿、仪表盘、发布预览缓存

---

### V2 — 好用（编辑体验升级）

**目标**：写作体验从「能用」升级到「好用」，编辑器所见即所得，图片和搜索完善。

| 步骤 | 内容 |
|------|------|
| 1. Tiptap 编辑器 | 替换 V1 的 Markdown textarea；配置扩展（标题、加粗、斜体、列表、代码块、链接、图片、引用、任务列表）；斜杠命令（`/`）快速插入；Markdown 快捷输入（`## ` → 标题等）；`tiptap-markdown` 扩展实现 MD 双向转换 |
| 2. 图片上传 | 编辑器支持粘贴/拖拽图片；客户端 Canvas API 压缩为 WebP（≤500KB、最大宽度 1920px）；通过 GitHub API 上传到 `public/images/{year}/{month}/`；自动插入 Markdown 图片链接 |
| 3. 模糊搜索 | 构建时生成 `search-index.json`（title、tags、excerpt、category）；前端 Fuse.js 客户端模糊搜索；首页搜索栏实时过滤 |
| 4. 草稿机制 | 编辑器每 30 秒自动保存到 localStorage；草稿列表在 admin 可查看和恢复；发布后自动清除 |
| 5. 发布即可见 | 发布后将渲染内容缓存到 localStorage；文章页优先展示缓存（显示提示条）；缓存 10 分钟自动过期 |

**V2 交付标准**：
- Tiptap 编辑器所见即所得，MD 双向转换无损
- 图片粘贴后自动压缩上传，编辑器中直接展示
- 首页搜索可模糊匹配标题和标签
- 写到一半关掉浏览器，下次打开草稿还在
- 发布后立刻能看到文章内容（不等 Actions 构建）

**V2 不做的事**：写作仪表盘、热力图、浮动写按钮

---

### V3 — 想用（正反馈 + 快捷入口）

**目标**：加入让用户「想回来」的正反馈机制，优化创作入口，让写作成为习惯。

| 步骤 | 内容 |
|------|------|
| 1. 写作仪表盘 | Admin 首页改为仪表盘；统计卡片（本月文章数、总文章数、总字数）；最近 5 篇编辑文章快速入口；草稿列表入口 |
| 2. 写作日历热力图 | 类似 GitHub contribution graph；按日期显示写作活跃度（颜色深浅 = 当日字数）；数据从文章列表计算，缓存到 localStorage |
| 3. 快速创作入口 | 所有前台页面右下角浮动「写」按钮；点击跳转 `/admin/new`，默认类型「感想」；前台文章页的编辑/删除按钮 |
| 4. 体验打磨 | 移动端适配优化（admin 侧边栏折叠为汉堡菜单）；页面过渡动画；操作反馈完善（Toast 提示、加载状态、骨架屏） |

**V3 交付标准**：
- 打开 admin 首页能看到写作统计和活跃度
- 任何前台页面一键进入创作
- 移动端完整可用

## 10. 保留的文件

| 文件/目录 | 处理方式 |
|-----------|---------|
| `_posts/` → `content/posts/` | 迁移，清理 front matter |
| `_notes/` → `content/notes/` | 迁移，清理 front matter |
| `_readings/` → `content/readings/` | 迁移，清理 front matter |
| `_thoughts/` → `content/thoughts/` | 迁移，清理 front matter |
| `plan/` | 保留不动 |
| `study/` | 保留不动 |
| `bookmark/` | 保留不动（构建产物） |
| `scripts/` | 删除（加密脚本不再需要） |
| `admin/` | 删除（迁移到 Next.js /admin 路由） |
| `_layouts/`、`_includes/`、`_config.yml` | 删除 |
| `assets/css/style.scss` | 删除（样式迁移到 Tailwind） |

## 11. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| Actions 构建失败导致站点不可用 | 高 | 构建前本地验证；保留上一次成功部署 |
| 编辑到生效有 2-3 分钟延迟 | 低 | UI 提示「已提交，约 2 分钟后生效」 |
| GitHub API Token 泄露 | 中 | 仅存 localStorage，admin 页面不被搜索引擎索引 |
| 39 篇文章 front matter 格式不统一 | 低 | 迁移时统一清理，写脚本批量处理 |
