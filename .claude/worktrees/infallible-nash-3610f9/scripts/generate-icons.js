#!/usr/bin/env node
// generate-icons.js — Genera los iconos PWA desde el logo oficial
// Run: node scripts/generate-icons.js

import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const src = path.join(root, 'images', 'logo.jpg')
const outDir = path.join(root, 'public', 'icons')

fs.mkdirSync(outDir, { recursive: true })

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
]

for (const { size, name } of sizes) {
  const out = path.join(outDir, name)
  await sharp(src).resize(size, size, { fit: 'cover', position: 'centre' }).png().toFile(out)
  console.log(`✅  ${name} (${size}×${size})`)
}

// También copia el PNG transparente a public/ para usarlo en la app
const pngSrc = path.join(root, 'images', 'logo_png.png')
const pngDst = path.join(root, 'public', 'logo_png.png')
fs.copyFileSync(pngSrc, pngDst)
console.log('✅  logo_png.png → public/')

console.log('\nIconos generados en public/icons/')
