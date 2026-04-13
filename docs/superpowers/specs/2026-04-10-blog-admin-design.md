# 博客在线管理后台 — 设计文档

## 1. 背景与目标

当前博客内容管理完全依赖本地文件编辑 + CLI 脚本，流程繁琐：写 Markdown → 手动设置 front matter → 运行加密脚本 → git commit/push。

**目标**：在博客站点内新增一个 `/admin` 管理后台，支持在浏览器中完成文章的新建、编辑、加密/解密、发布全流程。

**使用者**：仅站长自己，无需多用户/权限系统。

## 2. 核心功能

### 2.1 文章管理列表（/admin）

- **四种内容类型切换**：日志（_posts）、笔记（_notes）、阅读（_readings）、感想（_thoughts），分类标签页显示
- **文章信息展示**：日期、类型标签、标题、标签、加密状态
- **搜索**：按标题和标签搜索
- **操作按钮**：
  - 「新建文章」：跳转编辑器
  - 「编辑」：跳转编辑器并加载文章内容
  - 「加密」：未加密文章 → 弹窗输入密码 → 加密
  - 「解密」：已加密文章 → 弹窗输入密码 → 解密

### 2.2 Markdown 编辑器（/admin/edit）

- **Front matter 表单**：标题、日期、分类、标签（逗号分隔）
- **内容类型选择**：下拉选择目标目录
- **左右分栏编辑**：左侧 Markdown 编辑区，右侧 marked.js 实时预览
- **工具栏按钮**：
  - 「加密」：弹窗输入密码，加密当前文章
  - 「存草稿」：保存到 localStorage
  - 「发布」：保存文件到仓库（GitHub API 或本地服务）
- **自动保存**：编辑过程中每 30 秒自动保存到 localStorage，防止丢失

### 2.3 加密/解密弹窗

**加密弹窗**：
- 加密密码输入（带显隐切换）
- 确认密码
- 密码提示（可选）
- 确认/取消按钮

**解密弹窗**：
- 解密密码输入（带显隐切换）
- 确认/取消按钮

**加密实现**：
- 复用现有 CryptoJS CDN 库（站点已引入）
- 在浏览器端实现与 `scripts/crypto-utils.js` 相同的 CEK 双层加密逻辑：
  - PBKDF2 派生密钥（100k 迭代，SHA-256，256 位）
  - 随机生成 CEK → AES-256-CBC 加密正文
  - 密码派生密钥加密 CEK
- 加密后更新 front matter（`protected: true`, `layout: protected-post`, `encrypted: true`, `encrypted_key`, `key_salt`）
- **注意**：浏览器端不处理主恢复密钥（recovery_key），该功能保留在本地 CLI 脚本中

### 2.4 双模式存储

**GitHub API 模式（在线）**：
- 使用 GitHub REST API（Contents API）读写仓库文件
- 需要 Personal Access Token（存储在 localStorage，首次使用时输入）
- 发布 = 创建/更新文件 commit
- 读取文章列表 = 列出目录内容 + 获取文件内容

**本地 Node 服务模式（离线/可选）**：
- 提供 `scripts/admin-server.js`，运行 `npm run admin`
- Express 服务，端口 3001
- REST API：
  - `GET /api/posts?type=_posts` — 列出文章
  - `GET /api/posts/:type/:filename` — 获取文章内容
  - `POST /api/posts/:type/:filename` — 创建/更新文章
  - `DELETE /api/posts/:type/:filename` — 删除文章
  - `POST /api/git/commit` — git add + commit + push
- CORS 允许 GitHub Pages 域名访问

**模式切换逻辑**：
- 前端启动时检测本地服务是否可用（fetch `localhost:3001/api/health`）
- 可用则优先走本地服务，不可用则走 GitHub API
- 设置页面可手动切换

### 2.5 设置页面

- **存储配置**：GitHub Token、本地服务地址、存储模式切换
- **博客信息**：仓库地址（owner/repo）、默认分支
- **主题切换**：管理后台的深色/浅色模式（复用博客现有的三态主题切换）
- **文章模板配置**：各类型文章（日志/笔记/阅读/感想）的默认 front matter 和内容模板
- 所有设置存储在 localStorage

## 3. 技术架构

### 3.1 前端（纯静态 SPA）

```
admin/
  index.html          — SPA 入口，内含所有 HTML/CSS/JS
```

**技术选型**：
- 纯 HTML + CSS + Vanilla JS（与博客现有风格一致，无构建工具）
- SPA 路由：hash 路由（`#list`, `#edit`, `#settings`）
- Markdown 渲染：marked.js（已有 CDN）
- 加密：CryptoJS（已有 CDN）
- UI 风格：GitHub 暗色主题风格（与博客 hacker theme 一致）

**为什么不用 React/Vue 等框架**：
- 博客是纯静态 Jekyll 站，无构建流程
- 功能页面有限（3 个页面），不需要框架
- 减少维护复杂度，与现有代码风格一致

### 3.2 本地服务（可选）

```
scripts/
  admin-server.js     — Express REST API 服务
```

**依赖**：express（新增 npm 依赖）

### 3.3 数据流

```
新建文章:
  编辑器 → 生成 front matter + 正文 → [可选: 浏览器端加密] → 保存
    ├─ GitHub API: PUT /repos/:owner/:repo/contents/:path (create/update file)
    └─ 本地服务: POST /api/posts/:type/:filename → fs.writeFile → git commit/push

列表加密:
  点击加密 → 弹窗输入密码 → 读取原文 → 浏览器端加密 → 保存加密后的文件
    ├─ GitHub API: GET file → 加密 → PUT file
    └─ 本地服务: GET → 加密 → POST

列表解密:
  点击解密 → 弹窗输入密码 → 读取密文 → 浏览器端解密 → 保存明文文件
    ├─ GitHub API: GET file → 解密 → PUT file
    └─ 本地服务: GET → 解密 → POST
```

## 4. 文件命名规则

沿用现有规则，编辑器自动生成文件名：
- _posts: `YYYY-MM-DD-daily-log.md`
- _notes: `YYYY-MM-DD-<title-slug>.md`
- _readings: `YYYY-MM-DD-<title-slug>.md`
- _thoughts: `YYYY-MM-DD-<title-slug>.md`

Slug 生成：编辑器提供 slug 输入框，用户手动输入英文短横线格式的 slug（如 `blog-encryption-explained`）。日志类型固定为 `daily-log`。

## 5. 安全考量

- **GitHub Token**：存 localStorage，仅站长本地浏览器可见。`/admin` 页面不需要登录保护（GitHub Pages 公开部署，但 Token 只存在于使用者浏览器中，不传输给第三方）
- **加密密码**：不持久化存储，每次操作时输入（sessionStorage 临时缓存，关闭标签页清除）
- **本地服务**：仅监听 localhost，不对外暴露

## 6. 浏览器端加密兼容性

浏览器端加密必须与现有 `protected-post.html` 解密逻辑完全兼容：
- 相同的 PBKDF2 参数（100k 迭代，SHA-256，256 位密钥，128 位 IV）
- 相同的 AES-256-CBC 模式
- 相同的密文格式（IV_hex:Base64_ciphertext）
- 相同的 CEK 加密格式
- 加密后的文章能在博客前台 `protected-post.html` 正常解密阅读

## 7. 验证方案

1. **文章 CRUD**：新建各类型文章 → 编辑 → 保存 → 在博客前台验证渲染正确
2. **加密兼容**：管理后台加密的文章 → 博客前台 `protected-post.html` 输入密码能解密
3. **CLI 兼容**：管理后台加密的文章 → `npm run decrypt` 能正常解密
4. **双模式**：分别测试 GitHub API 模式和本地服务模式的完整流程
5. **草稿恢复**：编辑中关闭页面 → 重新打开 → 能从 localStorage 恢复草稿
6. **模板配置**：设置自定义模板 → 新建文章时应用模板
