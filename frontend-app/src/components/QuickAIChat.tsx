import React, { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserTimeZone } from '../hooks/useUserTimeZone'
import { aiService } from '../services/aiService'
import { documentService } from '../services/documentService'
import { formatTime } from '../utils/datetime'
import { ChatMessage } from './ChatMessage'
import {
  type Message,
  type Thread,
  generateThreadTitle,
  getAIStorageKeys,
  getStoredMessages,
  getStoredThreads,
  notifyAIStorageUpdated,
} from '../utils/aiThreads'
import { QuickChatLogo } from './ui/QuickChatLogo'
import { Maximize2, Minimize2, Plus } from 'lucide-react'

type QuickChatSize = 'compact' | 'comfortable' | 'expanded'

const SIZE_CLASS: Record<QuickChatSize, string> = {
  compact: 'w-[min(90vw,340px)]',
  comfortable: 'w-[min(92vw,420px)]',
  expanded: 'w-[min(96vw,560px)]',
}

export const QuickAIChat: React.FC = () => {
  const { user } = useAuth()
  const timeZone = useUserTimeZone()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [panelSize, setPanelSize] = useState<QuickChatSize>('comfortable')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const storage = useMemo(() => getAIStorageKeys(user?.uid ?? null), [user?.uid])

  const appendAndPersist = (targetThreadId: string, nextMessages: Message[], prompt: string, previewSource: string) => {
    const nowIso = new Date().toISOString()

    const existingThreads = getStoredThreads(storage.threadsStorageKey)
    const idx = existingThreads.findIndex((t) => t.id === targetThreadId)
    const preview = previewSource.slice(0, 60) + (previewSource.length > 60 ? '...' : '')

    let updatedThreads: Thread[]
    if (idx >= 0) {
      updatedThreads = [...existingThreads]
      updatedThreads[idx] = {
        ...updatedThreads[idx],
        title: updatedThreads[idx].title || generateThreadTitle(prompt),
        timestamp: nowIso,
        preview,
        messages: nextMessages,
      }
    } else {
      updatedThreads = [
        {
          id: targetThreadId,
          title: generateThreadTitle(prompt),
          timestamp: nowIso,
          preview,
          messages: nextMessages,
          projectId: null,
        },
        ...existingThreads,
      ]
    }

    localStorage.setItem(storage.threadsStorageKey, JSON.stringify(updatedThreads))
    localStorage.setItem(`${storage.storageKey}_${targetThreadId}`, JSON.stringify(nextMessages))
    localStorage.setItem(storage.threadStorageKey, targetThreadId)
    notifyAIStorageUpdated(targetThreadId)
  }

  const ensureThread = () => {
    if (threadId) return threadId
    const nextId = Date.now().toString()
    setThreadId(nextId)
    localStorage.setItem(storage.threadStorageKey, nextId)
    return nextId
  }

  const handleNewChat = () => {
    const nextId = Date.now().toString()
    setThreadId(nextId)
    setMessages([])
    localStorage.setItem(storage.threadStorageKey, nextId)
    notifyAIStorageUpdated(nextId)
  }

  const handleSend = async () => {
    if (!user || sending) return
    const text = input.trim()
    if (!text) return

    const activeThreadId = ensureThread()
    const userMessage: Message = {
      role: 'user',
      text,
      time: formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' }),
    }

    setInput('')
    setSending(true)
    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await aiService.sendMessage(text)
      const assistantMessage: Message = {
        role: 'assistant',
        text: response.response,
        time: formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => {
        const nextMessages = [...prev, assistantMessage]
        appendAndPersist(activeThreadId, nextMessages, text, response.response)
        return nextMessages
      })
    } catch (error: unknown) {
      const errorText = `Error: ${error instanceof Error ? error.message : 'Unable to process request.'}`
      const assistantMessage: Message = {
        role: 'assistant',
        text: errorText,
        time: formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => {
        const nextMessages = [...prev, assistantMessage]
        appendAndPersist(activeThreadId, nextMessages, text, errorText)
        return nextMessages
      })
    } finally {
      setSending(false)
    }
  }

  const handleUpload = async (file: File) => {
    if (!user || uploading) return
    const activeThreadId = ensureThread()
    setUploading(true)
    try {
      await documentService.upload(file)
      const noteUser = `Uploaded file: ${file.name}`
      const noteAssistant = `File uploaded successfully. It is now available in AI Assistant documents.`
      const userMessage: Message = {
        role: 'user',
        text: noteUser,
        time: formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' }),
      }
      const assistantMessage: Message = {
        role: 'assistant',
        text: noteAssistant,
        time: formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => {
        const nextMessages = [...prev, userMessage, assistantMessage]
        appendAndPersist(activeThreadId, nextMessages, noteUser, noteAssistant)
        return nextMessages
      })
    } catch (error: unknown) {
      const err = `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      const assistantMessage: Message = {
        role: 'assistant',
        text: err,
        time: formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => {
        const nextMessages = [...prev, assistantMessage]
        appendAndPersist(activeThreadId, nextMessages, `Upload ${file.name}`, err)
        return nextMessages
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleOpen = () => {
    setOpen((prev) => {
      const nextOpen = !prev
      if (nextOpen && user && !threadId) {
        const savedThreadId = localStorage.getItem(storage.threadStorageKey)
        if (savedThreadId) {
          setThreadId(savedThreadId)
          const saved = getStoredMessages(storage.storageKey, savedThreadId)
          if (saved.length > 0) setMessages(saved.slice(-8))
        }
      }
      return nextOpen
    })
  }

  if (!user) return null

  return (
    <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className={`${SIZE_CLASS[panelSize]} rounded-2xl border border-white/15 bg-bg-secondary/95 backdrop-blur-xl shadow-2xl overflow-hidden`}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <QuickChatLogo size={28} />
              <div>
                <p className="text-sm font-semibold text-text-primary mb-0 leading-tight">Quick AI Chat</p>
                <p className="text-[11px] text-text-muted mb-0 leading-tight">Synced with AI Assistant threads</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewChat}
                className="p-1.5 rounded-md border border-white/10 bg-white/5 text-text-muted hover:text-text-primary hover:bg-white/10"
                aria-label="Start new quick chat"
                title="New chat"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPanelSize((prev) => (prev === 'expanded' ? 'comfortable' : 'expanded'))}
                className="p-1.5 rounded-md border border-white/10 bg-white/5 text-text-muted hover:text-text-primary hover:bg-white/10"
                aria-label={panelSize === 'expanded' ? 'Contract quick chat' : 'Expand quick chat'}
                title={panelSize === 'expanded' ? 'Contract' : 'Expand'}
              >
                {panelSize === 'expanded' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Close quick AI chat"
              >
                ✕
              </button>
            </div>
          </div>

          <div className={`quick-chat-messages overflow-y-auto px-3 py-3 ${panelSize === 'compact' ? 'max-h-64' : panelSize === 'expanded' ? 'max-h-[26rem]' : 'max-h-80'}`}>
            {messages.length === 0 ? (
              <p className="text-sm text-text-secondary mb-0">Ask a quick question or upload a file. Everything syncs into AI Assistant automatically.</p>
            ) : (
              messages.map((msg, index) => (
                <ChatMessage key={`${msg.time}-${index}`} role={msg.role} text={msg.text} time={msg.time} />
              ))
            )}
          </div>

          <div className="px-3 pb-3 pt-1 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/10 disabled:opacity-50"
                title="Upload file"
              >
                {uploading ? 'Uploading...' : 'File'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                }}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask about your finances..."
                className="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="px-3 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50"
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
            <Link
              to="/ai-assistant"
              className="text-xs text-primary hover:underline"
            >
              Open full AI Assistant
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpen}
        className="rounded-full p-0 bg-transparent border-0 shadow-2xl hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open quick AI chat"
      >
        <QuickChatLogo size={58} />
      </button>
    </div>
  )
}
