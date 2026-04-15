---
title: "Claude Code Skills 机制学习"
date: 2026-03-19
category: "Claude Code"
tags: [Claude Code, Jekyll, GitHub Pages]
---

## 概述

Claude Code 是 Anthropic 推出的一个命令行 AI 编程助手。它不仅能回答问题，还能直接读写文件、运行命令、操作 Git 等。而 **Skills（技能）** 是 Claude Code 的一个扩展机制，让你可以自定义可复用的命令，像用快捷方式一样调用复杂的工作流。

这篇笔记记录了 Skills 的基本机制，以及同时学到的 Jekyll 博客部署知识。

---

## 什么是 Claude Code Skills？

简单来说，Skill 就是一个 **预定义的 prompt 模板**。你写好一个 `.md` 文件，描述你希望 Claude 做什么，然后通过 `/命令名` 的方式一键触发。

**举个例子**：你经常需要让 Claude 帮你写日志，每次都要描述一遍格式和规则。有了 Skill，你只需要输入 `/daily-log`，Claude 就会按照你预设的规则自动执行。

### 没有 Skill 的时候

```
你：帮我写今天的日志，格式是这样的……放在 _posts 目录下……文件名是……
Claude：好的，让我来处理……
```

### 有了 Skill 之后

```
你：/daily-log
Claude：（自动按照预设规则执行所有步骤）
```

---

## Skills 的文件结构

### 存放位置

Skills 文件可以放在两个地方：

| 位置 | 作用域 | 路径 |
|------|--------|------|
| 项目级 | 只在当前项目生效 | `项目根目录/.claude/commands/skill-name.md` |
| 用户级 | 所有项目都生效 | `~/.claude/skills/skill-name/SKILL.md` |

### 文件格式

每个 Skill 就是一个 Markdown 文件，开头用 YAML frontmatter 声明元信息：

```markdown
---
name: daily-log
description: 记录当日的工作和学习内容
---

你是一个日志记录助手。请帮用户记录当日的工作内容……

## 操作流程

### 第一步：检查今天的日志是否已存在
1. 用 Glob 查找……

### 第二步：收集内容
- 如果用户提供了内容……
```

**关键点**：
- `name`：技能名称，也是触发命令名
- `description`：描述这个技能做什么，Claude 会根据描述判断是否需要使用
- 正文部分就是详细的 prompt，告诉 Claude 具体怎么做

### 参数传递

用户调用时可以传参数，在 Skill 中用 `$ARGUMENTS` 接收：

```
用户输入：/daily-log 完成了登录模块重构
```

Skill 文件中可以这样引用：

```markdown
如果用户通过 $ARGUMENTS 提供了内容，解析并填入对应分类
```

---

## Skills 的工作原理

当你输入 `/skill-name` 时，发生了什么？

```
你输入 /daily-log
      ↓
Claude Code 查找对应的 Skill 文件
      ↓
读取 SKILL.md 的内容，作为 prompt 注入到对话中
      ↓
Claude 按照 prompt 中的指令一步步执行
      ↓
调用各种工具（读文件、写文件、运行命令等）完成任务
```

**本质上，Skill 就是一个自动注入的超长 prompt**。它不是什么魔法，只是帮你把复杂的指令提前写好，避免每次重复输入。

---

## Jekyll 博客部署基础

在学习 Skills 的过程中，同时搭建了基于 Jekyll 的 GitHub Pages 博客。

### 什么是 Jekyll？

Jekyll 是一个 **静态网站生成器**。你写 Markdown 文件，Jekyll 把它们转换成 HTML 网页。GitHub Pages 原生支持 Jekyll，意味着你只需要把 Markdown 文件推送到 GitHub，网站就自动生成了。

### 基本结构

```
xiaoxiaoyi12.github.io/
├── _config.yml          # 站点配置（主题、标题、URL 等）
├── _posts/              # 博客文章目录
│   └── 2026-03-19-daily-log.md
├── _notes/              # 学习笔记目录
├── _layouts/            # 页面布局模板
│   └── post.html
└── index.html           # 首页
```

### 文章命名规则

文章必须放在 `_posts/` 目录下，文件名格式严格要求：

```
YYYY-MM-DD-title.md
```

例如：`2026-03-19-daily-log.md`

如果文件名格式不对，Jekyll 不会识别它。

### Front Matter

每篇文章开头必须有 YAML 格式的元信息：

```yaml
---
layout: post           # 使用哪个布局模板
title: "文章标题"       # 文章标题
date: 2026-03-19       # 发布日期
tags: [tag1, tag2]     # 标签
---

这里是正文内容……
```

`---` 之间的部分叫 front matter，Jekyll 会读取这些信息来生成页面。

### 部署流程

```
你写好 Markdown 文件
      ↓
git push 到 GitHub（master 分支）
      ↓
GitHub Pages 检测到更新
      ↓
自动运行 Jekyll 构建
      ↓
生成 HTML 并部署
      ↓
访问 xxx.github.io 看到更新
```

整个过程是全自动的，你只需要 push 代码。

---

## 参考

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code)
- [Jekyll 官方文档](https://jekyllrb.com/docs/)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
