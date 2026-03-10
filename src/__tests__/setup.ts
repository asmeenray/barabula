import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement scrollIntoView — mock it globally
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}))
