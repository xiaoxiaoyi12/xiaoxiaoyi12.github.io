---
title: "飞书 MCP Server 集成"
date: 2026-03-23
category: "工具"
tags: [Feishu, MCP, Claude Code]
---

## 概述

飞书 MCP Server 让 Claude Code 能够直接读写飞书云文档，支持创建文档、更新内容、搜索文档、添加评论等操作，实现 AI 与飞书知识库的无缝交互。

## 关键知识点

- **核心工具**：
  - `fetch-doc`：获取飞书文档内容（返回 Markdown 格式）
  - `create-doc`：从 Markdown 创建新文档，支持飞书扩展语法（分栏、高亮块、画板等）
  - `update-doc`：更新文档，支持 overwrite、append、replace_range 等 7 种模式
  - `search-doc`：搜索飞书文档
  - `add-comments`：为文档添加评论
- **飞书扩展语法**：支持 callout 高亮块、grid 分栏、lark-table 增强表格、mermaid 画板等
- **文档定位**：支持通过文档 URL 或 doc_id 定位文档
- **实践要点**：
  - 正文开头不要重复 title 标题
  - 图片/文件仅支持 url 属性，不支持 token
  - 长文档建议分段写入，配合 append 模式

## 参考链接

- 飞书开放平台文档：https://open.feishu.cn/
