import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, Message, Affection } from '../types'
import { chat } from '../services/llm'
import { speak } from '../services/tts'
import { getMessages, saveMessage, getAffection, updateAffection } from '../services/storage'

interface Props {
  character: Character
  onBack: () => void
}

export function Chat({ character, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setloading] = useState(false)
  const [affection, setAffection] = useState<Affection>({ characterId: character.id, level: 50, interactions: 0, lastChat: new Date().toISOString() })
  const [error, setError] = useState('')
  const [rewardModal, setRewardModal] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const lastTapTime = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 加载历史
  useEffect(() => {
    getMessages(character.id).then((msgs) => {
      setMessages(msgs)
      // 首次聊天显示引导
      if (msgs.length === 0) {
        setShowGuide(true)
        setTimeout(() => setShowGuide(false), 4000)
      }
    }).catch(console.error)
    getAffection(character.id).then(setAffection).catch(console.error)
  }, [character.id])

  // 滚动到底
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 好感度等级
  const getAffectionLabel = (level: number) => {
    if (level < 50) return '陌生'
    if (level < 70) return '熟悉'
    if (level < 90) return '亲密'
    return '❤️ 依恋'
  }

  const getAffectionColor = (level: number) => {
    if (level < 50) return 'text-gray-500'
    if (level < 70) return 'text-green-400'
    if (level < 90) return 'text-pink-400'
    return 'text-red-400'
  }

  // 发送消息
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setError('')

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    saveMessage(character.id, userMsg).catch(console.error)
    setInput('')
    setloading(true)

    try {
      // 构建 system prompt
      const systemPrompt = `你是一个叫${character.name}的女孩，MBTI 人格是${character.mbti}。
性格：${character.personality}
说话风格：${character.speechStyle}
当前好感度：${affection.level}/100，你们聊了${affection.interactions}次。
好感度低于50时保持距离感，50-70友好但不主动，70-90开始关心日常，90以上会撒娇。
用中文回复，每次1-3句话，像真人一样，可以适当用emoji，不要说自己是AI。
重要：在回复最后用方括号标记好感度变化，如[affection:+1]或[affection:+3]或[affection:-2]，不需要变化就写[affection:0]。`

      const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }))
      const { reply, affectionDelta } = await chat(history, systemPrompt)

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, aiMsg])
      saveMessage(character.id, aiMsg).catch(console.error)

      const newAffection = await updateAffection(character.id, affectionDelta)
      setAffection(newAffection)

      // TTS 语音
      speak(reply).catch(() => {})
    } catch (e) {
      setError('网络异常，请重试')
      console.error(e)
    } finally {
      setloading(false)
    }
  }, [character, messages, loading, affection])

  const handleSend = () => sendMessage(input)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 双击奖励
  const handleMessageTap = (msgId: string) => {
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
      // 双击
      setRewardModal(msgId)
    }
    lastTapTime.current = now
  }

  // 发送奖励
  const handleReward = async (type: string) => {
    setRewardModal(null)
    if (loading) return
    setError('')

    const rewardText = type === 'pat' ? '👋 摸了摸头' : type === 'hug' ? '🤗 抱了抱' : '💕 夸了夸'
    const delta = type === 'pat' ? 2 : type === 'hug' ? 3 : 2

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `${character.name}，${rewardText}～`,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    saveMessage(character.id, userMsg).catch(console.error)

    try {
      const systemPrompt = `你是${character.name}，被用户${rewardText}了。开心回应，像真人一样撒娇或害羞，1-2句话。`
      const { reply, affectionDelta } = await chat([], systemPrompt)

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `${rewardText} → ${reply}`,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      saveMessage(character.id, aiMsg).catch(console.error)

      const totalDelta = delta + affectionDelta
      const newAffection = await updateAffection(character.id, totalDelta)
      setAffection(newAffection)
    } catch (e) {
      const newAffection = await updateAffection(character.id, delta)
      setAffection(newAffection)
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `${rewardText} → 脸红了...谢谢～`,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
    }
  }

  // 朗读语音
  const handleSpeak = async (text: string) => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    try {
      await speak(text)
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e]">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-[#16213e]">
        <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: character.color }}
        >
          {character.name[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-white font-semibold">{character.name}</h2>
          <p className={`text-xs ${getAffectionColor(affection.level)}`}>
            {getAffectionLabel(affection.level)} · {affection.level}
          </p>
        </div>
        {/* 好感度进度条 */}
        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${affection.level}%`,
              background: affection.level < 50 ? '#6b7280' : affection.level < 70 ? '#22c55e' : affection.level < 90 ? '#ec4899' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 问候语 */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">{character.greeting}</p>
          </div>
        )}

        {/* 首次引导 */}
        {showGuide && (
          <div className="text-center py-2">
            <div className="inline-block bg-[#2a2a4a] text-gray-400 text-xs px-3 py-1 rounded-full">
              💡 双击消息可以夸她哦～
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              onDoubleClick={() => msg.role === 'assistant' && handleMessageTap(msg.id)}
              className="max-w-[75%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap relative group cursor-pointer select-none"
              style={{
                background: msg.role === 'user' ? character.color : '#2a2a4a',
                color: msg.role === 'user' ? '#fff' : '#e0e0e0',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '20px',
              }}
            >
              {msg.content}
              {/* 语音朗读按钮 */}
              {msg.role === 'assistant' && (
                <button
                  onClick={() => handleSpeak(msg.content)}
                  className="absolute -right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title="朗读"
                >
                  {speaking ? '⏹️' : '🔊'}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-2xl bg-[#2a2a4a] text-gray-400 text-sm">
              正在输入...
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-400 text-sm">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入栏 */}
      <div className="p-4 border-t border-gray-800 bg-[#16213e]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 bg-[#2a2a4a] text-white px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-5 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: character.color }}
          >
            发送
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-2">🎤 长按输入法语音 · 双击消息夸她</p>
      </div>

      {/* 奖励弹窗 */}
      {rewardModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center pb-20 z-50" onClick={() => setRewardModal(null)}>
          <div className="bg-[#2a2a4a] rounded-2xl p-4 w-full max-w-sm mx-4 space-y-3">
            <p className="text-white text-center font-semibold">怎么夸她？</p>
            <button
              onClick={() => handleReward('pat')}
              className="w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-blue-500 to-blue-600 active:scale-95 transition-transform"
            >
              👋 摸头
            </button>
            <button
              onClick={() => handleReward('hug')}
              className="w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-pink-500 to-pink-600 active:scale-95 transition-transform"
            >
              🤗 抱抱
            </button>
            <button
              onClick={() => handleReward('praise')}
              className="w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-purple-500 to-purple-600 active:scale-95 transition-transform"
            >
              💕 夸夸
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
