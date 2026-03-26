---
title: "epub.js Themes API 动态注入样式"
date: 2026-03-26
category: "前端"
tags: [epub.js, JavaScript, Dark Mode, iframe]
---

## 概述

epub.js 是一个在浏览器中渲染 EPUB 电子书的 JavaScript 库。它使用 **iframe** 来隔离渲染书籍内容，这带来一个问题：**你无法直接用 CSS 控制 iframe 内部的样式**。

比如你想给阅读器加暗色模式，外层页面变黑了，但 iframe 里的书籍内容还是白底黑字。

epub.js 提供了 **Themes API** 来解决这个问题 —— 它可以把样式动态注入到 iframe 内部。

---

## 为什么不能直接用 CSS？

浏览器的 iframe 有**同源策略**限制。即使 epub.js 的 iframe 和主页面同源，iframe 内部有自己独立的文档（DOM 和样式表）。

```
主页面
├── <style> body { background: #000; } </style>  ← 只影响主页面
└── <iframe>
    └── 书籍内容 HTML  ← 有自己独立的样式，不受主页面 CSS 影响
```

所以你需要一种方式把样式"塞进" iframe 里。epub.js 的 Themes API 就是干这个的。

---

## Themes API 基本用法

### 注册主题

```javascript
// rendition 是 epub.js 的渲染实例
const rendition = book.renderTo(element, { width: '100%', height: '100%' });

// 注册一个叫 "dark" 的主题
rendition.themes.register('dark', {
  'body': {
    'background-color': '#1a1a2e !important',
    'color': '#e0e0e0 !important',
  },
  'p, span, div': {
    'color': '#e0e0e0 !important',
  },
  'a': {
    'color': '#58a6ff !important',
  }
});

// 注册一个叫 "light" 的主题
rendition.themes.register('light', {
  'body': {
    'background-color': '#ffffff',
    'color': '#333333',
  }
});
```

`register` 的第二个参数是一个 **CSS 对象**，key 是选择器，value 是样式属性。epub.js 会把这些样式转换成 `<style>` 标签注入到 iframe 中。

### 切换主题

```javascript
// 应用暗色主题
rendition.themes.select('dark');

// 切换回亮色
rendition.themes.select('light');
```

调用 `select()` 后，epub.js 会自动更新 iframe 内的样式。

---

## 为什么需要 `!important`？

EPUB 文件本身可能自带样式（出版商在制作电子书时会内嵌 CSS）。这些内嵌样式可能覆盖你注入的主题样式。

```html
<!-- EPUB 文件内部可能有这样的样式 -->
<style>
  body { background: white; color: black; }
  p { color: #333; }
</style>
```

如果不加 `!important`，你注入的暗色背景和文字颜色会被 EPUB 自带样式覆盖，导致暗色模式"不生效"。

---

## 实际使用示例

以 bookmark 阅读器项目为例，配合主题切换：

```typescript
// 定义主题样式
const DARK_THEME = {
  'body': {
    'background-color': '#1a1a2e !important',
    'color': '#e0e0e0 !important',
  },
  'p, span, div, li, td, th, h1, h2, h3, h4, h5, h6': {
    'color': '#e0e0e0 !important',
  },
  'a': {
    'color': '#58a6ff !important',
  },
  'img': {
    'opacity': '0.9',
  }
};

const LIGHT_THEME = {
  'body': {
    'background-color': '#ffffff',
    'color': '#333333',
  }
};

// 初始化时注册
rendition.themes.register('dark', DARK_THEME);
rendition.themes.register('light', LIGHT_THEME);

// 响应主题切换
function onThemeChange(isDark: boolean) {
  rendition.themes.select(isDark ? 'dark' : 'light');
}
```

---

## 其他常用 Themes API 方法

```javascript
// 设置全局字体大小
rendition.themes.fontSize('120%');

// 设置全局字体
rendition.themes.font('Georgia, serif');

// 直接覆盖某个 CSS 属性（不通过主题）
rendition.themes.override('color', '#e0e0e0');

// 注入一个外部 CSS 文件的 URL
rendition.themes.registerUrl('custom', '/path/to/custom.css');
```

---

## 注意事项

1. **时机问题**：`themes.register()` 需要在 `rendition.display()` 之前调用，否则首屏可能闪烁
2. **翻页后生效**：`themes.select()` 会在下一次渲染时生效，已渲染的页面会立即更新
3. **选择器要全面**：EPUB 内容结构多样，建议覆盖尽可能多的文本元素选择器（`p, span, div, li, td, h1-h6` 等）
4. **图片处理**：暗色模式下图片可能太亮，可以加 `opacity: 0.9` 或 `filter: brightness(0.9)` 柔和处理

---

## 总结

| 问题 | 解决方案 |
|------|---------|
| iframe 内样式隔离 | `rendition.themes.register()` 注入样式 |
| EPUB 自带样式覆盖 | 注入的样式加 `!important` |
| 动态切换主题 | `rendition.themes.select('themeName')` |
| 字体大小调整 | `rendition.themes.fontSize('120%')` |

一句话总结：**epub.js 的 Themes API 是把样式注入 iframe 的桥梁，暗色模式必须通过它才能生效。**
