'use client'

interface GlassInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
}

export function GlassInput({ value, onChange, onSubmit, placeholder, disabled }: GlassInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="w-full max-w-2xl bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg shadow-black/10">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent text-white placeholder:text-white/60 text-base focus:outline-none disabled:opacity-60"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="bg-white text-gray-900 rounded-xl px-5 py-2 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Plan trip
      </button>
    </div>
  )
}
