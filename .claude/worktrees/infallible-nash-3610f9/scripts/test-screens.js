#!/usr/bin/env node
// test-screens.js — verifica que cada pantalla tiene datos para renderizar
// Run: node scripts/test-screens.js

const BASE = 'https://delta-habits.azurewebsites.net/graphql'

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0, failed = 0, warned = 0

function ok(label, msg)   { passed++; console.log(`✅  ${label.padEnd(32)} ${msg}`) }
function fail(label, msg) { failed++; console.log(`❌  ${label.padEnd(32)} ${msg}`) }
function warn(label, msg) { warned++; console.log(`⚠️   ${label.padEnd(32)} ${msg}`) }
function section(t)       { console.log(`\n${'─'.repeat(64)}\n  ${t}\n${'─'.repeat(64)}`) }

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

async function login(email, password, role) {
  const mutation = role === 'HOST'
    ? `mutation { loginHost(input: { email: "${email}", password: "${password}" }) { token } }`
    : `mutation { loginUser(input: { email: "${email}", password: "${password}" }) { token } }`
  const d = await gql(mutation)
  return role === 'HOST' ? d.loginHost.token : d.loginUser.token
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🖥️   FULLA SCREEN DATA DIAGNOSTICS\n')

  // ── Login ambos roles ──────────────────────────────────────────────────────
  let hostToken, userToken, userId

  try {
    hostToken = await login('ismael.peregrina@gmail.com', 'Verona.52', 'HOST')
    ok('HOST login', 'token ✓')
  } catch (e) { fail('HOST login', e.message); return }

  try {
    userToken = await login('MrPilgrim', 'Verona.52', 'USER')
    ok('USER login (MrPilgrim)', 'token ✓')
  } catch (e) { fail('USER login', e.message) }

  // ── HOST SCREENS ───────────────────────────────────────────────────────────
  section('HOST SCREENS')

  // BitacorasTab — necesita: collections con answers
  try {
    const d = await gql(`
      query { collections {
        id date count userId
        answers { id body userId questionId
          question { id body categoryId }
        }
      }}
    `, {}, hostToken)
    const cols = d.collections
    const withAnswers = cols.filter(c => c.answers.length > 0)
    const sample = cols[0]
    ok('BitacorasTab — collections', `${cols.length} total, ${withAnswers.length} con answers`)
    if (sample) {
      const dateNum = Number(sample.date)
      const dateObj = new Date(dateNum)
      const dateValid = !isNaN(dateObj.getTime())
      dateValid
        ? ok('  └ date format', `Unix ms ✓  → ${dateObj.toISOString().split('T')[0]}`)
        : fail('  └ date format', `"${sample.date}" no parseable`)
    }
  } catch (e) { fail('BitacorasTab — collections', e.message) }

  // HilosTab — necesita: groups con users y questions
  try {
    const d = await gql(`
      query { groups {
        id name hostId
        users { id username name }
        questions { id body categoryId groupId }
      }}
    `, {}, hostToken)
    const groups = d.groups
    ok('HilosTab — groups', `${groups.length} hilos`)
    groups.forEach(g => {
      const status = `${g.users.length} users, ${g.questions.length} preguntas`
      g.questions.length > 0
        ? ok(`  └ "${g.name}"`, status)
        : warn(`  └ "${g.name}"`, `${status} ← sin preguntas`)
    })
  } catch (e) { fail('HilosTab — groups', e.message) }

  // UsuariosTab — necesita: users list
  try {
    const d = await gql(`
      query { users { id username name email hostId groups } }
    `, {}, hostToken)
    ok('UsuariosTab — users', `${d.users.length} usuarios`)
    d.users.slice(0, 3).forEach(u => {
      console.log(`     • ${u.username} (${u.name}) — ${u.groups.length} grupos`)
    })
    if (d.users.length > 3) console.log(`     … y ${d.users.length - 3} más`)
  } catch (e) { fail('UsuariosTab — users', e.message) }

  // PerfilTab — necesita: currentHost
  try {
    const d = await gql(`query { currentHost { id email name } }`, {}, hostToken)
    ok('PerfilTab — currentHost', JSON.stringify(d.currentHost))
  } catch (e) { fail('PerfilTab — currentHost', e.message) }

  // Categories (usada en múltiples tabs)
  try {
    const d = await gql(`query { categories { id name } }`, {}, hostToken)
    ok('Categories (shared)', d.categories.map(c => c.name).join(', '))
  } catch (e) { fail('Categories', e.message) }

  // ── USER SCREENS ───────────────────────────────────────────────────────────
  section('USER SCREENS')

  if (!userToken) {
    console.log('  ⚠️  Sin user token — omitiendo user screens')
  } else {
    // Obtener userId
    try {
      const d = await gql(`query { currentUser { id username name hostId groups } }`, {}, userToken)
      userId = d.currentUser.id
      ok('currentUser', `${d.currentUser.username} — ${d.currentUser.groups.length} grupos`)
    } catch (e) { fail('currentUser', e.message) }

    // HoyTab — necesita: groups con questions + answers de hoy
    try {
      const d = await gql(`
        query { groups {
          id name
          questions { id body categoryId groupId }
        }}
      `, {}, userToken)
      const preguntas = d.groups.flatMap(g => g.questions)
      ok('HoyTab — preguntas', `${preguntas.length} preguntas en ${d.groups.length} grupos`)
      if (preguntas.length === 0) warn('HoyTab', 'Sin preguntas — el tab mostrará empty state')
    } catch (e) { fail('HoyTab — groups/questions', e.message) }

    // Answers de hoy
    if (userId) {
      const today = new Date().toISOString().split('T')[0]
      try {
        const d = await gql(`
          query Answers($userId: ID, $date: String) {
            answers(userId: $userId, date: $date) { id body questionId createdAt }
          }
        `, { userId, date: today }, userToken)
        ok(`HoyTab — answers hoy (${today})`, `${d.answers.length} nodos`)
      } catch (e) { fail('HoyTab — answers today', e.message) }

      // HistorialTab — necesita: collections del user
      try {
        const d = await gql(`
          query { collections(userId: "${userId}") {
            id date count
            answers { id body questionId question { body } }
          }}
        `, {}, userToken)
        const cols = d.collections
        ok('HistorialTab — collections', `${cols.length} bitácoras`)
        if (cols.length > 0) {
          const latest = cols.sort((a, b) => Number(b.date) - Number(a.date))[0]
          const d2 = new Date(Number(latest.date))
          console.log(`     Última: ${d2.toISOString().split('T')[0]} — ${latest.count} nodos`)
        }
      } catch (e) { fail('HistorialTab — collections', e.message) }

      // latestAnswer
      try {
        const d = await gql(`
          query { latestAnswer(userId: "${userId}") {
            id body createdAt question { body }
          }}
        `, {}, userToken)
        if (d.latestAnswer) {
          ok('latestAnswer', `"${d.latestAnswer.body}" — ${d.latestAnswer.question?.body?.slice(0,40)}`)
        } else {
          warn('latestAnswer', 'null — usuario sin respuestas')
        }
      } catch (e) { fail('latestAnswer', e.message) }
    }

    // PerfilTab User — currentUser
    try {
      const d = await gql(`query { currentUser { id username name email } }`, {}, userToken)
      ok('PerfilTab User — currentUser', JSON.stringify(d.currentUser))
    } catch (e) { fail('PerfilTab User', e.message) }
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`)
  console.log(`  ${passed} ✅  ${failed} ❌  ${warned} ⚠️   (total ${passed + failed + warned})`)
  if (failed === 0) {
    console.log('  Todos los datos necesarios están disponibles en el backend.')
    console.log('  Si una pantalla no muestra nada, el bug es de rendering (JS/CSS).')
  } else {
    console.log('  Algunos endpoints fallan — revisar ❌ arriba antes de implementar esas screens.')
  }
  console.log('═'.repeat(64) + '\n')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
