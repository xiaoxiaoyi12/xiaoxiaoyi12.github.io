---
title: "PWA 实践：vite-plugin-pwa 配置与安装条件"
date: 2026-03-30
category: "前端"
tags: [PWA, Vite, Service Worker, Workbox]
---

## 概述

PWA（Progressive Web App）让网页应用可以像原生 APP 一样安装到桌面/手机主屏幕，支持离线使用、全屏运行、自动更新。在 Vite 项目中通过 `vite-plugin-pwa` 快速集成，底层使用 Google 的 Workbox 管理 Service Worker 缓存。

## 核心知识点

### 1. vite-plugin-pwa 基本配置

```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',  // 自动更新 SW，用户无需手动刷新
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],  // 预缓存的资源
      },
      manifest: {
        name: 'App Name',
        short_name: 'App',
        theme_color: '#8b6914',
        background_color: '#faf6f0',
        display: 'standalone',      // 隐藏浏览器地址栏
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

### 2. Manifest 必要字段

Chrome 判断是否可安装的最低要求：

| 字段 | 要求 |
|------|------|
| `name` 或 `short_name` | 必须有其一 |
| `icons` | 至少 192x192 和 512x512 各一个 PNG |
| `start_url` | 应用入口 URL |
| `display` | `standalone` 或 `fullscreen` 或 `minimal-ui` |

### 3. 安装条件（Chrome）

即使 Manifest 和 Service Worker 都正确，Chrome 仍需满足：

1. **HTTPS**（或 `localhost`）— 局域网 IP 不行
2. **Service Worker 已激活** — 必须注册并 activate
3. **用户参与度** — 在页面上交互至少 **30 秒**
4. **未被用户拒绝** — 如果用户之前拒绝了安装，短期内不会再提示

### 4. 开发模式测试

默认 `vite-plugin-pwa` 只在 build 时生成 SW。开发模式需要显式启用：

```typescript
VitePWA({
  devOptions: { enabled: true },
})
```

开发模式下的 SW 不会缓存资源，仅用于触发安装流程。

### 5. 离线缓存策略

Workbox 提供多种缓存策略：

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `CacheFirst` | 优先缓存，缓存没有再网络 | 字体、CDN 资源、不常变的静态资源 |
| `NetworkFirst` | 优先网络，网络不通用缓存 | API 请求、频繁更新的数据 |
| `StaleWhileRevalidate` | 先返回缓存，同时后台更新 | 不要求实时但要快的资源 |

```typescript
runtimeCaching: [
  {
    urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'cdn-cache',
      expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
],
```

### 6. iOS 适配

iOS Safari 的 PWA 支持有限，需要额外的 meta 标签：

```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/pwa-192x192.png" />
```

注意：`apple-mobile-web-app-capable` 已废弃，应使用 `mobile-web-app-capable`。

## 注意事项

- PWA 的 `scope` 和 `start_url` 必须与实际部署路径一致（如 GitHub Pages 的子目录 `/bookmark/`）
- 如果项目同时支持 Tauri 桌面端，应在 Tauri 构建时禁用 PWA 插件（桌面端不需要 SW）
- Service Worker 更新后，旧页面仍使用旧 SW，需要关闭所有标签页再打开才会切换（`autoUpdate` 模式会自动处理）
- 图标建议同时提供 `purpose: 'maskable'` 版本，适配 Android 自适应图标

## 参考

- [vite-plugin-pwa 官方文档](https://vite-pwa-org.netlify.app/)
- [Web App Manifest - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox 缓存策略](https://developer.chrome.com/docs/workbox/caching-strategies-overview)
