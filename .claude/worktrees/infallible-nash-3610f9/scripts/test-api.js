#!/usr/bin/env node
// test-api.js — Fulla API integration tests
// Run: node scripts/test-api.js
// Requires Node 18+ (native fetch)

const BASE = 'https://delta-habits.azurewebsites.net/graphql'

const CREDS = {
  host:  { email: 'ismael.peregrina@gmail.com', password: 'Verona.52' },
  users: [
    { identifier: 'calavera.many', password: 'Verona.52'   },
    { identifier: 'MrPilgrim',     password: 'Verona.52'   },
    { identifier: 'azul0078',      password: 'Mordecay.52' },
    { identifier: 'MarceMIT',      password: 'Thinking.24' },
  ],
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
  console.log('\n🔬  FULLA API TEST SUITE')
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
