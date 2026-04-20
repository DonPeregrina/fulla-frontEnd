import axios from 'axios'

// ─── Cliente ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://delta-habits.azurewebsites.net'

export const httpClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('fulla:session')
  if (raw) {
    const session = JSON.parse(raw)
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { data } = await httpClient.post<{ data: T; errors?: { message: string }[] }>('/graphql', {
    query,
    variables,
  })
  if (data.errors?.length) throw new Error(data.errors[0].message)
  return data.data
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Schema real: loginHost(input: { email, password }) y loginUser(input: { username, password })

export const authApi = {
  loginHost: (email: string, password: string) =>
    gql<{ loginHost: { token: string } }>(`
      mutation LoginHost($input: LoginHostInput!) {
        loginHost(input: $input) { token }
      }
    `, { input: { email, password } }),

  // El backend usa "email" como campo identificador para users también
  loginUser: (identifier: string, password: string) =>
    gql<{ loginUser: { token: string } }>(`
      mutation LoginUser($input: LoginUserInput!) {
        loginUser(input: $input) { token }
      }
    `, { input: { email: identifier, password } }),

  currentHost: () =>
    gql<{ currentHost: import('@/types').Host }>(`
      query CurrentHost {
        currentHost { id email name }
      }
    `),

  currentUser: () =>
    gql<{ currentUser: import('@/types').User }>(`
      query CurrentUser {
        currentUser { id username name email hostId groups }
      }
    `),
}

// ─── Hilos / Groups ───────────────────────────────────────────────────────────
// El token determina qué host ─ no se pasa hostId

export const hilosApi = {
  list: () =>
    gql<{ groups: import('@/types').Hilo[] }>(`
      query Groups {
        groups {
          id name hostId
          users { id username name }
          questions { id body categoryId groupId }
        }
      }
    `),

  get: (id: string) =>
    gql<{ group: import('@/types').Hilo }>(`
      query Group($id: ID!) {
        group(id: $id) {
          id name hostId
          users { id username name }
          questions { id body categoryId groupId }
        }
      }
    `, { id }),

  /** Para usuarios: obtener sus hilos por IDs (group(id) funciona con user token) */
  getByIds: async (ids: string[], token?: string) => {
    const results = await Promise.all(
      ids.map(id =>
        gql<{ group: import('@/types').Hilo }>(`
          query Group($id: ID!) {
            group(id: $id) {
              id name hostId
              questions { id body categoryId groupId }
            }
          }
        `, { id })
      )
    )
    return results.map(r => r.group).filter(Boolean)
  },

  create: (name: string) =>
    gql<{ createGroup: { group: import('@/types').Hilo } }>(`
      mutation CreateGroup($input: CreateGroupInput!) {
        createGroup(input: $input) { group { id name hostId } }
      }
    `, { input: { name } }),

  update: (id: string, name: string) =>
    gql<{ updateGroup: { group: import('@/types').Hilo } }>(`
      mutation UpdateGroup($id: ID!, $input: CreateGroupInput!) {
        updateGroup(id: $id, input: $input) { group { id name } }
      }
    `, { id, input: { name } }),

  remove: (id: string) =>
    gql<{ removeGroup: { group: { id: string } } }>(`
      mutation RemoveGroup($id: ID!) { removeGroup(id: $id) { group { id } } }
    `, { id }),

  addUser: (userId: string, groupId: string) =>
    gql<{ addUserToGroup: { group: { id: string } } }>(`
      mutation AddUserToGroup($userId: ID!, $groupId: ID!) {
        addUserToGroup(userId: $userId, groupId: $groupId) { group { id } }
      }
    `, { userId, groupId }),

  removeUser: (userId: string, groupId: string) =>
    gql<{ removeUserFromGroup: { group: { id: string } } }>(`
      mutation RemoveUserFromGroup($userId: ID!, $groupId: ID!) {
        removeUserFromGroup(userId: $userId, groupId: $groupId) { group { id } }
      }
    `, { userId, groupId }),
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────
// No hay createUser — los usuarios entran mediante invitaciones (sendInvite)

export const usersApi = {
  list: () =>
    gql<{ users: import('@/types').User[] }>(`
      query Users {
        users { id username name email hostId groups }
      }
    `),

  get: (id: string) =>
    gql<{ user: import('@/types').User }>(`
      query User($id: ID!) {
        user(id: $id) { id username name email hostId groups }
      }
    `, { id }),
}

// ─── Invitaciones ─────────────────────────────────────────────────────────────

export const invitacionesApi = {
  send: (email: string, groupId?: string) =>
    gql<{ sendInvite: { invite: import('@/types').Invitacion } }>(`
      mutation SendInvite($input: SendInviteInput!) {
        sendInvite(input: $input) { invite { id email groupId hostId } }
      }
    `, { input: { email, groupId } }),

  accept: (id: string) =>
    gql<{ acceptInvite: { invite: import('@/types').Invitacion } }>(`
      mutation AcceptInvite($input: AcceptInviteInput!) {
        acceptInvite(input: $input) { invite { id } }
      }
    `, { input: { id } }),

  remove: (id: string) =>
    gql<{ removeInvite: { invite: { id: string } } }>(`
      mutation RemoveInvite($id: ID!) { removeInvite(id: $id) { invite { id } } }
    `, { id }),

  listMine: () =>
    gql<{ invites: import('@/types').Invitacion[] }>(`
      query Invites { invites { id email groupId hostId } }
    `),
}

// ─── Dimensiones / Categories ─────────────────────────────────────────────────

export const dimensionesApi = {
  list: () =>
    gql<{ categories: import('@/types').Dimension[] }>(`
      query Categories {
        categories { id name }
      }
    `),
}

// ─── Preguntas / Questions ────────────────────────────────────────────────────
// Las preguntas vienen anidadas en Group — acá solo mutations

export const preguntasApi = {
  create: (body: string, groupId: string, categoryId: string) =>
    gql<{ createQuestion: { question: import('@/types').Pregunta } }>(`
      mutation CreateQuestion($input: CreateQuestionInput!) {
        createQuestion(input: $input) { question { id body groupId categoryId } }
      }
    `, { input: { body, groupId, categoryId } }),

  remove: (id: string) =>
    gql<{ removeQuestion: { question: { id: string } } }>(`
      mutation RemoveQuestion($id: ID!) { removeQuestion(id: $id) { question { id } } }
    `, { id }),
}

// ─── Nodos / Answers ──────────────────────────────────────────────────────────
// Answer.body = el valor de la respuesta (siempre string en el backend)

export const nodosApi = {
  /** Para el usuario: sus respuestas de hoy (o de una fecha específica) */
  list: (userId?: string, date?: string) =>
    gql<{ answers: import('@/types').Nodo[] }>(`
      query Answers($userId: ID, $date: String) {
        answers(userId: $userId, date: $date) {
          id body userId questionId timezone createdAt
          question { id body categoryId groupId }
        }
      }
    `, { userId, date }),

  create: (questionId: string, body: string, timezone?: string) =>
    gql<{ createAnswer: { answer: import('@/types').Nodo } }>(`
      mutation CreateAnswer($input: AnswerInput!) {
        createAnswer(input: $input) {
          answer { id body userId questionId createdAt }
        }
      }
    `, { input: { questionId, body, timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone } }),

  update: (id: string, body: string) =>
    gql<{ updateAnswer: { answer: import('@/types').Nodo } }>(`
      mutation UpdateAnswer($id: ID!, $body: String!) {
        updateAnswer(id: $id, body: $body) { answer { id body } }
      }
    `, { id, body }),

  remove: (id: string) =>
    gql<{ removeAnswer: { group: { id: string } } }>(`
      mutation RemoveAnswer($id: ID!) { removeAnswer(id: $id) { group { id } } }
    `, { id }),

  latest: (userId?: string) =>
    gql<{ latestAnswer: import('@/types').Nodo | null }>(`
      query LatestAnswer($userId: ID) {
        latestAnswer(userId: $userId) { id body userId questionId createdAt }
      }
    `, { userId }),
}

// ─── Bitácoras / Collections ──────────────────────────────────────────────────
// Collection ya trae answers anidadas con sus questions

export const bitacorasApi = {
  list: (userId?: string) =>
    gql<{ collections: import('@/types').Bitacora[] }>(`
      query Collections($userId: ID) {
        collections(userId: $userId) {
          id date count userId
          answers {
            id body userId questionId
            question { id body categoryId groupId }
          }
        }
      }
    `, { userId }),
}
