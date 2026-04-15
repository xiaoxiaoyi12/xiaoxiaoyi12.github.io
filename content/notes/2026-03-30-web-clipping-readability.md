---
title: "网页剪藏实现：Readability + CORS 代理"
date: 2026-03-30
category: "前端"
tags: [Readability, CORS, Web Clipping, Mozilla]
---

## 概述

在纯前端应用中实现网页剪藏功能：用户输入 URL，自动提取网页正文内容保存到本地书库。核心使用 Mozilla 的 `@mozilla/readability` 库（Firefox 阅读模式的同款引擎），配合 CORS 代理解决跨域问题。

## 核心知识点

### 1. @mozilla/readability

这是 Firefox 浏览器内置阅读模式使用的正文提取库，能智能识别网页主体内容，过滤导航栏、广告、侧边栏等无关元素。

```typescript
import { Readability } from '@mozilla/readability'

// 需要传入 Document 对象
const doc = new DOMParser().parseFromString(html, 'text/html')
const article = new Readability(doc).parse()

// 返回值
article.title    // 文章标题
article.content  // 清理后的 HTML 正文
article.byline   // 作者信息
article.excerpt  // 摘要
```

### 2. CORS 代理

前端直接 fetch 其他网站会被浏览器 CORS 策略阻止。使用公共代理服务绕过：

```typescript
// allorigins 代理服务
const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
const response = await fetch(proxyUrl)
const html = await response.text()
```

常用免费 CORS 代理：
- `api.allorigins.win` — 返回原始内容
- `corsproxy.io` — 另一个选择

### 3. 相对路径修正

网页中的图片、链接等可能使用相对路径，提取后需要修正为绝对路径：

```typescript
// 设置 <base> 标签让浏览器自动解析相对路径
const base = doc.createElement('base')
base.href = originalUrl
doc.head.appendChild(base)
```

或手动处理 `img[src]`、`a[href]` 等属性。

### 4. 封面图提取

优先从 Open Graph 标签获取封面图：

```typescript
const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
```

### 5. 存储为 ArrayBuffer

将提取的 HTML 正文转为 ArrayBuffer 存储到 IndexedDB，与 EPUB/PDF 文件统一存储格式：

```typescript
const encoder = new TextEncoder()
const arrayBuffer = encoder.encode(htmlContent).buffer

// 读取时还原
const decoder = new TextDecoder()
const html = decoder.decode(new Uint8Array(arrayBuffer))
```

## 完整流程

```
用户输入 URL
    ↓
通过 CORS 代理获取网页 HTML
    ↓
DOMParser 解析为 Document
    ↓
设置 <base> 修正相对路径
    ↓
Readability 提取正文
    ↓
提取标题、作者、og:image
    ↓
HTML 正文 → ArrayBuffer 存入 IndexedDB
    ↓
书库中显示为 web 格式书籍
```

## 注意事项

- 部分网站可能阻止代理访问（返回 403 或验证码），这类网页无法剪藏
- Readability 对结构化程度高的文章效果最好，对复杂布局（如论坛帖子）可能提取不完整
- 存储的是提取后的正文 HTML，不是完整网页，节省空间且阅读体验更好
- 图片仍然引用原始 URL，离线时可能无法显示

## 参考

- [@mozilla/readability GitHub](https://github.com/mozilla/readability)
- [allorigins CORS 代理](https://allorigins.win/)
