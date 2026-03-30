---
title: "OpenAI 兼容 API 流式输出（SSE Streaming）实践"
date: 2026-03-30
category: "AI"
tags: [OpenAI, SSE, Streaming, React, DeepSeek]
---

## 概述

在前端应用中集成 AI 对话功能，使用 OpenAI 兼容的 `/v1/chat/completions` 接口格式，通过 Server-Sent Events（SSE）实现流式输出，让 AI 回复逐字显示而非等待完整响应。该格式被 DeepSeek、通义千问等多家 API 提供商兼容，只需切换 Base URL 和 API Key 即可。

## 核心知识点

### 1. OpenAI 兼容格式

所有兼容 OpenAI 格式的 API 提供商共享同一个接口规范：

```
POST ${baseUrl}/v1/chat/completions
```

请求体关键字段：
- `model` — 模型名称（如 `deepseek-chat`、`gpt-4o`、`qwen-turbo`）
- `messages` — 消息数组，每条包含 `role`（system/user/assistant）和 `content`
- `stream: true` — 启用流式输出

### 2. SSE 流式解析

当 `stream: true` 时，响应为 `text/event-stream` 格式，每行以 `data: ` 开头：

```
data: {"choices":[{"delta":{"content":"你"},"index":0}]}
data: {"choices":[{"delta":{"content":"好"},"index":0}]}
data: [DONE]
```

前端解析流程：
1. 使用 `fetch` 发请求，获取 `response.body`（ReadableStream）
2. 通过 `getReader()` + `TextDecoder` 逐块读取
3. 按行分割，过滤 `data: ` 前缀
4. 遇到 `[DONE]` 标记结束
5. 解析 JSON，提取 `choices[0].delta.content`

### 3. AsyncGenerator 封装

使用 `async function*` 将 SSE 解析封装为异步生成器，调用方可用 `for await...of` 消费：

```typescript
async function* chatStream(
  config: { baseUrl: string; apiKey: string; model: string },
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model: config.model, messages, stream: true }),
    signal,
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return
      const json = JSON.parse(data)
      const content = json.choices?.[0]?.delta?.content
      if (content) yield content
    }
  }
}
```

### 4. React 中的流式渲染

在 React 组件中消费流式输出的模式：

```typescript
// 先添加空的 assistant 消息占位
setMessages(prev => [...prev, { role: 'assistant', content: '' }])

// 逐 chunk 更新最后一条消息
let full = ''
for await (const chunk of chatStream(config, msgs, signal)) {
  full += chunk
  setMessages(prev => {
    const next = [...prev]
    next[next.length - 1] = { role: 'assistant', content: full }
    return next
  })
}
```

### 5. AbortController 取消请求

使用 `AbortController` 支持用户手动停止生成：

```typescript
const controller = new AbortController()
// 传入 signal
chatStream(config, msgs, controller.signal)
// 停止时
controller.abort()
```

### 6. 多提供商切换

只需更换三个配置即可切换 AI 提供商：

| 提供商 | Base URL | 示例模型 |
|--------|----------|----------|
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| OpenAI | `https://api.openai.com` | `gpt-4o` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode` | `qwen-turbo` |

## 注意事项

- SSE 响应中可能一个 chunk 包含多行 `data:`，需要按行分割处理
- `TextDecoder` 的 `{ stream: true }` 选项确保多字节字符不被截断
- buffer 机制处理不完整行（数据可能跨 chunk 分割）
- 流式请求的错误需要检查 HTTP 状态码（如 402 余额不足），在开始读取 stream 之前处理

## 参考

- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create)
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [DeepSeek API 文档](https://platform.deepseek.com/api-docs)
