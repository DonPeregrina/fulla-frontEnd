// Credenciales de prueba para los scripts. Se leen de variables de entorno o de `.env.test`
// (ignorado por git). Ver `.env.test.example`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

try {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.test')
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* sin .env.test: se usan solo las variables de entorno */ }

function need(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Falta la variable ${name}. Copia .env.test.example a .env.test y complétala.`)
    process.exit(1)
  }
  return v
}

export const HOST = { email: need('MN_HOST_EMAIL'), password: need('MN_HOST_PASSWORD') }
export const USER = { identifier: need('MN_USER_ID'), password: need('MN_USER_PASSWORD') }
// Usuarios extra para test-api.js: "usuario:password,usuario2:password2"
export const EXTRA_USERS = (process.env.MN_EXTRA_USERS ?? '')
  .split(',').filter(Boolean)
  .map(p => { const i = p.indexOf(':'); return { identifier: p.slice(0, i), password: p.slice(i + 1) } })
