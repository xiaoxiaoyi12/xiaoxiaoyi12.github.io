---
title: "Tauri v2 + WebKit 踩坑记录"
date: 2026-03-30
category: "桌面开发"
tags: [Tauri, WebKit, CSP, Vite, Debug]
---

## 概述

在将 React + Vite 项目打包为 Tauri v2 桌面应用的过程中，遇到了 8 个 WebKit 兼容性问题。这些问题在开发模式下完全正常，只在生产构建中出现，调试难度较高。

## 核心问题与解决方案

### 1. 生产包白屏 — `window.__TAURI__` 注入时机

**现象**：`'__TAURI__' in window` 在开发模式正常，生产包中返回 `false`。

**原因**：Tauri 生产环境中 `__TAURI__` 对象的注入晚于 React 首次渲染，导致 Router basename 判断错误。

**解决**：改用 Vite 构建时常量：

```ts
// vite.config.ts
define: {
  __IS_TAURI__: JSON.stringify(!!process.env.TAURI_ENV_PLATFORM),
}
```

### 2. CSP 拦截 Tailwind 样式

**现象**：页面渲染但没有样式（蓝色背景）。

**原因**：Tailwind CSS 运行时通过 `blob:` URL 生成样式，WebKit 的 CSP 默认不允许。

**解决**：在 `tauri.conf.json` 的 CSP 中显式添加 `blob:` 到 `style-src`：

```json
"csp": "style-src 'self' 'unsafe-inline' blob: https: http:; ..."
```

### 3. epubjs iframe sandbox 权限不足

**现象**：EPUB 内容无法渲染。

**解决**：通过 MutationObserver 监听 iframe 创建，补上 `allow-scripts allow-same-origin`。

### 4. epubjs `selected` 事件不触发

**现象**：WebKit 下选中文字后不弹出工具栏。

**解决**：在 `contents.document` 上额外监听 `mouseup`，手动获取选区。

### 5. PDF.js worker 加载失败

**现象**：PDF 无法渲染。

**原因**：`new URL('...', import.meta.url)` 在 Tauri 的 `tauri://localhost` 协议下解析异常。

**解决**：Tauri 环境下改用 CDN 加载 worker。

### 6. PDF 文字层偏移

**现象**：文字选中位置与可见文字不一致。

**解决**：使用 pdfjs TextLayer 的 CSS 变量（`--total-scale-factor`）方案替代手动定位。

### 7. ArrayBuffer 被 detach

**现象**：PDF 加载时报 `detached ArrayBuffer` 错误。

**解决**：传入 `fileData.slice(0)` 创建副本。

### 8. TypeScript polyfill 类型缺失

**现象**：构建报 `getOrInsertComputed` 等类型不存在。

**解决**：在 `main.tsx` 中添加 `declare global` 类型声明。

## 调试技巧

生产包调试需要手动开启 devtools：

```toml
# Cargo.toml
tauri = { version = "2.10.3", features = ["devtools"] }
```

```rust
// lib.rs setup
if cfg!(debug_assertions) {
    let window = app.get_webview_window("main").unwrap();
    window.open_devtools();
}
```

## 关键经验

1. **运行时环境检测不可靠** — Tauri 注入时机不确定，必须用构建时常量
2. **CSP 需要显式声明每种资源类型** — `default-src` 不够，`style-src`/`script-src`/`worker-src` 要分别配置
3. **WebKit 比 Chromium 更严格** — iframe sandbox、CSP、URL 协议解析都更保守
4. **生产包必须开 devtools** — 否则白屏无法排查
