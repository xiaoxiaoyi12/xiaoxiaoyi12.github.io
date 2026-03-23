---
title: "Superpowers 技能系统"
date: 2026-03-23
category: "工具"
tags: [Claude Code, Superpowers, Skills]
---

## 概述

Superpowers 是 Claude Code 的技能扩展系统，通过定义 skill 文件为 Claude 提供结构化的工作流指导，覆盖头脑风暴、TDD、调试、代码评审、计划编写等开发环节。

## 关键知识点

- **技能调用机制**：通过 `Skill` 工具加载技能内容，技能内容会作为上下文指导 Claude 的行为
- **技能优先级**：用户指令 > Superpowers 技能 > 默认系统提示
- **技能分类**：
  - 流程类（brainstorming、debugging）：决定如何处理任务
  - 实现类（frontend-design、mcp-builder）：指导具体执行
- **核心技能**：
  - `brainstorming`：创建功能前的需求探索
  - `test-driven-development`：TDD 工作流
  - `systematic-debugging`：系统化调试
  - `writing-plans`：编写实施计划
  - `verification-before-completion`：完成前验证

## 参考链接

- Superpowers 技能文件位于 `~/.claude/skills/` 目录下
