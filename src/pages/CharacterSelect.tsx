import { characters } from '../data/characters'
import type { Character } from '../types'

interface Props {
  onSelect: (char: Character) => void
}

export function CharacterSelect({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-6 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold text-white mb-2">AI Girlfriend</h1>
      <p className="text-gray-400 mb-8">选择你的专属 AI 女友</p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {characters.map((char) => (
          <button
            key={char.id}
            onClick={() => onSelect(char)}
            className="relative p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: char.color + '60',
              background: `linear-gradient(135deg, ${char.color}20, ${char.color}10)`,
            }}
          >
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: char.color }}
            >
              {char.name[0]}
            </div>
            <h3 className="text-white font-semibold text-lg">{char.name}</h3>
            <p className="text-gray-400 text-sm">{char.mbti}</p>
            <p className="text-gray-500 text-xs mt-1">{char.tagline}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
