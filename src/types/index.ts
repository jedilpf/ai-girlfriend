export interface Character {
  id: string
  name: string
  mbti: string
  tagline: string
  greeting: string
  personality: string
  speechStyle: string
  color: string
}

export interface Affection {
  level: number
  interactions: number
  lastChat: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
