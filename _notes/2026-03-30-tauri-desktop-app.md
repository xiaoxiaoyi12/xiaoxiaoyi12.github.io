---
title: "Tauri v2 桌面应用开发入门"
date: 2026-03-30
category: "桌面端"
tags: [Tauri, Rust, Desktop, Vite]
---

## 概述

Tauri 是一个用 Rust 构建桌面应用的框架，前端使用系统 WebView 渲染（而非 Chromium），因此打包体积远小于 Electron（约 10MB vs 150MB）。Tauri v2 支持桌面（Mac/Windows/Linux）和移动端（iOS/Android）。

对于已有的 Web 前端项目（React/Vue 等），Tauri 可以直接复用前端代码，只需添加 Rust 侧的壳和少量适配。

## 核心知识点

### 1. Rust 工具链

Tauri 依赖 Rust 编译器，需要先安装：

```bash
# rustup 一键安装 rustc + cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

- **rustup** — Rust 版本管理器（类似 nvm）
- **rustc** — Rust 编译器
- **cargo** — 包管理器 + 构建工具（类似 npm）
- **Cargo.toml** — 项目配置（类似 package.json）

### 2. 项目初始化

```bash
npm install -D @tauri-apps/cli@^2
npm install @tauri-apps/api@^2
npx tauri init
```

生成 `src-tauri/` 目录：

```
src-tauri/
├── Cargo.toml          # Rust 依赖配置
├── tauri.conf.json     # Tauri 应用配置
├── src/
│   ├── main.rs         # 入口（自动生成）
│   └── lib.rs          # 应用逻辑 + 自定义命令
├── capabilities/       # 权限声明
└── icons/              # 应用图标
```

### 3. tauri.conf.json 关键配置

```json
{
  "build": {
    "frontendDist": "../dist",              // 前端构建产物
    "devUrl": "http://localhost:5173/",      // 开发时 Vite 地址
    "beforeDevCommand": "npm run dev",       // dev 前自动启动 Vite
    "beforeBuildCommand": "npm run build"    // build 前自动构建前端
  },
  "app": {
    "windows": [{
      "title": "My App",
      "width": 1200,
      "height": 800
    }],
    "security": {
      "csp": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:"
    }
  }
}
```

CSP 需要放宽以支持：外部 API 请求（AI）、外部图片加载、内联样式等。

### 4. Rust 命令与前端通信

Tauri 的核心机制：前端通过 `invoke` 调用 Rust 函数，Rust 返回结果。

**Rust 侧定义命令：**

```rust
#[tauri::command]
async fn fetch_url(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0")
        .build().map_err(|e| e.to_string())?;
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    resp.text().await.map_err(|e| e.to_string())
}

// 注册命令
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![fetch_url])
```

**前端调用：**

```typescript
import { invoke } from '@tauri-apps/api/core'

const html = await invoke<string>('fetch_url', { url: 'https://example.com' })
```

这种方式让桌面端可以绕过 CORS 限制，直接在 Rust 侧发起 HTTP 请求。

### 5. Web/Tauri 双构建共存

一套前端代码同时支持 Web 和 Tauri 两种构建：

**构建时判断（vite.config.ts）：**

```typescript
// Tauri 自动注入的环境变量
const isTauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  base: isTauri ? '/' : '/bookmark/',  // Tauri 用根路径，Web 用子路径
})
```

**运行时判断（前端代码）：**

```typescript
// Tauri 会在 window 上注入 __TAURI__ 对象
const isTauri = '__TAURI__' in window

// 路由 basename 动态切换
<BrowserRouter basename={isTauri ? '/' : '/bookmark'}>

// 功能分支：Tauri 用 invoke，Web 用 fetch
if ('__TAURI__' in window) {
  return invoke<string>('fetch_url', { url })
} else {
  return fetch(proxyUrl).then(r => r.text())
}
```

### 6. 常用命令

```bash
npm run tauri:dev      # 开发模式（热更新 + 桌面窗口）
npm run tauri:build    # 生产构建（生成 .dmg / .msi 安装包）
```

## Tauri vs Electron 对比

| | Tauri | Electron |
|---|---|---|
| 语言 | Rust | Node.js |
| 渲染引擎 | 系统 WebView | 内置 Chromium |
| 打包体积 | ~10MB | ~150MB |
| 内存占用 | 较低 | 较高 |
| 生态成熟度 | 较新（v2） | 非常成熟 |
| 系统 API | 通过 Rust 插件 | 直接 Node.js |

## 注意事项

- 首次 `tauri dev` 或 `tauri build` 需要编译 Rust 依赖，耗时较长（3-5 分钟），后续增量编译很快
- macOS 需要 Xcode Command Line Tools；Windows 需要 Visual Studio Build Tools
- Tauri WebView 在不同平台上行为可能有差异（macOS 用 WebKit，Windows 用 WebView2）
- EPUB.js 的 iframe 渲染在 Tauri 中可能需要调整 CSP 设置
- PWA 的 Service Worker 在 Tauri 中无意义，应在构建时条件禁用

## 参考

- [Tauri v2 官方文档](https://v2.tauri.app/)
- [Tauri + Vite 指南](https://v2.tauri.app/start/frontend/vite/)
- [Rust 命令文档](https://v2.tauri.app/develop/calling-rust/)
