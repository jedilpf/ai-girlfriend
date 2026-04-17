import { useState, useEffect } from 'react'
import { CharacterSelect } from './pages/CharacterSelect'
import { Chat } from './pages/Chat'
import type { Character } from './types'

function App() {
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('selectedCharacter')
    if (saved) {
      try {
        setSelectedChar(JSON.parse(saved))
      } catch { /* ignore */ }
    }
  }, [])

  const handleSelect = (char: Character) => {
    setSelectedChar(char)
    localStorage.setItem('selectedCharacter', JSON.stringify(char))
  }

  const handleBack = () => {
    setSelectedChar(null)
    localStorage.removeItem('selectedCharacter')
  }

  if (selectedChar) {
    return <Chat character={selectedChar} onBack={handleBack} />
  }

  return <CharacterSelect onSelect={handleSelect} />
}

export default App
