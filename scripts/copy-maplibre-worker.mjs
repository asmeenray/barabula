// Copies the MapLibre GL 6 worker and its shared chunk into public/maplibre/
// so the browser can load them from /maplibre/ (react-map-gl workerUrl prop).
// Runs before `next dev` and `next build` (predev / prebuild). The output is
// gitignored: it always comes from the installed, approved maplibre-gl.
import { createRequire } from 'node:module'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const pkgDir = dirname(require.resolve('maplibre-gl/package.json'))
const distDir = join(pkgDir, 'dist')
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'maplibre')

// The worker imports the shared chunk by relative path, so both must sit side by side.
const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

mkdirSync(outDir, { recursive: true })
for (const file of files) {
  copyFileSync(join(distDir, file), join(outDir, file))
}
console.log(`copy-maplibre-worker: copied ${files.join(', ')} to public/maplibre/`)
