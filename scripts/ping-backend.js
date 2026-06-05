/**
 * Monitorea el arranque del backend serverless.
 * Uso: node scripts/ping-backend.js
 * Para: Ctrl+C
 */

const BASE_URL = process.env.VITE_API_URL ?? 'https://delta-habits.azurewebsites.net'
const INTERVAL_MS = 5000
const PING_TIMEOUT_MS = 15000

let attempt = 0
let firstPingAt = null

async function ping() {
  attempt++
  const start = Date.now()
  const elapsed = firstPingAt ? ((Date.now() - firstPingAt) / 1000).toFixed(1) : '0.0'
  const ts = new Date().toLocaleTimeString('es-MX')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    const ms = Date.now() - start
    let body = ''
    try { body = await res.text() } catch { body = '(no body)' }

    if (res.ok || res.status < 500) {
      console.log(`[${ts}] #${attempt} ✅ AWAKE  status=${res.status}  ${ms}ms  +${elapsed}s desde inicio`)
      console.log(`         body: ${body.slice(0, 200)}`)
      console.log('\n🟢 Sistema despierto. Tiempo total desde primer ping:', elapsed, 'segundos\n')
      process.exit(0)
    } else {
      console.log(`[${ts}] #${attempt} ❌ ERROR  status=${res.status}  ${ms}ms  +${elapsed}s`)
      console.log(`         body: ${body.slice(0, 300)}`)
    }
  } catch (err) {
    clearTimeout(timer)
    const ms = Date.now() - start
    if (err.name === 'AbortError') {
      console.log(`[${ts}] #${attempt} ⏱  TIMEOUT  (>${PING_TIMEOUT_MS}ms)  +${elapsed}s desde inicio`)
    } else {
      console.log(`[${ts}] #${attempt} 🔴 NET_ERR  ${ms}ms  +${elapsed}s  →  ${err.message}`)
    }
  }
}

async function main() {
  console.log('━'.repeat(60))
  console.log('  Fulla Backend Monitor')
  console.log(`  URL: ${BASE_URL}/graphql`)
  console.log(`  Intervalo: ${INTERVAL_MS / 1000}s  |  Timeout por ping: ${PING_TIMEOUT_MS / 1000}s`)
  console.log('━'.repeat(60))
  console.log('Presiona Ctrl+C para parar\n')

  firstPingAt = Date.now()
  await ping()
  const interval = setInterval(ping, INTERVAL_MS)

  process.on('SIGINT', () => {
    clearInterval(interval)
    const totalS = ((Date.now() - firstPingAt) / 1000).toFixed(1)
    console.log(`\n⏹  Detenido. Tiempo total monitoreado: ${totalS}s\n`)
    process.exit(0)
  })
}

main()
