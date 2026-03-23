---
title: "Claude Code Skill 开发指南"
date: 2026-03-23
category: "AI 工具"
tags: [Claude Code, Skill, Automation]
---

## 概述

Claude Code Skill 是一种自定义技能机制，允许用户通过编写 `SKILL.md` 文件来扩展 Claude Code 的能力。技能可以通过 `/skill-name` 的方式在对话中触发。

## 关键知识点

### 文件结构

技能文件存放在 `~/.claude/skills/<skill-name>/SKILL.md`，使用 YAML frontmatter + Markdown 正文格式：

```yaml
---
name: skill-name
description: 技能描述
version: 1.0.0
---
```

### 核心要素

1. **参数解析**：通过 `$ARGUMENTS` 接收用户传入的参数
2. **流程设计**：按步骤组织执行逻辑，每步职责清晰
3. **工具调用**：在 Markdown 中描述何时使用哪些工具（Read、Edit、Bash、AskUserQuestion 等）
4. **输出格式**：定义结构化的输出模板，保证一致性
5. **交互规则**：明确交互原则和边界条件

### 设计原则

- 单一职责：每个 Skill 聚焦一件事
- 参数灵活：支持多种输入方式，有合理的默认行为
- 输出结构化：使用模板确保输出格式统一
- 交互友好：适时询问用户，不做不确定的自动操作

### 实践：代码审查 Skill

创建了 `/review` 技能，支持：
- 多种审查范围：git diff、staged、commit、指定文件
- 自动检测项目技术栈
- 6 大审查维度：安全漏洞、冗余代码、拼写错误、格式问题、代码质量、前端专项
- 分级输出报告（严重/可修复/建议）
- 确认后自动修复可修复项

## 参考链接

- [Claude Code 官方文档](https://docs.anthropic.com/en/docs/claude-code)
