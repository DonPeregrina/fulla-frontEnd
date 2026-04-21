#!/usr/bin/env node
// test-data-model.js — Mapea la relación Nudo → Hilo → Pregunta
// Muestra exactamente qué datos llegan del backend y qué debería ser cada cosa en la UI
// Run: node scripts/test-data-model.js

const BASE = 'https://delta-habits.azurewebsites.net/graphql'

const CREDS = {
  host: { email: 'ismael.peregrina@gmail.com', password: 'Verona.52' },
  user: { identifier: 'MrPilgrim', password: 'Verona.52' },
}

// IDs conocidos de nudos (categories) — obtenidos con host token en test-nudos.js
const NUDOS_CONOCIDOS = {
  'f32d0ca0-fb3d-4326-9738-bba153be51c2': 'Waking Up',
  '019b339c-aa65-45ed-8e8d-f4dff30520c4': 'Morning',
  '2098930f-bef7-483b-9f79-7efc68fc1f70': 'Afternoon',
  '4a769c30-5b59-4ab8-be5e-d9a74b4350a3': 'Night',
  '79ebd774-4516-424d-abc5-78462df1fe74': 'Meal',
  'b3798f9e-55a4-45b7-94f6-eef49c0a343a': 'Evening',
}

function nudoNombre(id) {
  return NUDOS_CONOCIDOS[id] ?? `(desconocido ${id.slice(0, 8)}…)`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function section(t) { console.log(`\n${'═'.repeat(68)}\n  ${t}\n${'═'.repeat(68)}`) }
function sub(t)     { console.log(`\n  ${'─'.repeat(60)}\n  ${t}\n  ${'─'.repeat(60)}`) }

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
  console.log('\n🗺️   DATA MODEL MAP — Nudo → Hilo → Pregunta')
  console.log(`    Objetivo: entender qué devuelve el backend y cómo mapearlo a la UI`)
  console.log(`    Backend: ${BASE}\n`)

  // Login
  const hostD = await gql(`mutation { loginHost(input: { email: "${CREDS.host.email}", password: "${CREDS.host.password}" }) { token } }`)
  const hostToken = hostD.loginHost.token
  console.log('✅  Host login OK')

  const userD = await gql(`mutation { loginUser(input: { email: "${CREDS.user.identifier}", password: "${CREDS.user.password}" }) { token } }`)
  const userToken = userD.loginUser.token
  console.log(`✅  User login OK (${CREDS.user.identifier})`)

  const meD = await gql(`query { currentUser { id username groups } }`, {}, userToken)
  const me = meD.currentUser
  console.log(`✅  currentUser: ${me.username} — groupIds: [${me.groups.join(', ')}]\n`)

  // ── 1. HILOS del usuario (via group(id) individual) ────────────────────────
  section('1. HILOS (groups) del usuario — con sus preguntas')
  console.log('  → Backend field: group(id).questions[].categoryId = a qué Nudo pertenece cada pregunta')
  console.log('  → UI: cada Hilo es un "hilo de hebra" dentro de un Nudo\n')

  const hilos = []
  for (const gid of me.groups) {
    try {
      const d = await gql(`
        query Group($id: ID!) {
          group(id: $id) {
            id name hostId
            questions { id body categoryId groupId }
          }
        }
      `, { id: gid }, userToken)
      hilos.push(d.group)
      console.log(`  📦 HILO: "${d.group.name}" (id: ${d.group.id.slice(0, 8)}…)`)
      console.log(`     ${d.group.questions.length} pregunta(s):`)
      d.group.questions.forEach(q => {
        console.log(`       • [Nudo: ${nudoNombre(q.categoryId).padEnd(12)}] "${q.body.slice(0, 60)}"`)
        console.log(`         categoryId=${q.categoryId.slice(0, 8)}…  groupId=${q.groupId.slice(0, 8)}…`)
      })
    } catch (e) {
      console.log(`  ❌ group(${gid.slice(0, 8)}…): ${e.message}`)
    }
  }

  // ── 2. RESPUESTAS del usuario con preguntas embebidas ─────────────────────
  section('2. RESPUESTAS (answers) del usuario — desde answers(userId)')
  console.log('  → Backend field: answer.question.categoryId = Nudo al que pertenece')
  console.log('  → Backend field: answer.question.groupId    = Hilo al que pertenece')
  console.log('  → UI: la respuesta pertenece a un nudo Y a un hilo simultáneamente\n')

  const answersD = await gql(`
    query Answers($userId: ID) {
      answers(userId: $userId) {
        id body questionId createdAt
        question { id body categoryId groupId }
      }
    }
  `, { userId: me.id }, userToken)

  const answers = answersD.answers
  console.log(`  Total respuestas: ${answers.length}`)

  // Preguntas únicas
  const preguntasMap = {}
  answers.forEach(a => { if (a.question) preguntasMap[a.question.id] = a.question })
  const preguntas = Object.values(preguntasMap)
  console.log(`  Preguntas únicas: ${preguntas.length}\n`)

  // ── 3. ESTRUCTURA JERÁRQUICA: Nudo → Hilo → Preguntas ────────────────────
  section('3. ESTRUCTURA JERÁRQUICA: Nudo → Hilo → Pregunta')
  console.log('  → Esto es lo que NudosTab DEBERÍA renderizar\n')

  // Agrupar preguntas por Nudo (categoryId)
  const porNudo = {}
  preguntas.forEach(p => {
    if (!porNudo[p.categoryId]) porNudo[p.categoryId] = {}
    if (!porNudo[p.categoryId][p.groupId]) porNudo[p.categoryId][p.groupId] = []
    porNudo[p.categoryId][p.groupId].push(p)
  })

  const nudoIds = Object.keys(porNudo)
  console.log(`  ${nudoIds.length} Nudos con preguntas:\n`)

  nudoIds.forEach(nudoId => {
    const nudoName = nudoNombre(nudoId)
    const hilosEnNudo = Object.keys(porNudo[nudoId])
    const totalPregNudo = Object.values(porNudo[nudoId]).flat().length

    console.log(`  🔵 NUDO: "${nudoName}"`)
    console.log(`     categoryId: ${nudoId}`)
    console.log(`     Hilos dentro: ${hilosEnNudo.length}  |  Preguntas totales: ${totalPregNudo}`)

    hilosEnNudo.forEach(hiloId => {
      const hiloInfo = hilos.find(h => h.id === hiloId)
      const hiloName = hiloInfo?.name ?? `(Hilo ${hiloId.slice(0, 8)}…)`
      const pregsDeHilo = porNudo[nudoId][hiloId]

      console.log(`\n     🧵 HILO: "${hiloName}"`)
      console.log(`        groupId: ${hiloId}`)
      console.log(`        ${pregsDeHilo.length} pregunta(s) en este nudo:`)
      pregsDeHilo.forEach(q => {
        const ultimaRespuesta = answers
          .filter(a => a.questionId === q.id)
          .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0]
        const respondidaHoy = (() => {
          if (!ultimaRespuesta) return false
          const d = new Date(Number(ultimaRespuesta.createdAt))
          return d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
        })()
        console.log(`          ${respondidaHoy ? '✅' : '⬜'} "${q.body.slice(0, 55)}"`)
        if (ultimaRespuesta) {
          console.log(`             última resp: "${ultimaRespuesta.body.slice(0, 40)}"  (${new Date(Number(ultimaRespuesta.createdAt)).toISOString().split('T')[0]})`)
        }
      })
    })
    console.log('')
  })

  // ── 4. LO QUE LLEGA VS LO QUE DEBERÍA MOSTRARSE ──────────────────────────
  section('4. MAPEO: campo del backend → elemento de UI')
  console.log('')
  console.log('  Campo backend                    │ Elemento UI')
  console.log('  ─────────────────────────────────┼────────────────────────────────────')
  console.log('  answer.question.categoryId       │ → qué NUDO (time option) es la pregunta')
  console.log('  answer.question.groupId          │ → qué HILO contiene la pregunta')
  console.log('  categories[].id/name             │ → nombre del NUDO (host-only en backend)')
  console.log('  group(id).name                   │ → nombre del HILO')
  console.log('  answer.body                      │ → valor de la RESPUESTA')
  console.log('  answer.createdAt (unix ms)       │ → cuándo fue respondida')
  console.log('')
  console.log('  BraidCanvas por Nudo:')
  console.log('  ─────────────────────────────────')
  nudoIds.forEach(nudoId => {
    const hilosEnNudo = Object.keys(porNudo[nudoId])
    console.log(`  Nudo "${nudoNombre(nudoId).padEnd(12)}" → ${hilosEnNudo.length} satélite(s) en canvas = ${hilosEnNudo.map(id => hilos.find(h => h.id === id)?.name ?? id.slice(0,8)).join(', ')}`)
  })

  console.log('\n' + '═'.repeat(68) + '\n')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
