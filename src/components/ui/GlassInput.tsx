'use client'

import { useRef, useEffect } from 'react'

interface GlassInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
}

export function GlassInput({ value, onChange, onSubmit, placeholder, disabled }: GlassInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea as content grows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="w-full max-w-2xl bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-5 py-4 flex items-end gap-3 shadow-lg shadow-black/10">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="flex-1 resize-none bg-transparent text-white placeholder:text-white/60 text-base focus:outline-none disabled:opacity-60 leading-relaxed overflow-hidden"
        style={{ minHeight: '80px', maxHeight: '192px' }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="bg-white text-gray-900 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-end"
      >
        Plan trip
      </button>
    </div>
  )
}
