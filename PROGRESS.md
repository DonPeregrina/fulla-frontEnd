# Fulla — Estado del Proyecto

> Última actualización: 2026-04-17
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

---

## Terminología Fulla

| Backend / App viejo | Fulla |
|---|---|
| Group | **Hilo** |
| Answer | **Nodo** |
| Category | **Dimensión** |
| Collection | **Bitácora** |

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
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx ← Login host/user + localStorage session
│   ├── pages/
│   │   ├── SignIn.tsx
│   │   ├── host/
│   │   │   ├── HostDashboard.tsx   ← Shell con 4 tabs (rutas absolutas)
│   │   │   └── tabs/
│   │   │       ├── BitacorasTab.tsx   ✅ COMPLETO
│   │   │       ├── HilosTab.tsx       🚧 STUB
│   │   │       ├── UsuariosTab.tsx    🚧 STUB
│   │   │       └── PerfilTab.tsx      🚧 STUB
│   │   └── user/
│   │       ├── UserDashboard.tsx   ← Shell con 3 tabs (rutas absolutas)
│   │       └── tabs/
│   │           ├── HoyTab.tsx         ✅ COMPLETO
│   │           ├── HistorialTab.tsx   🚧 STUB
│   │           └── PerfilTab.tsx      🚧 STUB
│   ├── services/
│   │   └── api.ts          ← Cliente GraphQL (Axios). Todas las queries/mutations
│   ├── types/
│   │   └── index.ts        ← Tipos: Hilo, Nodo, Bitacora, Dimension, etc.
│   └── lib/
│       └── utils.ts        ← cn(), formatDate(), toDate(), dateToISO()
```

---

## Progreso por pantalla

### AUTH

| Pantalla | Estado | Notas |
|---|---|---|
| Sign In | ✅ Completo | Detecta Host (email) vs User (username). Conectado al backend real. |

---

### HOST (`/host/*`)

| Tab | Estado | Pendiente |
|---|---|---|
| **Bitácoras** `/host/bitacoras` | ✅ **Completo** | Agrupa colecciones por fecha, expande por usuario, muestra nodos con pregunta. Fechas Unix ms manejadas. |
| **Hilos** `/host/hilos` | 🚧 Stub | Ver abajo — detalle completo |
| **Usuarios** `/host/usuarios` | 🚧 Stub | Ver abajo — detalle completo |
| **Perfil** `/host/perfil` | 🚧 Stub | Ver abajo |

#### HilosTab — pendiente
- [ ] Listar los 9 hilos del host (nombre, # usuarios, # preguntas)
- [ ] Botón "Nuevo Hilo" → dialog con campo nombre → `createGroup`
- [ ] Click en hilo → detalle del hilo:
  - [ ] Lista de preguntas con su dimensión/categoría
  - [ ] Lista de usuarios del hilo
  - [ ] Botón "Nueva Pregunta" → `createQuestion(body, groupId, categoryId)`
  - [ ] Botón "Invitar usuario" → `sendInvite(email, groupId)`
  - [ ] Eliminar pregunta → `removeQuestion(id)`
  - [ ] Quitar usuario del hilo → `removeUserFromGroup(userId, groupId)`
  - [ ] Eliminar hilo → `removeGroup(id)`

#### UsuariosTab — pendiente
- [ ] Listar los 10 usuarios (avatar, nombre, username, # grupos)
- [ ] Botón "Invitar" → dialog con email y opcionalmente grupo → `sendInvite(email, groupId?)`
- [ ] Click en usuario → detalle:
  - [ ] Info básica (nombre, username, email)
  - [ ] Lista de hilos a los que pertenece
  - [ ] Botón "Agregar a hilo" → `addUserToGroup(userId, groupId)`
  - [ ] Botón "Quitar de hilo" → `removeUserFromGroup(userId, groupId)`

#### PerfilTab (Host) — pendiente
- [ ] Mostrar nombre, email, avatar
- [ ] Botón "Editar nombre" → `updateHost` (verificar si existe la mutation)
- [ ] Botón "Cerrar sesión" → `logout()`

---

### USER (`/user/*`)

| Tab | Estado | Pendiente |
|---|---|---|
| **Hoy** `/user/hoy` | ✅ **Completo** | Carga preguntas por grupo (group(id) individual), responde nodos, barra de progreso, edición inline. |
| **Historial** `/user/historial` | 🚧 Stub | Ver abajo |
| **Perfil** `/user/perfil` | 🚧 Stub | Ver abajo |

#### HistorialTab — pendiente
- [ ] Calendario mensual con días marcados (tiene registro = indicador de color)
- [ ] Los días sin registro = sin marcador
- [ ] Click en día → lista de nodos de ese día (pregunta + respuesta)
- [ ] Usar `collections(userId)` — 197 bitácoras disponibles para MrPilgrim
- [ ] Fechas: vienen como Unix ms timestamps — usar `toDate()` de utils

#### PerfilTab (User) — pendiente
- [ ] Mostrar username, nombre, email, avatar
- [ ] Lista de hilos a los que pertenece
- [ ] Botón "Cerrar sesión" → `logout()`

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
categories                # funciona con host token

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
- `categories` no tiene campo `color` — se asigna color localmente por index con `dimensionColor()`

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

## Siguiente paso sugerido

Implementar en este orden:
1. `HilosTab` — el más importante para el host (gestión de grupos/preguntas)
2. `UsuariosTab` — invitaciones y gestión de participantes
3. `HistorialTab` — calendario de nodos del usuario
4. `PerfilTab` (host y user) — simple, cierre de sesión
