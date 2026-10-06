import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // Next resolves 'server-only' itself; in tests it is an empty module.
      'server-only': fileURLToPath(
        new URL('./node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)
      ),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    passWithNoTests: true,
    // Playwright specs live in e2e/ and run with `npx playwright test`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
