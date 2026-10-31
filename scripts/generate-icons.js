#!/usr/bin/env node
// generate-icons.js — Genera los iconos de la PWA de Mnestics (la μ) desde images/NewMnestics/mnestics_usuario_1024.png
// (versión oscura). Las imágenes de images/ son solo la FUENTE: no se publican, solo lo que sale a public/.
// Run: npm i --no-save sharp && node scripts/generate-icons.js

import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'images', 'NewMnestics')
const iconsDir = path.join(root, 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

const save = async (img, file, size) => {
  await img.png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 }).toFile(file)
  console.log(`✅  ${path.relative(root, file)} (${size}×${size}, ${(fs.statSync(file).size / 1024).toFixed(0)} KB)`)
}

// Maskable: Android recorta en círculo/redondeado y la zona segura es el 80 % central. Se reduce la imagen
// al 80 % y se coloca sobre una copia suya muy desenfocada (el fondo se mezcla con los bordes sin duplicar la μ).
async function maskable(src, file) {
  const meta = await sharp(src).metadata()
  const side = Math.min(meta.width, meta.height)
  const inner = Math.round(side * 0.8 / 2) * 2
  const offset = (side - inner) / 2
  const base = await sharp(src).resize(side, side, { fit: 'cover' }).toBuffer()
  const background = await sharp(base).blur(150).modulate({ brightness: 0.8 }).toBuffer()
  // Capa central con los bordes difuminados (máscara alfa suave) para que se funda con el fondo
  const soft = Math.round(inner * 0.05)
  const mask = Buffer.from(
    `<svg width="${inner}" height="${inner}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${soft}"/></filter></defs>` +
    `<rect x="${soft * 2}" y="${soft * 2}" width="${inner - soft * 4}" height="${inner - soft * 4}" fill="white" filter="url(#b)"/></svg>`,
  )
  const foreground = await sharp(base)
    .resize(inner, inner)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  // sharp redimensiona ANTES de componer, así que se compone a tamaño completo y luego se reduce
  const composed = await sharp(background)
    .composite([{ input: foreground, left: offset, top: offset }])
    .toBuffer()
  await save(sharp(composed).resize(512, 512), file, 512)
}

const src = path.join(dir, 'mnestics_usuario_1024.png')
for (const size of [192, 512]) {
  await save(sharp(src).resize(size, size, { fit: 'cover' }), path.join(iconsDir, `icon-${size}.png`), size)
}
await maskable(src, path.join(iconsDir, 'icon-maskable-512.png'))
await save(sharp(src).resize(180, 180, { fit: 'cover' }), path.join(root, 'public', 'apple-touch-icon.png'), 180)
await save(sharp(src).resize(32, 32, { fit: 'cover' }), path.join(iconsDir, 'favicon-32.png'), 32)

// favicon.ico tal como lo entrega diseño (versión usuario)
fs.copyFileSync(path.join(dir, 'favicon_mnestics_usuario.ico'), path.join(root, 'public', 'favicon.ico'))
console.log('✅  public/favicon.ico')

// Logo de la app (cabecera del host): se muestra a 24–40 px, así que basta una versión de 120 px de alto.
await save(
  sharp(path.join(root, 'images', 'logo_png.png')).resize({ height: 120 }),
  path.join(root, 'public', 'logo_png.png'),
  120,
)
