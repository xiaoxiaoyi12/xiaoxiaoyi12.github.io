---
title: "GitHub Actions 部署 SPA 到 GitHub Pages"
date: 2026-03-26
category: "DevOps"
tags: [GitHub Actions, GitHub Pages, Vite, SPA]
---

## 概述

假设你有一个用 React + Vite 写的单页应用（SPA），代码放在 GitHub 的仓库 A 里。你还有一个 GitHub Pages 博客，放在仓库 B（`xxx.github.io`）里。

你的目标是：**每次往仓库 A push 代码，自动构建，然后把产物部署到仓库 B 的某个子目录下**（比如 `xxx.github.io/bookmark/`）。

这篇笔记记录了完整的实现过程和踩过的坑。

---

## 什么是 GitHub Actions？

GitHub Actions 是 GitHub 提供的 **自动化工具**。你可以在仓库里写一个配置文件（YAML 格式），告诉 GitHub："每当我 push 代码，就自动帮我执行一系列命令"。

这些命令可以是：安装依赖、构建项目、运行测试、部署到服务器……几乎任何你在终端能做的事。

简单来说：**你 push 代码 → GitHub 自动帮你 build 和部署 → 网站就更新了**。不需要你手动操作。

---

## 完整流程图

```
你 push 代码到仓库 A (bookmark)
        ↓
GitHub Actions 自动触发
        ↓
在云端服务器上执行：
  1. 拉取代码
  2. 安装 Node.js
  3. npm install（安装依赖）
  4. vite build（构建生产版本）
        ↓
把构建产物（dist/ 文件夹）推送到仓库 B (xxx.github.io) 的 bookmark/ 目录
        ↓
GitHub Pages 检测到仓库 B 有更新，自动重新部署
        ↓
用户访问 xxx.github.io/bookmark/ 就能看到最新版本
```

---

## 第一步：创建 Workflow 配置文件

在仓库 A 中创建 `.github/workflows/deploy.yml` 文件：

```yaml
name: Deploy to GitHub Pages       # workflow 的名字，随便起

on:
  push:
    branches: [main]               # 只有 push 到 main 分支才触发

jobs:
  deploy:
    runs-on: ubuntu-latest         # 在 Ubuntu 系统上运行
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true  # 使用 Node.js 24（避免 deprecation 警告）
    steps:
      # 第 1 步：拉取仓库代码
      - uses: actions/checkout@v4

      # 第 2 步：安装 Node.js 环境
      - uses: actions/setup-node@v4
        with:
          node-version: 22          # 指定 Node.js 版本
          cache: 'npm'              # 缓存 npm 依赖，加速后续构建

      # 第 3 步：安装项目依赖
      - run: npm ci                 # ci 比 install 更严格，适合 CI 环境

      # 第 4 步：构建项目
      - run: npx vite build        # 产出在 dist/ 目录

      # 第 5 步：把 dist/ 推送到另一个仓库
      - name: Deploy to GitHub Pages repo
        uses: peaceiris/actions-gh-pages@v4
        with:
          personal_token: ${{ secrets.DEPLOY_TOKEN }}              # 用 token 授权
          external_repository: xiaoxiaoyi12/xiaoxiaoyi12.github.io # 目标仓库
          publish_branch: master      # 推送到目标仓库的哪个分支
          publish_dir: ./dist         # 要推送的本地目录
          destination_dir: bookmark   # 推送到目标仓库的哪个子目录
```

### 逐行解释

| 配置项 | 含义 |
|--------|------|
| `on: push: branches: [main]` | 触发条件：push 到 main 分支 |
| `runs-on: ubuntu-latest` | 运行环境：GitHub 提供的 Ubuntu 虚拟机 |
| `actions/checkout@v4` | 把你的代码下载到虚拟机上 |
| `actions/setup-node@v4` | 在虚拟机上安装 Node.js |
| `npm ci` | 根据 package-lock.json 精确安装依赖 |
| `npx vite build` | 执行 Vite 构建，生成 dist/ 目录 |
| `peaceiris/actions-gh-pages@v4` | 第三方 action，专门用于部署到 GitHub Pages |
| `personal_token` | 授权 token，让 workflow 有权限向另一个仓库推送代码 |
| `external_repository` | 目标仓库的完整名称（用户名/仓库名） |
| `destination_dir` | 部署到目标仓库的哪个子目录 |

---

## 第二步：配置授权 Token

GitHub Actions 默认只能操作当前仓库。要往**另一个仓库**推送代码，需要一个 Personal Access Token（PAT）来授权。

### 2.1 创建 Token

1. 打开 GitHub → 右上角头像 → Settings → Developer settings → Personal access tokens
2. 选择 **Tokens (classic)** → Generate new token (classic)
3. 填写：
   - **Note**：`bookmark-deploy`（备注名，随便写）
   - **Expiration**：选一个过期时间（建议 1 年）
   - **Scopes**：勾选 `repo`（这会授予对仓库的读写权限）
4. 点击 Generate token
5. **立刻复制 token**（页面关闭后就看不到了！）

> **安全提醒**：Token 等同于密码，绝对不要分享给别人、不要写在代码里、不要发在聊天中。

### 2.2 把 Token 存为 Secret

Token 不能直接写在 yml 文件里（那样所有人都能看到）。GitHub 提供了 **Repository Secrets** 功能来安全存储。

1. 打开仓库 A（bookmark）→ Settings → Secrets and variables → Actions
2. 点击 **New repository secret**
3. Name 填 `DEPLOY_TOKEN`，Value 粘贴刚才的 token
4. 点击 Add secret

这样在 workflow 中就可以用 `${{ secrets.DEPLOY_TOKEN }}` 来引用这个 token，而不会暴露真实值。

---

## 第三步：Vite 子路径配置

因为应用部署在 `xxx.github.io/bookmark/` 而不是根路径 `/`，需要告诉 Vite 和 React Router：

### 3.1 Vite 配置

在 `vite.config.ts` 中设置 `base`：

```ts
export default defineConfig({
  base: '/bookmark/',   // 所有静态资源路径会加上这个前缀
  // ...
})
```

**为什么需要这个？** 不设置的话，构建后的 HTML 会引用 `/assets/index.js`，但实际文件在 `/bookmark/assets/index.js`，浏览器就找不到文件了。

### 3.2 React Router 配置

```tsx
<BrowserRouter basename="/bookmark">
```

**为什么需要这个？** 不设置的话，React Router 会认为根路径是 `/`，而实际根路径是 `/bookmark/`，路由匹配就会出错。

---

## 第四步：SPA 路由回退（解决刷新 404）

### 问题是什么？

SPA（单页应用）的路由是前端 JavaScript 处理的，比如 `/bookmark/read/123` 这个路径，实际上服务器上并没有 `read/123` 这个文件。

- 你从首页点击链接进入 `/bookmark/read/123` → 正常（JS 处理的）
- 你直接在浏览器地址栏输入 `/bookmark/read/123` → **404**（服务器找不到文件）
- 你在 `/bookmark/read/123` 页面按 F5 刷新 → **404**（同上）

### 解决思路

GitHub Pages 有一个特性：找不到页面时会显示 `404.html`。我们可以利用这个特性：

1. 用户访问 `/bookmark/read/123` → 服务器找不到 → 显示 `404.html`
2. `404.html` 里的 JS 把路径信息编码到 URL 参数中，然后跳转到 `index.html`
3. `index.html` 里的 JS 从 URL 参数中恢复原始路径
4. React Router 接管，渲染正确的页面

### 具体实现

**`public/404.html`**（放在 public/ 下，构建时会自动复制到 dist/）：

```html
<!DOCTYPE html>
<html>
  <head>
    <script>
      // 把 /bookmark/read/123 转换成 /bookmark/?/read/123
      // 然后跳转到 index.html
      var pathSegmentsToKeep = 1; // 保留 '/bookmark' 前缀
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body></body>
</html>
```

**`index.html`** 中添加恢复脚本（放在 `<head>` 里）：

```html
<script>
  (function(l) {
    if (l.search[1] === '/') {
      // 从 ?/read/123 恢复成 /bookmark/read/123
      var decoded = l.search.slice(1).split('&').map(function(s) {
        return s.replace(/~and~/g, '&')
      }).join('?');
      window.history.replaceState(null, null,
        l.pathname.slice(0, -1) + decoded + l.hash
      );
    }
  }(window.location))
</script>
```

**整个过程对用户是无感的**，跳转发生在毫秒级，用户只会看到正确的页面。

---

## 第五步：.nojekyll 文件

GitHub Pages 默认会用 Jekyll（一个静态网站生成器）来处理仓库中的文件。Jekyll 有一些规则，比如会忽略以 `_` 开头的文件和目录。

如果你的构建产物中有类似 `_next/` 或 `_assets/` 这样的目录，Jekyll 会把它们忽略掉，导致网站加载失败。

**解决方法**：在 `public/` 目录下放一个空的 `.nojekyll` 文件。构建时它会被复制到 dist/ 中，告诉 GitHub Pages："不要用 Jekyll 处理这个目录，直接原样提供文件就好"。

---

## 踩坑记录

### 坑 1：npm ci 报错 lockfile 不同步

**现象**：`npm ci` 报错 "package.json and package-lock.json are in sync"

**原因**：本地用 Node 24（npm 11）生成的 `package-lock.json`，lockfile 版本较新。CI 环境用 Node 20（npm 10），无法正确解析。

**解决**：
1. CI 中使用 Node 22 以上版本
2. 或者删掉 `node_modules` 和 `package-lock.json`，重新 `npm install` 生成

### 坑 2：Permission denied (403)

**现象**：deploy 步骤报错 "Permission to xxx.git denied"

**原因**：PAT 没有对目标仓库的写入权限。

**解决**：
- Classic token：确保勾选了 `repo` scope
- Fine-grained token：确保选择了目标仓库，并且 Contents 权限设为 Read and write

### 坑 3：Node.js 20 deprecation 警告

**现象**：Actions 运行时显示 "Node.js 20 actions are deprecated"

**原因**：GitHub 将在 2026 年 6 月起强制使用 Node.js 24 运行 Actions。

**解决**：在 workflow 中添加环境变量提前适配：
```yaml
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

---

## 总结

整个部署链路涉及以下几个关键点：

| 环节 | 要做的事 | 文件/位置 |
|------|----------|-----------|
| 自动构建 | 编写 workflow 配置 | `.github/workflows/deploy.yml` |
| 跨仓库授权 | 创建 PAT + 存为 Secret | GitHub 设置页面 |
| 子路径适配 | 配置 base 和 basename | `vite.config.ts` + `App.tsx` |
| SPA 路由回退 | 404 重定向 + index 恢复 | `public/404.html` + `index.html` |
| Jekyll 兼容 | 添加 .nojekyll | `public/.nojekyll` |

## 参考

- [peaceiris/actions-gh-pages 文档](https://github.com/peaceiris/actions-gh-pages)
- [SPA GitHub Pages 路由方案](https://github.com/rafgraph/spa-github-pages)
- [GitHub Actions Node.js 24 迁移公告](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)
