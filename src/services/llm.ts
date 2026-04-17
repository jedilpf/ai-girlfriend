import type { Message } from '../types'

const API_URL = '/api/chat'
const MODEL = 'qwen3.6-plus'

export async function chat(messages: Message[], systemPrompt: string): Promise<{ reply: string; affectionDelta: number }> {
  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ]

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: apiMessages, max_tokens: 500, temperature: 0.8 }),
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)

  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? '...'

  // 解析好感度变化 [affection:+N]
  const match = content.match(/\[affection:([+-]?\d+)\]/)
  const delta = match ? parseInt(match[1]) : 1 // 兜底：默认 +1

  // 从回复中移除标记
  const reply = content.replace(/\[affection:[+-]?\d+\]/g, '').trim()

  return { reply, affectionDelta: delta }
}
