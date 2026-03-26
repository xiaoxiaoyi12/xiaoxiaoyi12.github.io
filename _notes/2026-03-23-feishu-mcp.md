---
title: "飞书 MCP Server 集成"
date: 2026-03-23
category: "工具"
tags: [Feishu, MCP, Claude Code]
---

## 概述

MCP（Model Context Protocol）是一种让 AI 工具连接外部服务的协议。通过配置**飞书 MCP Server**，Claude Code 可以直接读写飞书云文档，不需要你在 Claude 和飞书之间来回复制粘贴。

这篇笔记记录了 MCP 的基本概念、飞书 MCP 的核心工具，以及实际使用中的注意事项。

---

## 什么是 MCP？

先打个比方：

- **Claude Code** 就像一个很聪明的助手，但它默认只能操作你电脑上的文件
- **MCP Server** 就像给助手装了一个"遥控器"，让它能操作飞书、数据库、Slack 等外部服务
- **MCP 协议** 就是这个"遥控器"的通信标准，定义了怎么连接、怎么调用

```
你 ←→ Claude Code ←→ MCP Server ←→ 飞书 API ←→ 飞书文档
```

有了飞书 MCP Server，你可以这样用：

```
你：帮我把这段会议纪要写到飞书文档里
Claude：（自动调用飞书 MCP，创建/更新文档）
```

---

## 飞书 MCP 的核心工具

飞书 MCP Server 提供了以下工具，Claude 会根据需要自动调用：

### 1. fetch-doc — 读取文档

**作用**：获取飞书文档的内容，返回 Markdown 格式。

**使用场景**：
- "帮我看一下这个飞书文档的内容"
- "总结一下这篇文档的要点"

**参数**：
- `doc_id`：文档 ID 或文档 URL（支持直接粘贴飞书链接）

**示例**：
```
你：帮我看看这个文档 https://mi.feishu.cn/docx/KFT1d...
Claude：（调用 fetch-doc，获取内容，返回给你）
```

### 2. create-doc — 创建文档

**作用**：从 Markdown 内容创建一个新的飞书文档。

**使用场景**：
- "帮我把这段内容发布到飞书"
- "创建一个新的飞书文档，标题是……"

**参数**：
- `title`：文档标题
- `markdown`：文档正文（支持飞书扩展语法）
- `wiki_node` / `wiki_space` / `folder_token`：放在哪里（三选一）

### 3. update-doc — 更新文档

**作用**：更新已有文档的内容，支持 7 种更新模式。

**7 种模式详解**：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `overwrite` | 清空文档后重写 | 需要完全重建文档（慎用！会丢失图片和评论） |
| `append` | 在文档末尾追加 | 添加新章节、补充内容 |
| `replace_range` | 定位并替换一段内容 | 修改某个章节 |
| `replace_all` | 全文查找替换 | 批量修改关键词 |
| `insert_before` | 在定位点之前插入 | 在某段落前添加内容 |
| `insert_after` | 在定位点之后插入 | 在某段落后添加内容 |
| `delete_range` | 删除一段内容 | 移除某个章节 |

**最佳实践**：优先使用局部更新（append / replace_range / insert），避免 overwrite。因为 overwrite 会丢失图片、评论、协作历史等信息。

### 4. search-doc — 搜索文档

**作用**：在飞书中搜索文档。

**使用场景**：
- "帮我找一下关于 Q2 计划的飞书文档"
- "我最近编辑过的文档有哪些"

### 5. add-comments — 添加评论

**作用**：给文档添加评论（全文评论，不是划词评论）。

**支持的内容类型**：
- 纯文本
- @某人（需要先通过 search-user 获取 open_id）
- 超链接

---

## 飞书扩展 Markdown 语法

创建和更新文档时，除了标准 Markdown 语法，飞书还支持一些扩展语法：

### 高亮块（Callout）

```html
<callout emoji="💡" background-color="light-blue">
这是一个提示信息
</callout>
```

常用组合：
- 💡 `light-blue` — 提示信息
- ⚠️ `light-yellow` — 警告
- ❌ `light-red` — 危险/错误
- ✅ `light-green` — 成功/通过

### 分栏（Grid）

```html
<grid cols="2">
<column width="50">

左侧内容

</column>
<column width="50">

右侧内容

</column>
</grid>
```

注意：`width` 是百分比，所有列加起来必须等于 100。

### Mermaid 图表

```markdown
​```mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[执行]
    B -->|否| D[跳过]
​```
```

飞书会自动把 Mermaid 代码渲染成可视化的画板。

### @人和提及文档

```html
<!-- @某人（需要先获取 open_id） -->
<mention-user id="ou_xxx"/>

<!-- 引用另一个文档 -->
<mention-doc token="xxx" type="docx">文档标题</mention-doc>
```

---

## 使用中的注意事项

### 1. 正文不要重复标题

```markdown
# ❌ 错误：title 已经是"项目计划"了，正文又写一遍
---
title: 项目计划
---
# 项目计划       ← 这行多余，删掉

## 第一章
...
```

### 2. 图片和文件只支持 URL

```html
<!-- ✅ 正确：用 URL -->
<image url="https://example.com/pic.png"/>

<!-- ❌ 错误：用 token -->
<image token="boxcnXXXX"/>
```

### 3. 长文档要分段写入

如果文档内容很长（超过几千字），一次性写入可能超时。建议：
1. 先用 `create-doc` 创建文档骨架
2. 再用 `update-doc` 的 `append` 模式分段追加内容

### 4. @人之前必须先搜索

不能直接写 `@张三`，必须先调用 `search-user` 获取对方的 `open_id`，然后用 `<mention-user id="ou_xxx"/>` 来 @。

---

## 参考

- [飞书开放平台文档](https://open.feishu.cn/)
- [MCP 协议规范](https://modelcontextprotocol.io/)
