'use client'

import { useRef, useEffect } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea as content grows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 192)}px` // max ~8 lines
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  return (
    <div className="flex gap-2 items-end p-3 bg-sand border-t border-sand-dark/30">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe your dream trip... (Shift+Enter for new line)"
        disabled={disabled}
        rows={3}
        className="flex-1 resize-none rounded-xl border border-sky-dark/40 bg-white/70 px-4 py-3 text-sm text-gray-900 placeholder-umber/40 focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/40 disabled:opacity-50 overflow-y-auto leading-relaxed"
        style={{ minHeight: '80px', maxHeight: '192px' }}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="px-4 py-3 bg-coral text-white text-sm font-medium rounded-xl hover:bg-coral-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 self-end"
      >
        Send
      </button>
    </div>
  )
}
