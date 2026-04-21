# Fulla — Estado del Proyecto

> Última actualización: 2026-04-21 (v3)
> Backend: `https://delta-habits.azurewebsites.net/graphql`
> Dev server: `cd ~/projects/fulla && npm run dev` → http://localhost:3000

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.1 | UI |
| Vite | 7.3 | Build / dev server |
| React Router | 7.9 | Navegación SPA |
| TanStack Query | 5.90 | Cache y estado de servidor |
| TailwindCSS | 3.4 | Estilos |
| React Hook Form + Zod | 7.65 + 3.25 | Formularios |
| Axios | 1.12 | Cliente HTTP / GraphQL |
| vite-plugin-pwa | 1.1 | Service Worker / instalable |
| date-fns | 4.1 | Fechas |
| Lucide React | 0.546 | Iconos |
| Sonner | 2.0 | Toasts |
| @radix-ui/react-dialog | 1.1 | Modal de respuestas |

---

## Terminología Fulla

| Backend | Fulla |
|---|---|
| Group | **Hilo** — grupo de preguntas |
| Answer | **Respuesta** — respuesta de un usuario a una pregunta |
| **Category** | **Nudo** — agrupación temporal de preguntas (ej: Despertando, Mañana, Tarde, Noche). Los colores se asignan localmente con `nudoColor()`. |
| Collection | **Bitácora** — registro diario de respuestas |

> **Nota:** "Nodo" no es un término en uso. Las respuestas son simplemente "respuestas".
>
> Un **Nudo** contiene múltiples **Hilos**. Cada Hilo a su vez tiene preguntas.
> La query `categories` del backend devuelve los Nudos disponibles. Actualmente **solo con host token**.
>
> **Nudos conocidos (hardcodeados en `getNudos()` en api.ts):**
> | ID | Nombre |
> |---|---|
> | f32d0ca0-fb3d-4326-9738-bba153be51c2 | Waking Up |
> | 019b339c-aa65-45ed-8e8d-f4dff30520c4 | Morning |
> | 79ebd774-4516-424d-abc5-78462df1fe74 | Meal |
> | 2098930f-bef7-483b-9f79-7efc68fc1f70 | Afternoon |
> | b3798f9e-55a4-45b7-94f6-eef49c0a343a | Evening |
> | 4a769c30-5b59-4ab8-be5e-d9a74b4350a3 | Night |
>
> **Gotcha `currentUser.groups`:** devuelve **nombres** de grupos, no UUIDs.
> Los UUIDs reales de los hilos se derivan de `answer.question.groupId`.
> Los nombres de hilos se cachean en `localStorage('fulla:group-names')` cuando el host visita BitacorasTab.

---

## Credenciales de prueba

| Rol | Identificador | Password |
|---|---|---|
| Host | ismael.peregrina@gmail.com | Verona.52 |
| User | MrPilgrim | Verona.52 |
| User | azul0078 | Mordecay.52 |
| User | MarceMIT | Thinking.24 |

> ⚠️ `calavera.many / Verona.52` no funciona — password incorrecta

---

## Arquitectura de archivos

```
fulla/
├── scripts/
│   ├── test-api.js         ← Tests de todos los endpoints (auth, data)
│   └── test-screens.js     ← Diagnóstico de datos por pantalla
└── src/
    ├── components/
    │   └── BraidCanvas.tsx    ← Visualización canvas de trenza por Nudo
    ├── contexts/
    │   └── AuthContext.tsx ← Login host/user + localStorage session
    ├── pages/
    │   ├── SignIn.tsx
    │   ├── host/
    │   │   ├── HostDashboard.tsx   ← Shell con 4 tabs (rutas absolutas)
    │   │   └── tabs/
    │   │       ├── BitacorasTab.tsx   ✅ COMPLETO
    │   │       ├── HilosTab.tsx       🚧 STUB
    │   │       ├── UsuariosTab.tsx    🚧 STUB
    │   │       └── PerfilTab.tsx      🚧 STUB
    │   └── user/
    │       ├── UserDashboard.tsx   ← Shell con 4 tabs: Nudos, Hilos, Historial, Perfil
    │       └── tabs/
    │           ├── NudosTab.tsx       ✅ COMPLETO (pantalla principal con BraidCanvas)
    │           ├── HilosTab.tsx       ✅ COMPLETO (lista de hilos del usuario, read-only)
    │           ├── HistorialTab.tsx   🚧 STUB
    │           └── PerfilTab.tsx      🚧 STUB
    ├── services/
    │   └── api.ts          ← Cliente GraphQL (Axios). Todas las queries/mutations
    ├── types/
    │   └── index.ts        ← Tipos: Hilo, Nudo, Respuesta, Bitacora, etc.
    └── lib/
        └── utils.ts        ← cn(), formatDate(), toDate(), dateToISO()
```

---

## Progreso por pantalla

### AUTH

| Pantalla | Estado | Notas |
|---|---|---|
| Sign In | ✅ Completo | Detecta Host (email) vs User (username). Conectado al backend real. |

---

### HOST (`/host/*`)

| Tab | Estado | Notas |
|---|---|---|
| **Bitácoras** `/host/bitacoras` | ✅ **Completo** | Tema claro. Grupos por fecha → usuario → respuestas. |
| **Hilos** `/host/hilos` | ✅ **Completo** | Lista + crear + eliminar. Detalle en `/host/hilos/:id` con 2 tabs: Usuarios (invitar, agregar existente, remover) y Preguntas (crear con nudo picker, eliminar). |
| **Usuarios** `/host/usuarios` | ✅ **Completo** | Lista usuarios + invitaciones pendientes. Invitar por email. Cancelar invitación. Detalle en `/host/usuarios/:id` con info, hilos (agregar/quitar), calendario de bitácoras con respuestas por día. |
| **Perfil** `/host/perfil` | ✅ **Completo** | Avatar (localStorage), email, nombre, logout. |

---

### PLAN HOST — basado en app original (`../habitos`)

#### 1. HilosTab (host) — `/host/hilos` 🔨 EN PROGRESO

**Lista de hilos:**
- [x] `hilosApi.list()` → nombre, # usuarios, # preguntas por hilo
- [x] Botón "Nuevo hilo" → Dialog con input nombre → `hilosApi.create(name)`
- [x] Botón eliminar hilo → confirmación → `hilosApi.remove(id)`
- [x] Tap en hilo → **Detalle del Hilo** en `/host/hilos/:id`

**Detalle del Hilo — tab Usuarios:**
- [x] Lista de usuarios + invitaciones pendientes en ese hilo
- [x] Botón "Invitar" → Dialog email → `invitacionesApi.send(email, groupId)`
- [x] Botón "Agregar existente" → Modal lista usuarios → `hilosApi.addUser(userId, groupId)`
- [x] Botón remover usuario → confirmación → `hilosApi.removeUser(userId, groupId)`
- [x] Cancelar invitación → `invitacionesApi.remove(id)`

**Detalle del Hilo — tab Preguntas:**
- [x] Lista de preguntas con badge del Nudo (color)
- [x] Botón "Agregar pregunta" → Dialog con texto + selector de Nudo → `preguntasApi.create(body, groupId, categoryId)`
- [x] Botón eliminar pregunta → confirmación → `preguntasApi.remove(id)`
- [ ] Editar pregunta → ⏳ pendiente backend (`updateQuestion` mutation no existe aún)

---

#### 2. UsuariosTab (host) — `/host/usuarios` 🚧 PENDIENTE

**Lista de usuarios:**
- [x] `usersApi.list()` + `invitacionesApi.listMine()` → usuarios activos + pendientes separados
- [x] Botón "Invitar" → Dialog email → `invitacionesApi.send(email)`
- [x] Cancelar invitación → confirmación → `invitacionesApi.remove(id)`
- [x] Tap usuario → `/host/usuarios/:id`
- [ ] Eliminar usuario → ⏳ pendiente backend (`usersApi.delete` no existe)

**Detalle de Usuario (`/host/usuarios/:id`):**
- [x] Avatar iniciales, nombre, username, email
- [x] Lista de hilos donde el usuario es miembro (desde `hilosApi.list()` filtrado)
- [x] Botón "Agregar a hilo" → Modal → `hilosApi.addUser(userId, groupId)`
- [x] Quitar de hilo → confirmación → `hilosApi.removeUser(userId, groupId)`
- [x] Calendario de bitácoras del usuario → días marcados
- [x] Tap en día marcado → respuestas de ese día (pregunta + respuesta + nudo)

---

#### 3. Bitácoras — detalle por usuario+fecha 🚧 PENDIENTE

- [ ] Desde detalle de usuario → tap en día → vista `/host/bitacoras/[fecha]?userId=[id]`
- [ ] Mostrar respuestas de ese usuario específico en esa fecha
- [ ] Reusar data de `bitacorasApi.list(userId)` ya cacheada

---

#### APIs disponibles vs pendientes de backend

| Operación | API en fulla | Estado |
|---|---|---|
| Crear hilo | `hilosApi.create(name)` | ✅ |
| Eliminar hilo | `hilosApi.remove(id)` | ✅ |
| Agregar usuario a hilo | `hilosApi.addUser(userId, groupId)` | ✅ |
| Quitar usuario de hilo | `hilosApi.removeUser(userId, groupId)` | ✅ |
| Crear pregunta | `preguntasApi.create(body, groupId, categoryId)` | ✅ |
| Eliminar pregunta | `preguntasApi.remove(id)` | ✅ |
| **Editar pregunta** | — | ⏳ Pendiente backend |
| Invitar usuario | `invitacionesApi.send(email, groupId?)` | ✅ |
| Cancelar invitación | `invitacionesApi.remove(id)` | ✅ |
| **Eliminar usuario** | — | ⏳ Pendiente backend |
| **Editar nombre host** | — | ⏳ Verificar mutation `updateHost` |

---

### USER (`/user/*`)

| Tab | Estado | Notas |
|---|---|---|
| **Nudos** `/user` | ✅ **Completo** | BraidCanvas/Nudo, satélites=Hilos. Modal con lápiz de edición. Respuestas: create si nueva, update si ya existe hoy. staleTime 10min. |
| **Hilos** `/user/hilos` | ✅ **Completo** | Lista read-only, fondo `#EDE9F8`, nudos como badges de color. |
| **Historial** `/user/historial` | ✅ **Completo** | Lista paginada (20/página) de todas las respuestas ordenadas por fecha. Reusar cache `['respuestas-all']`. |
| **Perfil** `/user/perfil` | ✅ **Completo** | Avatar iniciales, afiliaciones (nombres de hilos), botón Desconectar funcional. |


---

## Bugs conocidos y resueltos

| Bug | Causa | Fix |
|---|---|---|
| Tabs → pantalla oscura | NavLinks con rutas relativas mal resueltas en RR v7 | Rutas absolutas `/host/hilos`, etc. |
| `loginUser` fallaba | Backend usa campo `email` no `username` en `LoginUserInput` | Cambiado en `api.ts` |
| Pantalla oscura post-login Host | Fechas de Collection son Unix ms, no ISO string → `date-fns` crasheaba | `toDate()` en utils maneja ambos formatos |
| `HoyTab` → Unauthorized | `groups` query es host-only. Users deben usar `group(id)` por cada ID | `hilosApi.getByIds(ids)` con Promise.all |

---

## Queries GraphQL — lo que sabemos del backend real

```graphql
# Queries disponibles
currentHost               # solo con host token
currentUser               # solo con user token
groups                    # host-only — lista todos los grupos del host
group(id: ID!)            # funciona con ambos tokens
users                     # host-only
answers(userId, date)     # date filter disponible pero comportamiento incierto
collections(userId)       # funciona con host token; con user token no probado
categories                # funciona con host token — devuelve los Nudos del sistema

# Mutations disponibles
loginHost(input: { email, password })
loginUser(input: { email, password })  # "email" es el username en realidad
createGroup(input: { name })
updateGroup(id, input: { name })
removeGroup(id)
createQuestion(input: { body, groupId, categoryId })
removeQuestion(id)
createAnswer(input: { body, questionId, timezone })
updateAnswer(id, body)
removeAnswer(id)
sendInvite(input: { email, groupId? })
acceptInvite(input: { id })
removeInvite(id)
addUserToGroup(userId, groupId)
removeUserFromGroup(userId, groupId)
```

### Gotchas del backend
- `LoginUserInput.email` acepta el **username** como valor (naming confuso del backend)
- `Collection.date` es **Unix ms timestamp** como string (ej: `"1773100800000"`)
- `groups` y `users` son **host-only** — usuarios deben usar `group(id)` individual
- `invites` es **host-only** — Unauthorized con user token
- `categories` no tiene campo `color` — se asigna color localmente por index con `nudoColor()`
- `answers` query: el filtro por `date` tiene comportamiento incierto — se filtra localmente por `createdAt`

---

## Cómo correr el proyecto (desde sesión nueva)

```bash
# 1. Cargar Node
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh"

# 2. Levantar dev server
cd ~/projects/fulla
npm run dev
# → http://localhost:3000

# 3. Correr tests de API
node scripts/test-api.js

# 4. Correr diagnóstico de pantallas
node scripts/test-screens.js

# 5. Sincronizar cambios del Windows path al WSL2 path
rsync -a --exclude='.git' --exclude='node_modules' \
  "/mnt/c/Users/IsmaelPeregrinaRamir/OneDrive - Christus CEI/Documentos/Codigo/Git/DeltaHabits/fulla/" \
  ~/projects/fulla/
```

> ⚠️ El código vive en DOS lugares:
> - **Editar aquí:** `/mnt/c/.../DeltaHabits/fulla/` (Windows, accesible desde IDE)
> - **Correr aquí:** `~/projects/fulla/` (WSL2 Linux, sin problemas de permisos NTFS)
> - Siempre hacer `rsync` después de editar antes de probar

---

## Pendientes backend (para exponer con user token)

| Endpoint | Estado | Impacto |
|---|---|---|
| `categories` con user token | ⏳ Pendiente | Reemplazar `getNudos()` hardcodeado por llamada real |
| `group(id)` con user token | ⏳ Pendiente | Obtener nombres de hilos sin depender del cache del host |

## Identidad gráfica

| Asset | Estado | Notas |
|---|---|---|
| PWA icons (192/512) | ✅ | Generados con `node scripts/generate-icons.js` (requiere `sharp`) desde `images/logo.jpg` |
| Logo en SignIn | ✅ | PNG transparente sobre fondo `#2D2440` |
| Logo en tab Nudos | ✅ | 28px junto al saludo |
| Logo fuente | `images/logo.jpg` (bg sólido) + `images/logo_png.png` (transparente) | |

## Siguiente paso sugerido

Implementar en este orden:
1. `HistorialTab` (user) — calendario con respuestas por día
2. `PerfilTab` (user) — info del usuario + cerrar sesión
3. `HilosTab` (host) — gestión de grupos/preguntas
4. `UsuariosTab` (host) — invitaciones y gestión de participantes
5. `PerfilTab` (host) — simple, cierre de sesión
