# V2 设计规格：编辑器升级 + 图片上传 + 搜索增强

## 目标

将博客管理后台从 V1 的基础 textarea 编辑升级为完整的内容创作工具：所见即所得编辑器、图片拖拽上传、全站模糊搜索。

## 技术决策记录

| 决策 | 选项 | 选定 | 理由 |
|------|------|------|------|
| 编辑器方案 | Tiptap / Milkdown / 增强 Textarea | **Tiptap** | 最成熟的 React WYSIWYG 方案，扩展生态丰富 |
| MD 转换 | marked+turndown / tiptap-markdown 单包 | **tiptap-markdown** | MD↔ProseMirror 直接映射，不经过 HTML，保真度最高 |
| 编辑器布局 | 全宽 / 编辑+源码切换 | **全宽** | Tiptap 本身即所见即所得，不需要预览面板 |
| 图片存储 | GitHub 仓库 / 第三方图床 / Issues 图床 | **GitHub 仓库** | 零成本，与内容同仓库管理 |
| 图片提交 | Contents API 逐个 / Git Data API 批量 | **Git Data API 批量** | 一次 commit 包含文章+所有图片，取消编辑时零污染，大幅减少 git 历史噪音 |
| 搜索方案 | 子串匹配 / Fuse.js | **Fuse.js** | 模糊匹配、多字段加权、结果高亮 |

---

## 模块 1：Tiptap 编辑器

### 架构

用 Tiptap 替换当前 `MarkdownEditor`（textarea + react-markdown 预览）。编辑器全宽显示，顶部固定工具栏，所见即所得编辑。

### 核心组件

**TiptapEditor** — 新组件，接口与旧 MarkdownEditor 保持一致：
- Props：`value: string`（Markdown）、`onChange: (md: string) => void`
- 加载时：`tiptap-markdown` 将 MD 解析为 ProseMirror 文档
- 保存时：`editor.storage.markdown.getMarkdown()` 输出 MD

**EditorToolbar** — 工具栏组件：
- 格式：加粗、斜体、删除线
- 标题：H1、H2、H3
- 插入：链接、图片、代码块、引用、水平线
- 列表：有序列表、无序列表
- 操作：撤销、重做

### Markdown 快捷输入

Tiptap starter-kit 内置 inputRules，用户可以用 Markdown 语法直接输入：
- `## ` → H2 标题
- `> ` → 引用块
- `- ` / `* ` → 无序列表
- `1. ` → 有序列表
- `` ``` `` → 代码块
- `**text**` → 加粗
- `*text*` → 斜体

### 依赖

```
@tiptap/react          — React 绑定
@tiptap/starter-kit    — 基础扩展包（Document, Paragraph, Text, Bold, Italic, Strike, Code, Heading, Blockquote, BulletList, OrderedList, ListItem, CodeBlock, HorizontalRule, History）
@tiptap/extension-link      — 链接扩展
@tiptap/extension-image     — 图片扩展
@tiptap/extension-table     — 表格扩展（GFM 表格支持）
@tiptap/extension-table-row — 表格行
@tiptap/extension-table-cell — 表格单元格
@tiptap/extension-table-header — 表格头单元格
tiptap-markdown             — MD↔ProseMirror 直接转换（社区维护，非官方包，需验证与当前 Tiptap 版本兼容性及 GFM 扩展语法支持）
```

### 删除的依赖

- `react-markdown`（仅 admin 预览用到，Tiptap 取代了预览功能）

### 受影响的文件

- 删除：`src/components/admin/MarkdownEditor.tsx`
- 新建：`src/components/admin/TiptapEditor.tsx`、`src/components/admin/EditorToolbar.tsx`
- 修改：`src/app/admin/new/page.tsx`、`src/app/admin/edit/page.tsx`（替换 `<MarkdownEditor>` 为 `<TiptapEditor>`）

---

## 模块 2：图片上传

### 架构

图片拖拽/粘贴到编辑器后，暂存在浏览器内存（base64 Data URL）。保存文章时，一次性将文章和所有新图片通过 Git Data API 打包成单个 commit。

### 上传流程

```
用户拖入图片
  → 前端转 base64 Data URL
  → 编辑器中用 data:image/... 临时显示
  → 超过 10MB 的图片拒绝，超过 1920px 宽度的图片用 canvas 压缩
  → 编辑过程中可自由添加/删除图片

用户点击保存
  → 收集所有 data:image/... 图片
  → 每张图片：生成文件名（{timestamp}-{name}.{ext}），name 处理规则：小写化、空格转连字符、移除特殊字符（仅保留 a-z0-9-）
  → 路径：public/images/{type}/{YYYY-MM}/{filename}
  → 替换编辑器中的 data:image/... 为正式路径 /images/{type}/{YYYY-MM}/{filename}
  → 调用 Git Data API 批量提交（文章 MD + 所有图片文件）

用户取消编辑
  → 什么都不提交，零污染
```

### Git Data API 批量提交流程

GitHubClient 新增方法 `commitMultipleFiles`，内部步骤：

1. **Create Blobs** — 每个文件（文章 MD + 图片）调用 `POST /repos/{owner}/{repo}/git/blobs`，返回 blob sha
2. **Get Base Tree** — 获取当前分支最新 commit 的 tree sha
3. **Create Tree** — `POST /repos/{owner}/{repo}/git/trees`，传入 base_tree + 所有文件的 path/sha 对
4. **Create Commit** — `POST /repos/{owner}/{repo}/git/commits`，传入 tree sha + parent commit sha
5. **Update Ref** — `PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}`，指向新 commit

### 编辑器集成

扩展 Tiptap Image 扩展：
- 重写 `addProseMirrorPlugins`，监听 drop 和 paste 事件
- 拖入图片文件 → 转 base64 → 插入 `<img src="data:image/...">`
- 工具栏图片按钮 → 弹出文件选择器 → 同样转 base64 插入

### 图片压缩

上传前在浏览器端处理：
- 检查图片尺寸，宽度 > 1920px 时用 canvas 等比缩放
- 文件大小 > 10MB 直接拒绝（提示用户压缩后再上传）
- 仅处理 raster 图片（PNG/JPG/WebP），SVG/GIF 直接传不压缩

### 受影响的文件

- 新建：`src/lib/image-upload.ts`（压缩 + base64 处理逻辑）
- 修改：`src/lib/github-api.ts`（新增 `commitMultipleFiles` 方法）
- 修改：`src/components/admin/TiptapEditor.tsx`（Image 扩展 + drop/paste 处理）
- 修改：`src/app/admin/new/page.tsx`、`src/app/admin/edit/page.tsx`（保存逻辑：有新图片时用 `commitMultipleFiles` 批量提交，纯文本编辑时仍用原有 `saveFile` 单文件提交，避免不必要的复杂度）

---

## 模块 3：Fuse.js 搜索增强

### 架构

构建时生成静态搜索索引 JSON，运行时 Fuse.js 客户端模糊搜索。

### 搜索索引生成

在 Next.js 构建过程中，通过一个构建脚本（`scripts/generate-search-index.mjs`）遍历所有文章，输出 `public/search-index.json`：

```json
[
  {
    "slug": "2026-04-14-daily-log",
    "type": "posts",
    "title": "日志 - 2026-04-14",
    "date": "2026-04-14",
    "tags": ["学习", "Next.js"],
    "excerpt": "今天完成了博客从 Jekyll 到 Next.js 的迁移..."
  }
]
```

索引字段：slug、type、title、date、tags、excerpt（前 200 字纯文本摘要）。不索引全文，控制体积。

在 `next.config.ts` 的构建管线中，通过 `package.json` scripts 串联：`"build": "node scripts/generate-search-index.mjs && next build"`。

### Fuse.js 配置

```typescript
const fuse = new Fuse(articles, {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'tags', weight: 0.3 },
    { name: 'excerpt', weight: 0.2 },
  ],
  threshold: 0.4,        // 模糊度（0=精确，1=全匹配）
  includeMatches: true,   // 返回匹配位置，用于高亮
  minMatchCharLength: 2,  // 最少匹配 2 字符
});
```

### 搜索 UI

改造 `HomeClient.tsx` 的搜索逻辑：
- 首次聚焦搜索框时 `fetch('/search-index.json')` 懒加载索引
- 初始化 Fuse 实例（缓存，不重复创建）
- 输入时 debounce 300ms 后执行搜索
- 结果展示复用现有 `ArticleCard` 组件，匹配文字加 `<mark>` 高亮

### 体积评估

- Fuse.js：~5KB gzip
- search-index.json（40 篇文章）：~15KB
- 都在搜索触发时懒加载，不影响首屏

### 受影响的文件

- 新建：`scripts/generate-search-index.mjs`（构建时生成索引）
- 新建：`src/lib/search.ts`（Fuse.js 初始化 + 搜索封装）
- 修改：`src/app/HomeClient.tsx`（替换子串匹配为 Fuse.js 搜索）
- 修改：`src/components/article/ArticleCard.tsx`（支持高亮匹配文字）
- 修改：`package.json`（build script 加入索引生成步骤）

---

## 新增依赖汇总

| 包名 | 用途 | 体积（gzip） |
|------|------|-------------|
| `@tiptap/react` | Tiptap React 绑定 | ~8KB |
| `@tiptap/starter-kit` | 基础扩展包 | ~30KB |
| `@tiptap/extension-link` | 链接扩展 | ~3KB |
| `@tiptap/extension-image` | 图片扩展 | ~2KB |
| `@tiptap/extension-table` + row/cell/header | GFM 表格支持 | ~8KB |
| `tiptap-markdown` | MD↔ProseMirror 转换（社区包） | ~15KB |
| `fuse.js` | 客户端模糊搜索 | ~5KB |

移除：`react-markdown`（~12KB）

净增约 ~50KB gzip，全部在 admin 页面或搜索触发时加载，不影响文章阅读页性能。

## 已知限制

- **孤儿图片清理**：用户编辑文章时删除已保存的图片，图片文件仍留在仓库中。V2 不做自动清理，未来可通过脚本定期扫描未引用的图片。
- **`tiptap-markdown` 兼容性风险**：社区包，实现计划第一步应验证其与当前 Tiptap 版本及 GFM 语法的兼容性。如不兼容，备选方案：基于 `markdown-it` + `prosemirror-markdown` 自行实现序列化层。
- **中文模糊搜索**：Fuse.js 基于字符级匹配，中文无分词边界，threshold 参数可能需要在实际使用中调优。

## 不在 V2 范围内

- 文章加密/解密恢复（V3）
- 草稿系统（V3）
- 写作仪表盘/热力图（V3）
- 全文搜索（当前摘要级别搜索够用）
