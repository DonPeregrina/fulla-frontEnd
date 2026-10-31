#!/usr/bin/env node
// test-api.js — Mnestics API integration tests
// Run: node scripts/test-api.js
// Contra otro backend (p. ej. local): MN_API_URL=http://localhost:4000/graphql node scripts/test-api.js
// Requires Node 18+ (native fetch)

import { HOST, USER, EXTRA_USERS } from './creds.js'

const BASE = process.env.MN_API_URL ?? 'https://delta-habits.azurewebsites.net/graphql'

const CREDS = {
  host:  HOST,
  users: [USER, ...EXTRA_USERS],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0, failed = 0

function ok(label, data) {
  passed++
  const preview = JSON.stringify(data)
  const short = preview.length > 120 ? preview.slice(0, 120) + '…' : preview
  console.log(`✅  ${label.padEnd(28)} ${short}`)
  return data
}

function fail(label, err) {
  failed++
  console.log(`❌  ${label.padEnd(28)} ${err?.message ?? err}`)
  return null
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

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

// ─── Auth mutations ───────────────────────────────────────────────────────────

async function loginHost(email, password) {
  return gql(`
    mutation LoginHost($input: LoginHostInput!) {
      loginHost(input: $input) { token }
    }
  `, { input: { email, password } })
}

async function loginUserByUsername(username, password) {
  return gql(`
    mutation LoginUser($input: LoginUserInput!) {
      loginUser(input: $input) { token }
    }
  `, { input: { username, password } })
}

// Old-app style: sends "email" field even for users
async function loginUserByEmail(email, password) {
  return gql(`
    mutation LoginUser($input: LoginUserInput!) {
      loginUser(input: $input) { token }
    }
  `, { input: { email, password } })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔬  MNESTICS API TEST SUITE')
  console.log(`    Backend: ${BASE}\n`)

  // ── Section 1: Auth ────────────────────────────────────────────────────────
  section('1. AUTH')

  // 1a. Host login
  let hostToken = null
  try {
    const d = await loginHost(CREDS.host.email, CREDS.host.password)
    hostToken = d?.loginHost?.token
    ok('loginHost', { token: hostToken?.slice(0, 20) + '…' })
  } catch (e) { fail('loginHost', e) }

  // 1b. currentHost
  if (hostToken) {
    try {
      const d = await gql(`query { currentHost { id email name } }`, {}, hostToken)
      ok('currentHost', d.currentHost)
    } catch (e) { fail('currentHost', e) }
  }

  // 1c. User login — try username field first
  let userToken = null
  let workingUserCred = null
  section('2. USER LOGIN (testing username vs email field)')

  for (const cred of CREDS.users) {
    // Try with username field
    try {
      const d = await loginUserByUsername(cred.identifier, cred.password)
      userToken = d?.loginUser?.token
      workingUserCred = cred
      ok(`loginUser username="${cred.identifier}"`, { token: userToken?.slice(0, 20) + '…', field: 'username' })
      break
    } catch (e) {
      fail(`loginUser username="${cred.identifier}"`, e)
    }

    // Try with email field (old-app style)
    try {
      const d = await loginUserByEmail(cred.identifier, cred.password)
      userToken = d?.loginUser?.token
      workingUserCred = cred
      ok(`loginUser email="${cred.identifier}"`, { token: userToken?.slice(0, 20) + '…', field: 'email (old-app style)' })
      break
    } catch (e) {
      fail(`loginUser email="${cred.identifier}"`, e)
    }
  }

  if (!userToken) {
    console.log('\n⚠️   No user login succeeded — skipping user-specific tests')
  }

  // 1d. currentUser
  if (userToken) {
    try {
      const d = await gql(`query { currentUser { id username name email hostId groups } }`, {}, userToken)
      ok('currentUser', d.currentUser)
    } catch (e) { fail('currentUser', e) }
  }

  // ── Section 3: Host data ───────────────────────────────────────────────────
  section('3. HOST DATA (requires host token)')

  if (!hostToken) {
    console.log('  ⚠️  No host token — skipping')
  } else {

    // groups
    try {
      const d = await gql(`
        query { groups { id name hostId
          users { id username name }
          questions { id body categoryId groupId }
        }}
      `, {}, hostToken)
      ok('groups', `${d.groups.length} grupos`)
      if (d.groups.length) {
        console.log('     Sample group:', JSON.stringify(d.groups[0]).slice(0, 160))
      }
    } catch (e) { fail('groups', e) }

    // users
    try {
      const d = await gql(`
        query { users { id username name email hostId groups } }
      `, {}, hostToken)
      ok('users', `${d.users.length} usuarios`)
      if (d.users.length) {
        console.log('     Sample user:', JSON.stringify(d.users[0]).slice(0, 160))
      }
    } catch (e) { fail('users', e) }

    // categories
    try {
      const d = await gql(`
        query { categories { id name } }
      `, {}, hostToken)
      ok('categories', d.categories)
    } catch (e) { fail('categories', e) }

    // collections
    try {
      const d = await gql(`
        query { collections {
          id date count userId
          answers { id body userId questionId
            question { id body categoryId }
          }
        }}
      `, {}, hostToken)
      ok('collections', `${d.collections.length} colecciones`)
      if (d.collections.length) {
        console.log('     Sample collection:', JSON.stringify(d.collections[0]).slice(0, 200))
      }
    } catch (e) { fail('collections', e) }

    // answers (all, no filter)
    try {
      const d = await gql(`
        query { answers {
          id body userId questionId timezone createdAt
          question { id body categoryId groupId }
        }}
      `, {}, hostToken)
      ok('answers (all)', `${d.answers.length} nodos`)
      if (d.answers.length) {
        console.log('     Sample answer:', JSON.stringify(d.answers[0]).slice(0, 160))
      }
    } catch (e) { fail('answers (all)', e) }

    // invites
    try {
      const d = await gql(`
        query { invites { id email groupId hostId } }
      `, {}, hostToken)
      ok('invites', `${d.invites.length} invitaciones`)
    } catch (e) { fail('invites', e) }

    // notifications
    try {
      const d = await gql(`
        query { notifications { id title body hostId } }
      `, {}, hostToken)
      ok('notifications', `${d.notifications.length} notificaciones`)
    } catch (e) { fail('notifications', e) }
  }

  // ── Section 4: User data ───────────────────────────────────────────────────
  section('4. USER DATA (requires user token)')

  if (!userToken) {
    console.log('  ⚠️  No user token — skipping')
  } else {
    // currentUser con grupos
    try {
      const d = await gql(`query { currentUser { id username name hostId groups } }`, {}, userToken)
      ok('currentUser (groups)', d.currentUser)
      const userId = d.currentUser?.id

      // answers de ese user
      if (userId) {
        try {
          const ad = await gql(`
            query Answers($userId: ID) {
              answers(userId: $userId) {
                id body userId questionId createdAt
                question { id body categoryId groupId }
              }
            }
          `, { userId }, userToken)
          ok(`answers userId=${userId.slice(0,8)}`, `${ad.answers.length} nodos`)
        } catch (e) { fail('answers (userId)', e) }

        // latestAnswer
        try {
          const ld = await gql(`
            query Latest($userId: ID) {
              latestAnswer(userId: $userId) { id body createdAt question { body } }
            }
          `, { userId }, userToken)
          ok('latestAnswer', ld.latestAnswer ?? 'null (no answers yet)')
        } catch (e) { fail('latestAnswer', e) }
      }
    } catch (e) { fail('currentUser (user token)', e) }

    // invites del usuario
    try {
      const d = await gql(`query { invites { id email groupId hostId } }`, {}, userToken)
      ok('invites (user)', `${d.invites.length} invitaciones`)
    } catch (e) { fail('invites (user)', e) }
  }

  // ── Section 5: Consultas por rango ─────────────────────────────────────────
  section('5. CONSULTAS POR RANGO (answersByDay / answersByWeek / answersLastDays)')

  const TZ = 'America/Mexico_City'
  const FIELDS = `from to timezone total byNudo { categoryId name count } byHilo { groupId count } answers { id createdAt }`
  const todayMX = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
  const skip = (label, e) => {
    if (/Cannot query field|Unknown argument/.test(e.message)) console.log(`⚠️  ${label.padEnd(28)} no existe en este backend (¿aún sin desplegar?)`)
    else fail(label, e)
  }

  if (!userToken) {
    console.log('  ⚠️  No user token — skipping')
  } else {
    try {
      const me = (await gql(`query { currentUser { id } }`, {}, userToken)).currentUser.id

      // 30 días: debe cuadrar con el total de byNudo y byHilo
      const l = (await gql(`query($tz: String!) { answersLastDays(timezone: $tz) { ${FIELDS} } }`, { tz: TZ }, userToken)).answersLastDays
      const span = (new Date(l.to) - new Date(l.from)) / 86400000
      if (span !== 30) throw new Error(`rango de ${span} días, se esperaban 30`)
      if (l.answers.length !== l.total) throw new Error('total no coincide con answers')
      if (l.byNudo.reduce((a, n) => a + n.count, 0) > l.total) throw new Error('byNudo suma más que total')
      ok('answersLastDays (30)', { total: l.total, nudos: l.byNudo.length, hilos: l.byHilo.length })

      // days acotado
      const d7 = (await gql(`query($tz: String!) { answersLastDays(days: 7, timezone: $tz) { total } }`, { tz: TZ }, userToken)).answersLastDays
      if (d7.total > l.total) throw new Error('7 días devolvió más que 30')
      ok('answersLastDays (7)', { total: d7.total })

      // día real: hoy en MX
      const day = (await gql(`query($d: String!, $tz: String!) { answersByDay(date: $d, timezone: $tz) { ${FIELDS} } }`, { d: todayMX, tz: TZ }, userToken)).answersByDay
      if ((new Date(day.to) - new Date(day.from)) / 3600000 !== 24) throw new Error('el día no dura 24 h')
      ok(`answersByDay ${todayMX}`, { total: day.total, from: day.from })

      // semana lunes–domingo
      const wk = (await gql(`query($d: String!, $tz: String!) { answersByWeek(date: $d, timezone: $tz) { ${FIELDS} } }`, { d: todayMX, tz: TZ }, userToken)).answersByWeek
      const monday = new Date(new Date(wk.from).getTime() + (-6 * 3600000) + 1000) // 00:00 MX
      if (new Date(monday).getUTCDay() !== 1) throw new Error('la semana no empieza en lunes')
      if (Math.round((new Date(wk.to) - new Date(wk.from)) / 86400000) !== 7) throw new Error('la semana no dura 7 días')
      if (wk.answers.some(a => a.createdAt && (new Date(a.createdAt) < new Date(wk.from) || new Date(a.createdAt) >= new Date(wk.to)))) throw new Error('hay respuestas fuera del rango')
      ok('answersByWeek', { from: wk.from, to: wk.to, total: wk.total })

      // zona horaria: el mismo día en UTC arranca 6 h antes que en México
      const utc = (await gql(`query($d: String!) { answersByDay(date: $d, timezone: "UTC") { from } }`, { d: todayMX }, userToken)).answersByDay
      if ((new Date(day.from) - new Date(utc.from)) / 3600000 !== 6) throw new Error('el desfase MX/UTC no es de 6 h')
      ok('zona horaria MX vs UTC', 'desfase de 6 h')

      // un USER ignora el userId que mande
      const other = (await gql(`query($tz: String!) { answersLastDays(userId: "00000000-0000-0000-0000-000000000000", timezone: $tz) { total } }`, { tz: TZ }, userToken)).answersLastDays
      if (other.total !== l.total) throw new Error('un USER pudo ver datos de otro userId')
      ok('USER ignora userId ajeno', 'ok')

      // rango arbitrario: el mes en curso
      const first = todayMX.slice(0, 8) + '01'
      const bt = (await gql(`query($f: String!, $t: String!, $tz: String!) { answersBetween(from: $f, to: $t, timezone: $tz) { from to total answers { id createdAt } } }`, { f: first, t: todayMX, tz: TZ }, userToken)).answersBetween
      if (bt.answers.length !== bt.total) throw new Error('answersBetween: total no coincide')
      if (bt.total < day.total) throw new Error('el mes tiene menos que un día de ese mes')
      ok(`answersBetween ${first}..${todayMX}`, { total: bt.total })
      try { await gql(`query { answersBetween(from: "2025-01-01", to: "2026-12-31", timezone: "${TZ}") { total } }`, {}, userToken); fail('answersBetween > 366 días', 'debía fallar') }
      catch (e) { /Cannot query field/.test(e.message) ? skip('answersBetween > 366 días', e) : ok('answersBetween > 366 días', e.message.slice(0, 60)) }

      // collections por día local: mismo total que por día UTC, y rechaza zonas inválidas
      const cu = (await gql(`query { collections { count } }`, {}, userToken)).collections
      const cl = (await gql(`query($tz: String) { collections(timezone: $tz) { date count } }`, { tz: TZ }, userToken)).collections
      const sum = (c) => c.reduce((a, x) => a + x.count, 0)
      if (sum(cu) !== sum(cl)) throw new Error(`collections: total UTC=${sum(cu)} vs local=${sum(cl)}`)
      ok('collections (zona horaria)', { totalUTC: sum(cu), totalLocal: sum(cl), diasLocales: cl.length })
      try { await gql(`query { collections(timezone: "Nope/Zone") { count } }`, {}, userToken); fail('collections zona inválida', 'debía fallar') }
      catch (e) { /Unknown argument/.test(e.message) ? skip('collections zona inválida', e) : ok('collections zona inválida', e.message.slice(0, 50)) }

      // validaciones
      for (const [label, q] of [
        ['fecha inválida', `query { answersByDay(date: "mañana", timezone: "${TZ}") { total } }`],
        ['zona inválida', `query { answersByDay(date: "${todayMX}", timezone: "Nope/Zone") { total } }`],
        ['days fuera de rango', `query { answersLastDays(days: 9999, timezone: "${TZ}") { total } }`],
      ]) {
        try { await gql(q, {}, userToken); fail(`validación: ${label}`, 'debía fallar') }
        catch (e) { /Cannot query field/.test(e.message) ? skip(`validación: ${label}`, e) : ok(`validación: ${label}`, e.message.slice(0, 60)) }
      }

      // sin sesión
      try { await gql(`query { answersLastDays(timezone: "${TZ}") { total } }`); fail('sin token', 'debía fallar') }
      catch (e) { /Cannot query field/.test(e.message) ? skip('sin token', e) : ok('sin token', e.message) }

      // HOST: sin userId falla; con userId ajeno/inexistente falla; con uno propio funciona
      if (hostToken) {
        try { await gql(`query { answersLastDays(timezone: "${TZ}") { total } }`, {}, hostToken); fail('host sin userId', 'debía fallar') }
        catch (e) { ok('host sin userId', e.message) }
        try { await gql(`query { answersLastDays(userId: "00000000-0000-0000-0000-000000000000", timezone: "${TZ}") { total } }`, {}, hostToken); fail('host con userId ajeno', 'debía fallar') }
        catch (e) { ok('host con userId ajeno', e.message) }
        try {
          const own = (await gql(`query($u: ID, $tz: String!) { answersLastDays(userId: $u, timezone: $tz) { total } }`, { u: me, tz: TZ }, hostToken)).answersLastDays
          ok('host con userId propio', { total: own.total })
        } catch (e) { ok('host con userId propio', `no aplica: ${e.message}`) }
      }
    } catch (e) { skip('consultas por rango', e) }
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  RESULTADOS: ${passed} ✅  ${failed} ❌  (total ${passed + failed})`)
  if (workingUserCred) {
    console.log(`  User login funcionó con: identifier="${workingUserCred.identifier}"`)
  }
  console.log('═'.repeat(60) + '\n')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
