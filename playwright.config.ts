import { defineConfig, devices } from '@playwright/test'
import { localSupabaseEnv } from './e2e/helpers/local-env'

// E2E runs ONLY against the local Supabase stack (npx supabase start).
// localSupabaseEnv() throws unless the API host is 127.0.0.1 or localhost,
// so a config load can never point the seed (db reset + service-role writes)
// at the live project. Process env beats .env.local in Next, so the build and
// server below talk to the local stack.
const supabase = localSupabaseEnv()

const PORT = 3100
const BASE_URL = `http://127.0.0.1:${PORT}`
const OWNER_STATE = 'e2e/.auth/owner.json'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'seed', testMatch: /seed\.setup\.ts/ },
    { name: 'auth', testMatch: /auth\.setup\.ts/, dependencies: ['seed'] },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], storageState: OWNER_STATE },
      dependencies: ['auth'],
      testIgnore: /budgets\.spec\.ts/,
    },
    {
      name: 'laptop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        storageState: OWNER_STATE,
      },
      dependencies: ['auth'],
      testIgnore: /budgets\.spec\.ts/,
    },
    {
      name: 'phone-throttled',
      use: { ...devices['Pixel 7'], storageState: OWNER_STATE },
      dependencies: ['auth'],
      testMatch: /budgets\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `${BASE_URL}/login`,
    timeout: 300_000,
    reuseExistingServer: !!process.env.E2E_REUSE_SERVER,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
      // Kill switch (16-11): e2e never calls the public Nominatim service.
      NOMINATIM_DISABLED: '1',
    },
  },
})
