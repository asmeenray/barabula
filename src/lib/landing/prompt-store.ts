const KEY = 'barabula_pending_prompt'

export function savePrompt(prompt: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY, prompt)
}

export function getPrompt(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(KEY)
}

export function clearPrompt(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(KEY)
}
