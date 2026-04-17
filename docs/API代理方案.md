# Vercel Edge Function API 代理

> 最薄的后端：Vercel Serverless Function 转发请求
> 解决两个问题：1) API Key 不暴露  2) CORS 问题

---

## 架构

```
浏览器 (PWA)
    ↓ fetch('/api/chat')
Vercel Edge Function (serverless)
    ↓ 注入 API Key, 转发请求
通义 DashScope / DeepSeek API
    ↓ 返回结果
Vercel Edge Function
    ↓ 返回给前端
浏览器
```

## 文件位置

```
ai-girlfriend/
├── src/                    # 前端代码
└── api/                    # Vercel Serverless Functions
    └── chat/
        └── index.ts        # 代理路由
```

## 代码

### api/chat/index.ts

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, model = 'qwen-plus' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // API Key 从环境变量读取，不暴露给前端
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 前端调用方式

```typescript
// 之前（不安全）：直接调通义 API
// const response = await fetch('https://dashscope.aliyuncs.com/...', {
//   headers: { Authorization: `Bearer ${API_KEY}` } // ❌ Key 暴露！
// });

// 现在（安全）：调自己的 Edge Function
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userInput },
    ],
    model: 'qwen-plus',
  }),
});
```

## 环境变量配置

在 Vercel 项目设置中添加：
- `DASHSCOPE_API_KEY` = 你的通义 API Key
- `ELEVENLABS_API_KEY` = 你的 ElevenLabs API Key（TTS 代理同理）

## 部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 部署
vercel --prod

# 3. 设置环境变量
vercel env add DASHSCOPE_API_KEY
```

部署后前端访问你的 Vercel 域名即可，Edge Function 自动处理路由。

## TTS 代理（同理）

```typescript
// api/tts/index.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, voiceId } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_128',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    // 返回音频流
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

## 成本

- Vercel Hobby 计划：免费，每月 100GB 带宽，足够 Demo 使用
- Serverless Function 调用：免费额度内

## 安全增强（后续）

- [ ] 加 rate limiting（防止刷接口）
- [ ] 加简单的 token 验证
- [ ] 加请求体大小限制
- [ ] 加内容安全过滤（output filter）
