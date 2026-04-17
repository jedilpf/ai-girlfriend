# AI Girlfriend - AI 交接文档

> 给下一个接手这个项目的 AI 看的。

---

## 项目现状

**仓库：** https://github.com/jedilpf/ai-girlfriend
**线上地址：** https://ai-girlfriend-ochre.vercel.app
**技术栈：** React + TypeScript + Vite + Tailwind CSS v4
**后端：** Vercel Edge Function 代理（api/chat/index.ts）
**AI 模型：** 通义 DashScope qwen3.6-plus
**存储：** IndexedDB（聊天记录 + 好感度）
**语音：** 浏览器 SpeechSynthesis API

## 已完成的功能

- ✅ 4 个角色选择页（小暖 ENFJ、傲娇 INTP、元气 ESFP、御姐 INTJ）
- ✅ 聊天界面（消息气泡、打字效果）
- ✅ AI 对话（通过 Vercel Edge Function 代理调通义 API）
- ✅ 好感度系统（LLM 返回 [affection:+N] 标记，前端解析）
- ✅ IndexedDB 按角色隔离存储
- ✅ 浏览器 TTS 语音回复
- ✅ Loading 状态（"正在输入..."）
- ✅ 错误状态提示
- ✅ 部署到 Vercel（含环境变量）

## 待做事项（按优先级）

### P1 - 体验优化

**1. 双击奖励机制**
- 位置：`src/pages/Chat.tsx`
- 功能：双击 AI 消息弹出奖励选项（"摸头"/"抱抱"/"夸奖"）
- 奖励后好感度 +3
- 首次进入聊天弹引导："双击消息可以夸她哦～"

**2. 语音输入引导**
- 位置：输入栏旁边加 🎤 图标
- 点击后提示："长按麦克风使用输入法语音输入"
- 首次使用弹引导

**3. 好感度可视化**
- 位置：顶部栏
- 显示好感度进度条（0-100）
- 根据好感度改变颜色

### P2 - 内容扩展

**4. 剩余 12 个 MBTI 角色**
- 位置：`src/data/characters.ts`
- 补充剩余 12 种人格（ISTJ, ISFJ, INFJ, ISTP, ISFP, INFP, ENTP, ENTJ, ENFJ 已有, ESFJ, ESTP, ESTJ）
- 每种人格需要有独特的性格描述和说话风格

**5. 角色立绘**
- 用 ComfyUI 生成每个角色的立绘
- 好感度不同，表情不同（冷淡/友好/亲密/依恋）
- 替换 `avatar` 字段的占位图

### P3 - 高级功能

**6. 记忆系统**
- 记住用户的名字、喜好
- 对话中会提到之前聊过的内容
- 在 system prompt 中注入用户信息

**7. 主动发消息（模拟）**
- 打开页面时模拟收到消息（"早安"/"在干嘛"）
- 根据好感度决定主动发消息的频率

**8. ElevenLabs TTS**
- 替换浏览器 SpeechSynthesis
- 通过 Vercel Edge Function 代理调用
- 手动播放模式（点喇叭图标）

## 环境变量（Vercel）

```
DASHSCOPE_API_KEY = sk-sp-819495c080484aa087c28d6d31495709
DASHSCOPE_API_URL = https://coding.dashscope.aliyuncs.com/v1/chat/completions
DASHSCOPE_MODEL = qwen3.6-plus
```

## 关键代码结构

```
api/chat/index.ts          ← Vercel Edge Function 代理
src/App.tsx                ← 主应用（角色选择/聊天切换）
src/pages/CharacterSelect.tsx  ← 角色选择页
src/pages/Chat.tsx             ← 聊天页（核心逻辑）
src/data/characters.ts     ← 角色数据
src/services/llm.ts        ← API 调用 + 好感度标记解析
src/services/storage.ts    ← IndexedDB 封装
src/services/tts.ts        ← 语音合成
```

## 注意事项

1. API 调用必须通过 Edge Function 代理，不能前端直调
2. 好感度变化通过 LLM 回复末尾的 `[affection:+N]` 标记解析
3. 如果没解析到标记，兜底默认 +1
4. IndexedDB 按角色 ID 建独立 store（`chat_${characterId}`）
5. 部署用 `vercel --prod --token <token> --yes`
