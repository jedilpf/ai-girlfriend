// TTS 服务：优先用浏览器 SpeechSynthesis，ElevenLabs 后续接入
export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('TTS not supported'))
      return
    }
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'zh-CN'
    utter.rate = 1.0
    utter.pitch = 1.1
    utter.onend = () => resolve()
    utter.onerror = () => reject(new Error('TTS error'))
    window.speechSynthesis.speak(utter)
  })
}
