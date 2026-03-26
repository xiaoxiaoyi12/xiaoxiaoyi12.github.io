# Theme Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark/light/system theme switching to the Jekyll blog using CSS variables and `data-theme` attribute.

**Architecture:** Define CSS custom properties under `[data-theme="dark"]` and `[data-theme="light"]` selectors, replace all hardcoded colors with variable references, add a shared `_includes/theme-toggle.html` with initialization script and toggle button, include it in both layouts.

**Tech Stack:** Jekyll (remote Hacker theme), SCSS, vanilla JS, localStorage, matchMedia API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `assets/css/style.scss` | Modify | CSS variable definitions + replace hardcoded colors |
| `_includes/theme-toggle.html` | Create | Theme init script (防闪烁) + toggle button HTML + toggle JS |
| `_layouts/home.html` | Modify | Include theme-toggle, replace inline hardcoded colors with variables |
| `_layouts/post.html` | Modify | Include theme-toggle, replace inline hardcoded colors with variables |

---

### Task 1: Define CSS variables in style.scss

**Files:**
- Modify: `assets/css/style.scss:1-4`

- [ ] **Step 1: Add CSS variable definitions after the import**

Replace lines 1-4 of `assets/css/style.scss` with:

```scss
---
---

@import "jekyll-theme-hacker";

// ===== Theme Variables =====

[data-theme="dark"] {
  --bg-page: #0d1117;
  --bg-card: #161b22;
  --border: #21262d;
  --border-light: #30363d;
  --text-primary: #c9d1d9;
  --text-secondary: #b0b8c1;
  --text-muted: #8b949e;
  --text-dimmed: #484f58;
  --accent: #58a6ff;
  --accent-hover: #79c0ff;
  --accent-bg: rgba(56, 130, 246, 0.08);
  --accent-border: #1f3a5f;
  --blockquote-bg: rgba(56, 130, 246, 0.05);
  --table-row-even: rgba(22, 27, 34, 0.5);
  --inline-code-color: #e6edf3;
}

[data-theme="light"] {
  --bg-page: #fafaf8;
  --bg-card: #f0efe8;
  --border: #d5d3c8;
  --border-light: #e0dfd6;
  --text-primary: #2c2c2a;
  --text-secondary: #4a4a45;
  --text-muted: #8a8778;
  --text-dimmed: #b0ad9e;
  --accent: #5a7a3a;
  --accent-hover: #4a6630;
  --accent-bg: rgba(90, 122, 58, 0.08);
  --accent-border: #a8c080;
  --blockquote-bg: rgba(90, 122, 58, 0.05);
  --table-row-even: rgba(240, 239, 232, 0.5);
  --inline-code-color: #2c2c2a;
}
```

- [ ] **Step 2: Verify the file parses correctly**

Run: `head -40 assets/css/style.scss`
Expected: the front matter, import, and two theme variable blocks.

- [ ] **Step 3: Commit**

```bash
git add assets/css/style.scss
git commit -m "feat(theme): add CSS variable definitions for dark and light themes"
```

---

### Task 2: Replace hardcoded colors in style.scss

**Files:**
- Modify: `assets/css/style.scss` (all color references after the variable block)

- [ ] **Step 1: Replace all hardcoded colors with CSS variables**

Replace the entire section from `// ===== 全局样式覆盖 =====` to end of file with:

```scss
// ===== 全局样式覆盖 =====

body {
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  line-height: 1.8;
  background: var(--bg-page);
}

// 去掉 hacker 主题的箭头和终端风格
header h1::before,
header h2::before,
h1::before, h2::before {
  content: none !important;
}

// ===== 文章详情页样式 =====

#main_content {
  h1, h2, h3, h4 {
    color: var(--text-primary);
    font-weight: 600;
    margin-top: 1.6em;
    margin-bottom: 0.6em;
    border-bottom: none;
  }

  h1 { font-size: 1.8em; }
  h2 {
    font-size: 1.4em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border);
  }
  h3 { font-size: 1.15em; }

  p {
    color: var(--text-secondary);
    margin-bottom: 1em;
  }

  a {
    color: var(--accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  ul, ol {
    color: var(--text-secondary);
    padding-left: 1.5em;

    li {
      margin-bottom: 0.4em;
      line-height: 1.8;
    }
  }

  // 行内代码
  code {
    background: var(--bg-card);
    color: var(--inline-code-color);
    padding: 0.2em 0.5em;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: "Menlo", "Monaco", "Consolas", monospace;
  }

  // 代码块
  pre {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
      font-size: 0.85em;
      line-height: 1.6;
    }
  }

  // 引用块
  blockquote {
    border-left: 3px solid var(--accent);
    padding: 0.5em 1em;
    margin: 1em 0;
    color: var(--text-muted);
    background: var(--blockquote-bg);
    border-radius: 0 6px 6px 0;
  }

  // 表格
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;

    th, td {
      padding: 10px 14px;
      border: 1px solid var(--border);
      text-align: left;
      color: var(--text-secondary);
    }

    th {
      background: var(--bg-card);
      color: var(--text-primary);
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: var(--table-row-even);
    }
  }

  // 水平线
  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2em 0;
  }

  // 图片
  img {
    max-width: 100%;
    border-radius: 8px;
    margin: 1em 0;
  }
}

// ===== 首页列表样式 =====

.post-list {
  list-style: none;
  padding: 0;

  li {
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    transition: background 0.2s;

    &:hover {
      background: var(--accent-bg);
    }
  }

  .post-date {
    color: var(--text-muted);
    margin-right: 14px;
    font-size: 0.88em;
  }

  a {
    color: var(--text-primary);
    text-decoration: none;

    &:hover {
      color: var(--accent);
    }
  }
}

.note-category {
  color: var(--accent);
  font-size: 1.05em;
  margin-top: 24px;
  margin-bottom: 6px;
  font-weight: 600;
}

.empty-hint {
  color: var(--text-dimmed);
  font-style: italic;
}

// ===== Tag 药丸样式 =====

.tag {
  display: inline-block;
  font-size: 12px;
  color: var(--accent);
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  padding: 1px 8px;
  border-radius: 12px;
  margin-left: 6px;
  vertical-align: middle;
  line-height: 1.6;
}

.post-tags {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid var(--border);
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/css/style.scss
git commit -m "feat(theme): replace all hardcoded colors with CSS variables"
```

---

### Task 3: Create _includes/theme-toggle.html

**Files:**
- Create: `_includes/theme-toggle.html`

- [ ] **Step 1: Create the _includes directory**

```bash
mkdir -p _includes
```

- [ ] **Step 2: Write the theme toggle include file**

Create `_includes/theme-toggle.html` with:

```html
<!-- Theme initialization (runs immediately to prevent flash) -->
<script>
(function() {
  var saved = localStorage.getItem('theme') || 'system';
  var theme;
  if (saved === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    theme = saved;
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
</script>

<!-- Theme toggle button (injected into .top-nav or placed standalone) -->
<style>
  .theme-toggle {
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    color: var(--text-muted);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.2s;
    padding: 0;
    flex-shrink: 0;
  }
  .theme-toggle:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }
</style>

<script>
(function() {
  var MODES = ['dark', 'light', 'system'];
  var ICONS = { dark: '\u{1F319}', light: '\u{2600}\u{FE0F}', system: '\u{1F4BB}' };
  var LABELS = { dark: '暗色模式', light: '亮色模式', system: '跟随系统' };

  function getStoredMode() {
    return localStorage.getItem('theme') || 'system';
  }

  function resolveTheme(mode) {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }

  function applyTheme(mode) {
    var theme = resolveTheme(mode);
    document.documentElement.setAttribute('data-theme', theme);
  }

  function updateButton(btn, mode) {
    btn.textContent = ICONS[mode];
    btn.setAttribute('aria-label', LABELS[mode]);
    btn.setAttribute('title', LABELS[mode]);
  }

  // Initialize all toggle buttons on the page
  var buttons = document.querySelectorAll('.theme-toggle');
  var currentMode = getStoredMode();

  buttons.forEach(function(btn) {
    updateButton(btn, currentMode);

    btn.addEventListener('click', function() {
      var idx = MODES.indexOf(currentMode);
      currentMode = MODES[(idx + 1) % MODES.length];
      localStorage.setItem('theme', currentMode);
      applyTheme(currentMode);
      buttons.forEach(function(b) { updateButton(b, currentMode); });
    });
  });

  // Listen for system theme changes when in 'system' mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (getStoredMode() === 'system') {
      applyTheme('system');
    }
  });
})();
</script>
```

- [ ] **Step 3: Commit**

```bash
git add _includes/theme-toggle.html
git commit -m "feat(theme): create theme toggle include with init script and switch logic"
```

---

### Task 4: Update home.html layout

**Files:**
- Modify: `_layouts/home.html`

- [ ] **Step 1: Add theme-toggle include at the top (after front matter)**

Replace lines 1-3 of `_layouts/home.html`:

```
---
layout: default
---
```

With:

```html
---
layout: default
---

{% include theme-toggle.html %}
```

- [ ] **Step 2: Replace all hardcoded colors in the inline `<style>` block**

Replace the entire `<style>` block (lines 5-68 originally) with:

```html
<style>
  .top-nav {
    display: flex;
    align-items: center;
    padding: 12px 0 20px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
    gap: 10px;
  }
  .tab-btn {
    background: none;
    border: 1px solid var(--border-light);
    color: var(--text-muted);
    padding: 6px 18px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    border-radius: 6px;
    transition: all 0.2s;
  }
  .tab-btn:hover {
    color: var(--text-primary);
    border-color: var(--text-dimmed);
  }
  .tab-btn.active {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-bg);
  }
  .search-box {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .search-box input {
    background: var(--bg-page);
    border: 1px solid var(--border-light);
    color: var(--text-primary);
    padding: 6px 14px;
    font-size: 14px;
    font-family: inherit;
    border-radius: 6px;
    width: 220px;
    transition: border-color 0.2s;
  }
  .search-box input::placeholder {
    color: var(--text-dimmed);
  }
  .search-box input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-bg);
  }
  .tab-content {
    display: none;
  }
  .tab-content.active {
    display: block;
  }
  .no-result {
    color: var(--text-dimmed);
    font-style: italic;
    margin-top: 12px;
  }
</style>
```

- [ ] **Step 3: Add the toggle button inside the nav, after the search input**

Replace the `<div class="search-box">` block:

```html
    <div class="search-box">
      <input type="text" id="search-input" placeholder="搜索文章和笔记..." />
    </div>
```

With:

```html
    <div class="search-box">
      <input type="text" id="search-input" placeholder="搜索文章和笔记..." />
      <button class="theme-toggle" type="button" aria-label="切换主题"></button>
    </div>
```

- [ ] **Step 4: Fix the hardcoded color in the search results JS**

In the `<script>` block, find the line (around line 200):

```javascript
          + '<span style="color:#484f58;font-size:12px;">(' + item.type + ')</span>';
```

Replace with:

```javascript
          + '<span style="color:var(--text-dimmed);font-size:12px;">(' + item.type + ')</span>';
```

- [ ] **Step 5: Commit**

```bash
git add _layouts/home.html
git commit -m "feat(theme): update home layout with CSS variables and toggle button"
```

---

### Task 5: Update post.html layout

**Files:**
- Modify: `_layouts/post.html`

- [ ] **Step 1: Add theme-toggle include and replace hardcoded colors**

Replace the entire contents of `_layouts/post.html` with:

```html
---
layout: default
---

{% include theme-toggle.html %}

<style>
  .back-btn {
    display: inline-block;
    color: var(--accent);
    font-size: 14px;
    text-decoration: none;
    margin-bottom: 20px;
    padding: 4px 0;
    transition: color 0.2s;
  }
  .back-btn:hover {
    color: var(--accent-hover);
  }
  .back-btn::before {
    content: "← ";
  }
  .post-header-toggle {
    float: right;
    margin-top: 4px;
  }
</style>

<div class="post-header-toggle">
  <button class="theme-toggle" type="button" aria-label="切换主题"></button>
</div>

<a class="back-btn" href="{{ '/' | relative_url }}">返回首页</a>

<small style="color: var(--text-muted);">{{ page.date | date: "%Y-%m-%d" }}</small>
<h1>{{ page.title }}</h1>

{{content}}

{% if page.tags.size > 0 %}
<div class="post-tags">
  {% for tag in page.tags %}<span class="tag">{{ tag }}</span>{% endfor %}
</div>
{% endif %}
```

- [ ] **Step 2: Commit**

```bash
git add _layouts/post.html
git commit -m "feat(theme): update post layout with CSS variables and toggle button"
```

---

### Task 6: Override remote theme background styles

**Files:**
- Modify: `assets/css/style.scss` (add overrides after the body rule)

The remote Hacker theme sets background colors on `body`, `header`, and the wrapper. These need to be overridden to use our CSS variables.

- [ ] **Step 1: Add Hacker theme overrides**

After the existing `body { ... }` block (with font-family and line-height), add:

```scss
// Override Hacker theme backgrounds to use CSS variables
body, header, #main_content {
  background-color: var(--bg-page) !important;
}

header h1, header h2 {
  color: var(--text-primary) !important;
}

header p {
  color: var(--text-secondary) !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/css/style.scss
git commit -m "feat(theme): override remote Hacker theme backgrounds with CSS variables"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Run Jekyll locally (if available) or review all changed files**

```bash
# If Jekyll is available:
bundle exec jekyll serve

# Otherwise verify file structure:
ls _includes/theme-toggle.html
head -50 assets/css/style.scss
grep 'theme-toggle' _layouts/home.html _layouts/post.html
grep -c 'var(--' assets/css/style.scss _layouts/home.html _layouts/post.html
```

Expected:
- `_includes/theme-toggle.html` exists
- No hardcoded color hex values remain in `style.scss` style rules (only in variable definitions)
- Both layouts include `theme-toggle.html`
- CSS variable references (`var(--`) appear throughout

- [ ] **Step 2: Check no hardcoded colors remain in style rules**

```bash
# Should only show matches inside [data-theme] blocks, not in style rules
grep -n '#[0-9a-fA-F]\{3,8\}' assets/css/style.scss
```

Expected: All hex color matches should be within the `[data-theme="dark"]` or `[data-theme="light"]` variable definition blocks only.

- [ ] **Step 3: Commit any fixes if needed and add .superpowers to .gitignore**

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: add .superpowers to gitignore"
```
