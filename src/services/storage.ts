import type { Message, Affection } from '../types'

const DB_NAME = 'ai-girlfriend-db'
const DB_VERSION = 1

function getStoreName(charId: string) {
  return `chat_${charId}`
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('affection')) {
        db.createObjectStore('affection', { keyPath: 'characterId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getMessages(charId: string): Promise<Message[]> {
  const db = await openDB()
  const storeName = getStoreName(charId)
  if (!db.objectStoreNames.contains(storeName)) return []
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result.sort((a: Message, b: Message) => a.timestamp.localeCompare(b.timestamp)))
    req.onerror = () => reject(req.error)
  })
}

export async function saveMessage(charId: string, msg: Message): Promise<void> {
  const db = await openDB()
  const storeName = getStoreName(charId)
  if (!db.objectStoreNames.contains(storeName)) {
    db.createObjectStore(storeName, { keyPath: 'id' })
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(msg)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAffection(charId: string): Promise<Affection> {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('affection', 'readonly')
    const req = tx.objectStore('affection').get(charId)
    req.onsuccess = () => {
      resolve(req.result || { characterId: charId, level: 50, interactions: 0, lastChat: new Date().toISOString() })
    }
    req.onerror = () => resolve({ characterId: charId, level: 50, interactions: 0, lastChat: new Date().toISOString() })
  })
}

export async function updateAffection(charId: string, delta: number): Promise<Affection> {
  const current = await getAffection(charId)
  const updated = {
    ...current,
    level: Math.max(0, Math.min(100, current.level + delta)),
    interactions: current.interactions + 1,
    lastChat: new Date().toISOString(),
  }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('affection', 'readwrite')
    tx.objectStore('affection').put(updated)
    tx.oncomplete = () => resolve(updated)
    tx.onerror = () => reject(tx.error)
  })
}
