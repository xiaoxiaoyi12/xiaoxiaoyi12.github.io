---
title: "Claude Code Skills 机制学习"
date: 2026-03-19
category: "Claude Code"
tags: [Claude Code, Jekyll, GitHub Pages]
---

## 概述

Claude Code 支持自定义 skills/commands，可以通过配置文件定义可复用的交互命令。

## Skills 配置结构

- Skills 定义在项目的 `.claude/commands/` 目录下
- 每个 skill 是一个 `.md` 文件，文件名即命令名
- 文件内容为 prompt 模板，支持变量插值

## Jekyll 博客部署

- GitHub Pages 原生支持 Jekyll
- 推送到 `master` 分支即自动构建部署
- `_config.yml` 控制主题和站点配置
- `_posts/` 目录存放文章，命名格式 `YYYY-MM-DD-title.md`

## 参考

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code)
- [Jekyll 官方文档](https://jekyllrb.com/docs/)
