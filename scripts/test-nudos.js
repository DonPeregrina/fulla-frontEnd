#!/usr/bin/env node
// test-nudos.js — Valida los datos que necesita NudosTab
// Run: node scripts/test-nudos.js

const BASE = 'https://delta-habits.azurewebsites.net/graphql'

const CREDS = {
  host: { email: 'ismael.peregrina@gmail.com', password: 'Verona.52' },
  user: { identifier: 'MrPilgrim', password: 'Verona.52' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0, failed = 0, warned = 0

function ok(label, msg)   { passed++; console.log(`✅  ${label.padEnd(36)} ${msg}`) }
function fail(label, msg) { failed++; console.log(`❌  ${label.padEnd(36)} ${msg}`) }
function warn(label, msg) { warned++; console.log(`⚠️   ${label.padEnd(36)} ${msg}`) }
function section(t)       { console.log(`\n${'─'.repeat(64)}\n  ${t}\n${'─'.repeat(64)}`) }
function info(msg)        { console.log(`     ${msg}`) }

async function gql(query, variables, token) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join(' | '))
  return json.data
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔬  NUDOSTAB VALIDATION')
  console.log(`    Backend: ${BASE}\n`)

  // ── Login ──────────────────────────────────────────────────────────────────
  section('1. LOGIN')

  let hostToken = null
  try {
    const d = await gql(`mutation { loginHost(input: { email: "${CREDS.host.email}", password: "${CREDS.host.password}" }) { token } }`)
    hostToken = d.loginHost.token
    ok('loginHost', 'token ✓')
  } catch (e) { fail('loginHost', e.message) }

  let userToken = null
  let userId = null
  try {
    const d = await gql(`mutation { loginUser(input: { email: "${CREDS.user.identifier}", password: "${CREDS.user.password}" }) { token } }`)
    userToken = d.loginUser.token
    ok(`loginUser (${CREDS.user.identifier})`, 'token ✓')
  } catch (e) { fail(`loginUser (${CREDS.user.identifier})`, e.message) }

  if (userToken) {
    try {
      const d = await gql(`query { currentUser { id username groups } }`, {}, userToken)
      userId = d.currentUser.id
      ok('currentUser', `id=${userId.slice(0,8)}… grupos=${d.currentUser.groups.length}`)
    } catch (e) { fail('currentUser', e.message) }
  }

  // ── categories con host token ──────────────────────────────────────────────
  section('2. CATEGORIES (host token) — nombres reales de Nudos')

  let categoriesHost = []
  if (hostToken) {
    try {
      const d = await gql(`query { categories { id name } }`, {}, hostToken)
      categoriesHost = d.categories
      ok('categories (host)', `${categoriesHost.length} nudos`)
      categoriesHost.forEach(c => info(`• ${c.name.padEnd(20)} id=${c.id}`))
    } catch (e) { fail('categories (host)', e.message) }
  } else {
    warn('categories (host)', 'sin token de host — saltando')
  }

  // ── categories con user token ──────────────────────────────────────────────
  section('3. CATEGORIES (user token) — ¿es accesible para usuarios?')

  let categoriesUser = []
  if (userToken) {
    try {
      const d = await gql(`query { categories { id name } }`, {}, userToken)
      categoriesUser = d.categories
      if (categoriesUser.length > 0) {
        ok('categories (user)', `${categoriesUser.length} nudos — SÍ funciona con user token`)
        categoriesUser.forEach(c => info(`• ${c.name.padEnd(20)} id=${c.id}`))
      } else {
        warn('categories (user)', '0 nudos — la query devuelve vacío con user token')
      }
    } catch (e) {
      fail('categories (user)', `${e.message} — es host-only`)
    }
  } else {
    warn('categories (user)', 'sin token de usuario — saltando')
  }

  // ── answers del user con questions embebidas ───────────────────────────────
  section('4. ANSWERS (user token) — datos para NudosTab')

  let todasRespuestas = []
  if (userToken && userId) {
    try {
      const d = await gql(`
        query Answers($userId: ID) {
          answers(userId: $userId) {
            id body questionId createdAt
            question { id body categoryId groupId }
          }
        }
      `, { userId }, userToken)
      todasRespuestas = d.answers
      const conQuestion = todasRespuestas.filter(a => a.question)
      ok('answers (user token)', `${todasRespuestas.length} respuestas, ${conQuestion.length} con question embebida`)

      if (conQuestion.length < todasRespuestas.length) {
        warn('  └ questions faltantes', `${todasRespuestas.length - conQuestion.length} respuestas sin question embebida`)
      }

      // Preguntas únicas derivadas
      const preguntasMap = {}
      todasRespuestas.forEach(r => {
        if (r.question) preguntasMap[r.question.id] = r.question
      })
      const preguntas = Object.values(preguntasMap)
      ok('preguntas únicas derivadas', `${preguntas.length} preguntas`)

      // Agrupar por categoryId
      const porCategoria = {}
      preguntas.forEach(p => {
        porCategoria[p.categoryId] = (porCategoria[p.categoryId] ?? 0) + 1
      })
      const categoryIds = Object.keys(porCategoria)
      ok('categoryIds únicos', `${categoryIds.length} categorías`)
      info('')
      info('Preguntas por categoryId:')
      categoryIds.forEach(cid => {
        const nombre = categoriesHost.find(c => c.id === cid)?.name ?? '(sin nombre — categories es host-only)'
        info(`  ${cid.slice(0,8)}… → ${porCategoria[cid]} pregunta(s) — ${nombre}`)
      })

      // ¿Los categoryIds coinciden con lo que devuelve categories?
      if (categoriesHost.length > 0) {
        const hostCategoryIds = new Set(categoriesHost.map(c => c.id))
        const matches = categoryIds.filter(id => hostCategoryIds.has(id))
        const missing = categoryIds.filter(id => !hostCategoryIds.has(id))
        if (missing.length === 0) {
          ok('categoryId match', `todos los ${categoryIds.length} coinciden con categories ✓`)
        } else {
          warn('categoryId match', `${missing.length} categoryIds del user NO están en categories`)
          missing.forEach(id => info(`  sin match: ${id}`))
        }
      }

      // Respuestas de hoy
      const today = new Date().toISOString().split('T')[0]
      const hoy = todasRespuestas.filter(r => {
        const d = new Date(Number(r.createdAt))
        return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === today
      })
      hoy.length > 0
        ? ok(`respuestas de hoy (${today})`, `${hoy.length} respuestas`)
        : warn(`respuestas de hoy (${today})`, '0 — el usuario no ha respondido hoy')

    } catch (e) { fail('answers (user token)', e.message) }
  } else {
    warn('answers', 'sin user token o userId — saltando')
  }

  // ── answers del user con host token (comparar) ─────────────────────────────
  section('5. ANSWERS (host token + userId) — comparar con resultado de user token')

  if (hostToken && userId) {
    try {
      const d = await gql(`
        query Answers($userId: ID) {
          answers(userId: $userId) {
            id questionId
            question { id body categoryId }
          }
        }
      `, { userId }, hostToken)
      ok('answers (host token, mismo userId)', `${d.answers.length} respuestas`)
      if (d.answers.length !== todasRespuestas.length) {
        warn('  └ conteo diferente', `host ve ${d.answers.length}, user ve ${todasRespuestas.length}`)
      }
    } catch (e) { fail('answers (host token, userId)', e.message) }
  }

  // ── Diagnóstico NudosTab ───────────────────────────────────────────────────
  section('6. DIAGNÓSTICO NUDOSTAB')

  const preguntasMap = {}
  todasRespuestas.forEach(r => { if (r.question) preguntasMap[r.question.id] = r.question })
  const preguntas = Object.values(preguntasMap)
  const categoryIds = [...new Set(preguntas.map(p => p.categoryId))]

  if (preguntas.length === 0) {
    fail('NudosTab renderizará', 'VACÍO — 0 preguntas derivadas de answers')
    info('→ El usuario no tiene respuestas en su historial, o answers no devuelve questions embebidas')
  } else if (categoriesUser.length === 0 && categoriesHost.length > 0) {
    warn('NudosTab nombres', 'categories NO accesible con user token → nombres serán "Nudo 1", "Nudo 2"...')
    info('→ FIX NECESARIO: derivar nudos de categoryIds en vez de nudosData?.categories')
    info(`→ Se mostrarán ${categoryIds.length} nudo(s) con nombres de fallback`)
  } else if (categoriesUser.length > 0) {
    ok('NudosTab renderizará', `${categoryIds.length} nudos con nombres reales ✓`)
  } else {
    warn('NudosTab', 'no se pudo determinar — revisar secciones anteriores')
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`)
  console.log(`  ${passed} ✅  ${failed} ❌  ${warned} ⚠️`)
  console.log('═'.repeat(64) + '\n')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
