// Copies MapLibre GL 6 (main module, worker and their shared chunk) into
// public/maplibre/ so the browser loads them from /maplibre/: the worker via
// the react-map-gl workerUrl prop, the main module via a native import in
// src/components/map/maplibre-loader.ts. Main thread and worker then share
// one copy of maplibre-gl-shared.mjs (Q46).
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

// Main module and worker import the shared chunk by relative path, so all
// three must sit side by side.
const files = ['maplibre-gl.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

mkdirSync(outDir, { recursive: true })
for (const file of files) {
  copyFileSync(join(distDir, file), join(outDir, file))
}
console.log(`copy-maplibre-worker: copied ${files.join(', ')} to public/maplibre/`)
