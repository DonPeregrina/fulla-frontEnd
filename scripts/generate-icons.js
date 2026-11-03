#!/usr/bin/env node
// generate-icons.js — Genera los iconos de la PWA de Mnestics (la μ con los pixeles que se desintegran) desde
// images/New.png. Esa imagen trae el icono sobre un fondo negro: aquí se recorta al cuadrado redondeado y se
// generan todos los tamaños. Las imágenes de images/ son solo la FUENTE: no se publican, solo lo que sale a public/.
// Run: npm i --no-save sharp && node scripts/generate-icons.js

import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = path.join(root, 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

// Dónde está el cuadrado redondeado dentro de New.png (medido: 970×970; el resto es fondo negro)
const SRC = path.join(root, 'images', 'New.png')
const BOX = { left: 141, top: 134, width: 970, height: 970 }
const CORNER = 0.206 // radio de las esquinas / lado (medido en la imagen)

const art = await sharp(SRC).extract(BOX).png().toBuffer()

const save = async (img, file, size) => {
  await img.png({ compressionLevel: 9, palette: true, quality: 85, effort: 10 }).toFile(file)
  console.log(`✅  ${path.relative(root, file)} (${size}×${size}, ${(fs.statSync(file).size / 1024).toFixed(0)} KB)`)
}

/** El icono completo con las esquinas transparentes (para los iconos "any": se ve entero en cualquier fondo). */
async function rounded(size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${size}" height="${size}" rx="${Math.round(size * CORNER)}" fill="white"/></svg>`,
  )
  return sharp(art).resize(size, size).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

// Maskable: Android recorta en círculo/redondeado y la zona segura es el 80 % central. Se reduce la imagen
// al 80 % y se coloca sobre una copia suya muy desenfocada (el fondo se mezcla con los bordes sin duplicar la μ).
async function maskable(file) {
  const side = 970
  const inner = Math.round(side * 0.8 / 2) * 2
  const offset = (side - inner) / 2
  const background = await sharp(art).blur(150).modulate({ brightness: 0.8 }).toBuffer()
  // Capa central con los bordes difuminados (máscara alfa suave) para que se funda con el fondo
  const soft = Math.round(inner * 0.05)
  const mask = Buffer.from(
    `<svg width="${inner}" height="${inner}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${soft}"/></filter></defs>` +
    `<rect x="${soft * 2}" y="${soft * 2}" width="${inner - soft * 4}" height="${inner - soft * 4}" fill="white" filter="url(#b)"/></svg>`,
  )
  const foreground = await sharp(art).resize(inner, inner).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  // sharp redimensiona ANTES de componer, así que se compone a tamaño completo y luego se reduce
  const composed = await sharp(background).composite([{ input: foreground, left: offset, top: offset }]).toBuffer()
  await save(sharp(composed).resize(512, 512), file, 512)
}

/** .ico con PNGs adentro (16, 32 y 48 px): sharp no escribe .ico, el formato admite PNG directamente. */
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // tipo: icono
  header.writeUInt16LE(images.length, 4)
  const dir = Buffer.alloc(16 * images.length)
  let offset = 6 + dir.length
  images.forEach(({ size, buf }, i) => {
    const o = i * 16
    dir.writeUInt8(size, o)
    dir.writeUInt8(size, o + 1)
    dir.writeUInt16LE(1, o + 4) // planos
    dir.writeUInt16LE(32, o + 6) // bits por pixel
    dir.writeUInt32LE(buf.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += buf.length
  })
  return Buffer.concat([header, dir, ...images.map(i => i.buf)])
}

for (const size of [192, 512]) {
  await save(sharp(await rounded(size)), path.join(iconsDir, `icon-${size}.png`), size)
}
await maskable(path.join(iconsDir, 'icon-maskable-512.png'))
// iOS aplica su propio redondeo y rellena la transparencia con negro: se entrega el cuadrado completo
await save(sharp(art).resize(180, 180), path.join(root, 'public', 'apple-touch-icon.png'), 180)
await save(sharp(await rounded(32)), path.join(iconsDir, 'favicon-32.png'), 32)

const sizes = [16, 32, 48]
const icoFile = path.join(root, 'public', 'favicon.ico')
fs.writeFileSync(icoFile, ico(await Promise.all(sizes.map(async size => ({ size, buf: await rounded(size) })))))
console.log(`✅  public/favicon.ico (${sizes.join(', ')} px, ${(fs.statSync(icoFile).size / 1024).toFixed(0)} KB)`)
