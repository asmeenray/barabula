#!/usr/bin/env node
// Curated city photo encoder (D-06, D-42; UI-SPEC "Performance and Assets").
//
//   node scripts/photos/encode.mjs --src <photo.jpg> --slug lisbon --focal 0.6,0.55 [--keep-avif] [--out public/images/cities]
//
// Writes two crops around the focal point (x,y in 0..1 of the source), three files:
//   {slug}-l.avif  1920x1080  laptop landscape   ≤ 220 KB
//   {slug}-m.avif  1080x608   phone landscape    ≤ 150 KB
//   {slug}-m.webp  1080x608   fallback for browsers without AVIF (every width)
// Asmeen's size-gate answer (16-21, option E): no portrait crop and no laptop
// WebP, so the curated set stays small; non-AVIF laptops get the 1080 WebP.
// AVIF comes from ffmpeg + libsvtav1 (all-intra still picture); the CRF goes up
// until the crop fits its budget, and the script fails if it never does.
// The WebP fallback and an 8 px wide blur data URI come from sharp.
// --keep-avif keeps an existing AVIF crop when it is already inside its budget.
// Prints one JSON line: byte sizes, the CRF used per AVIF crop and the blur.
//
// The source photo must have a verified licence and source page before it is
// encoded; record photographer, licence and source URL in src/lib/photos/manifest.ts.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const KB = 1024
const CROPS = [
  { key: 'l', width: 1920, height: 1080, budget: 220 * KB, webp: false },
  { key: 'm', width: 1080, height: 608, budget: 150 * KB, webp: true },
]
const CRF_START = 24
const CRF_STEP = 2
const CRF_MAX = 50
const WEBP_QUALITY = 74
const BLUR_WIDTH = 8

function fail(message) {
  console.error(`encode: ${message}`)
  process.exit(1)
}

function parseFocal(value) {
  const parts = String(value ?? '').split(',').map(Number)
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 1)) {
    fail('--focal must be "x,y" with both values in 0..1')
  }
  return { x: parts[0], y: parts[1] }
}

/** Scale the source to cover the target, then cut a window centred on the focal point. */
function cropWindow(meta, width, height, focal) {
  const scale = Math.max(width / meta.width, height / meta.height)
  const sw = Math.round(meta.width * scale)
  const sh = Math.round(meta.height * scale)
  const clamp = (v, max) => Math.min(Math.max(v, 0), max)
  return {
    resize: { width: sw, height: sh },
    extract: {
      left: clamp(Math.round(focal.x * sw - width / 2), sw - width),
      top: clamp(Math.round(focal.y * sh - height / 2), sh - height),
      width,
      height,
    },
    upscaled: scale > 1,
  }
}

function ffmpegAvif(png, outFile, crf) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error', '-y',
      '-f', 'png_pipe', '-i', '-',
      '-c:v', 'libsvtav1', '-preset', '4', '-crf', String(crf),
      '-svtav1-params', 'avif=1',
      '-pix_fmt', 'yuv420p', '-frames:v', '1',
      outFile,
    ]
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => (stderr += d))
    proc.on('error', reject)
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.trim()}`))
    )
    proc.stdin.end(png)
  })
}

async function encodeAvif(png, outFile, budget) {
  for (let crf = CRF_START; crf <= CRF_MAX; crf += CRF_STEP) {
    await ffmpegAvif(png, outFile, crf)
    const bytes = statSync(outFile).size
    if (bytes <= budget) return { bytes, crf }
  }
  fail(`${path.basename(outFile)} stays over ${budget} bytes even at CRF ${CRF_MAX}`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      src: { type: 'string' },
      slug: { type: 'string' },
      focal: { type: 'string' },
      out: { type: 'string', default: 'public/images/cities' },
      'keep-avif': { type: 'boolean', default: false },
    },
  })
  if (!values.src || !existsSync(values.src)) fail('--src must point to an existing image')
  if (!values.slug || !/^[a-z0-9-]+$/.test(values.slug)) fail('--slug must be lowercase letters, digits and dashes')
  const focal = parseFocal(values.focal)
  mkdirSync(values.out, { recursive: true })

  const source = sharp(values.src).rotate()
  const meta = await source.metadata()
  const result = { slug: values.slug, focal, source: { width: meta.width, height: meta.height }, files: {} }

  let mPng = null
  for (const crop of CROPS) {
    const win = cropWindow(meta, crop.width, crop.height, focal)
    if (win.upscaled) console.error(`encode: warning, ${crop.key} crop upscales the source`)
    const png = await sharp(values.src)
      .rotate()
      .resize(win.resize)
      .extract(win.extract)
      .png()
      .toBuffer()
    if (crop.key === 'm') mPng = png

    const base = path.join(values.out, `${values.slug}-${crop.key}`)
    const avifFile = `${base}.avif`
    const kept =
      values['keep-avif'] &&
      existsSync(avifFile) &&
      statSync(avifFile).size <= crop.budget
    const avif = kept ? { bytes: statSync(avifFile).size, crf: 'kept' } : await encodeAvif(png, avifFile, crop.budget)

    const avifMeta = await sharp(avifFile).metadata()
    if (avifMeta.width !== crop.width || avifMeta.height !== crop.height) {
      fail(`${path.basename(avifFile)} is ${avifMeta.width}x${avifMeta.height}, expected ${crop.width}x${crop.height}`)
    }

    result.files[crop.key] = { avif: { file: avifFile, bytes: avif.bytes, crf: avif.crf, budget: crop.budget } }
    if (crop.webp) {
      const webpFile = `${base}.webp`
      await sharp(png).webp({ quality: WEBP_QUALITY, effort: 6 }).toFile(webpFile)
      result.files[crop.key].webp = { file: webpFile, bytes: statSync(webpFile).size }
    }
  }

  // Blur placeholder from the phone landscape crop (what most passes show).
  const blur = await sharp(mPng).resize({ width: BLUR_WIDTH }).webp({ quality: 50 }).toBuffer()
  result.blur = `data:image/webp;base64,${blur.toString('base64')}`

  console.log(JSON.stringify(result))
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
