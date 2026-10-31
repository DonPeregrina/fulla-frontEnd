# Mnestics

PWA para registrar hábitos y respuestas diarias. El host (coach/terapeuta) crea **Hilos** con preguntas, invita **usuarios** y revisa sus **Bitácoras**; el usuario responde preguntas organizadas por **Nudo** (momento del día) y las ve en una trenza animada.

- **Marca:** Mnestics — `mnestics.app`. Antes se llamaba Fulla: el paquete y las claves de `localStorage` ya son `mnestics`, y al arrancar la app migra las claves `fulla:*` viejas para no perder sesiones ni avatares. La carpeta del repo local y los nombres de recursos de Azure no se renombraron.
- **Sitio:** https://purple-pebble-004ec2710.7.azurestaticapps.net
- **Backend:** `https://delta-habits.azurewebsites.net/graphql` — repo aparte: [Delta-Habits/backend](https://github.com/Delta-Habits/backend) (ver sección *Backend*)
- **Última verificación de este README:** 2026-10-09

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.1 | UI |
| Vite | 7 | Build / dev server (puerto **3000**) |
| React Router | 7.9 | Navegación SPA |
| TanStack Query | 5.90 | Cache y estado de servidor |
| TailwindCSS | 3.4 | Estilos |
| Radix UI | — | Dialog, Tabs, Select, etc. |
| React Hook Form + Zod | 7.65 + 3.25 | Formularios (uso mínimo, 1 archivo) |
| Axios | 1.12 | Cliente GraphQL |
| vite-plugin-pwa | 1.1 | Service Worker / manifest |
| date-fns, lucide-react, sonner, motion | — | Fechas, iconos, toasts, animación |

## Terminología

| Backend | Producto | Qué es |
|---|---|---|
| Group | **Hilo** | Grupo de preguntas |
| Category | **Nudo** | Momento del día (agrupa preguntas). Colores asignados en el front con `nudoColor()` |
| Answer | **Respuesta** | Respuesta de un usuario a una pregunta |
| Collection | **Bitácora** | Registro diario de respuestas |

Nudos conocidos (hardcodeados en `NUDOS_HARDCODED`, `src/services/api.ts`):

| ID | Nombre |
|---|---|
| f32d0ca0-fb3d-4326-9738-bba153be51c2 | Waking Up |
| 019b339c-aa65-45ed-8e8d-f4dff30520c4 | Morning |
| 79ebd774-4516-424d-abc5-78462df1fe74 | Meal |
| 2098930f-bef7-483b-9f79-7efc68fc1f70 | Afternoon |
| b3798f9e-55a4-45b7-94f6-eef49c0a343a | Evening |
| 4a769c30-5b59-4ab8-be5e-d9a74b4350a3 | Night |

---

## Correr en local

Requisitos: Node 20+, npm.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # tsc -b && vite build -> dist/
npm run preview
```

Variables (`.env`, ver `.env.example`):

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://delta-habits.azurewebsites.net` (default si no se define) |

Scripts en `scripts/` (Node 18+, pegan al backend **real**):

| Script | Para qué |
|---|---|
| `node scripts/test-api.js` | Prueba de endpoints (auth + datos). Requiere `.env.test` |
| `node scripts/test-data-model.js` | Valida el modelo de datos |
| `node scripts/test-nudos.js` | Prueba de Nudos |
| `node scripts/test-screens.js` | Diagnóstico de datos por pantalla |
| `node scripts/ping-backend.js` | Monitorea el arranque del backend (cold start) |
| `node scripts/generate-icons.js` | Genera los íconos de la PWA con la μ (192, 512, maskable 512, apple-touch 180, favicon 32 y `favicon.ico`) desde `images/NewMnestics/mnestics_usuario_1024.png` (versión oscura). Requiere `npm i --no-save sharp` |

## Credenciales de prueba

> ⚠️ Entorno de pruebas. Están en texto plano por decisión del equipo; **ver el plan de seguridad abajo**.

| Rol | Identificador | Password |
|---|---|---|
| Host | ismael.peregrina@gmail.com | Verona.52 |
| User | MrPilgrim | Verona.52 |
| User | azul0078 | Mordecay.52 |
| User | MarceMIT | Thinking.24 |

`calavera.many / Verona.52` ya no funciona (password incorrecta). Los scripts de `scripts/` ya **no** llevan las credenciales: las leen de `.env.test` (ignorado por git; copiar `.env.test.example` y llenarlo con la tabla de arriba) o de variables de entorno `MN_HOST_EMAIL`, `MN_HOST_PASSWORD`, `MN_USER_ID`, `MN_USER_PASSWORD`, `MN_EXTRA_USERS`.

---

## Despliegue (Azure Static Web Apps)

Cada push a `main` (y PRs contra `main`) dispara `.github/workflows/azure-static-web-apps-purple-pebble-004ec2710.yml`:

1. Node 20, `npm ci`
2. `npm run build` con `VITE_API_URL` desde el secret de GitHub
3. Deploy de `dist/` con `skip_app_build: true` (sin Oryx)

`public/staticwebapp.config.json` define el fallback SPA a `/index.html`, los MIME types y `Cache-Control: no-cache`.

**Estado verificado (2026-10-09):** el sitio carga bien — `index.html`, JS, CSS, iconos, `manifest.webmanifest`, `sw.js` y rutas SPA (`/signin`) responden 200 con el MIME correcto, y el bundle apunta a `delta-habits.azurewebsites.net`. El problema de "app en blanco" de abril está resuelto. El login en producción volvió a funcionar el 2026-10-12 (ver *Backend*).

### Backend

Repo: `Delta-Habits/backend` (local: `GIT/HabiOS/backend`). Express + Apollo Server 4 + Prisma 4.14, además de endpoints REST (`/oauth`, `/users`, `/answers`, `/questions`, `/invites`, `/greetings`).

| Pieza | Detalle |
|---|---|
| Hosting | Azure App Service `delta-habits` (Linux, plan Basic, contenedor Docker), resource group `DeltaHabits`, suscripción *Delta Habits* |
| Despliegue | GitHub Actions `main_delta-habits.yml`: build de imagen -> Docker Hub -> App Service. `scripts/start.sh` corre `prisma migrate deploy`, el seed (categorías) y luego la app |
| Base relacional | **Azure SQL** (servidor `dhwarehouse`, base `deltahabits`, Standard, siempre en línea) vía Prisma: usuarios, hosts, hilos, preguntas, invitaciones, categorías, notificaciones |
| Base de documentos | **MongoDB** vía mongoose: las **respuestas** (`answer.model.ts`, IDs de 24 hex). URI en la variable `MONGO_URI` del App Service |
| Secretos | Variables del App Service: `DATABASE_URL`, `MONGO_URI`, `JWT_SECRET`, `SENDGRID_API_KEY`, `AZURE_STORAGE_CONNECTION_STRING` |
| Auth | JWT (`id` + `role`), firmado con `JWT_SECRET`, **sin expiración** |

**Incidente 2026-10-09 -> 2026-10-12 (resuelto):** cualquier consulta que tocaba SQL fallaba con

```
Invalid `prisma.user.findUnique()` invocation:
Timed out fetching a new connection from the connection pool.
(Current connection pool timeout: 10, connection limit: 3)
```

`{ __typename }` respondía, pero no había login. Se descartó la base de datos (en línea) y el firewall (`AllowAllWindowsAzureIps` activo). Se arregló reiniciando el App Service (`az webapp restart -n delta-habits -g DeltaHabits`); tardó ~2.5 min en volver. `scripts/test-api.js` pasa 14/18; los 4 fallos son esperados (campo `username` inexistente, `calavera.many` con password inválida e `invites` solo host). La causa raíz (pool agotado) no se identificó: falta revisar los logs del contenedor y definir `connection_limit` / `pool_timeout` en `DATABASE_URL`.

Si vuelve a pasar: reiniciar el App Service y verificar con `node scripts/ping-backend.js` y `node scripts/test-api.js`.

---

## Estado de la app

### Usuario (`/user/*`) — rediseño Mnestics (junio 2026)

Barra inferior con 3 tabs:

| Tab | Ruta | Archivo | Notas |
|---|---|---|---|
| Nodo | `/user` | `NudosTab.tsx` | Pantalla principal: `BraidCanvas` (trenza por Nudo), selector de momento, crear/editar respuesta del día |
| Diario | `/user/historial` | `HistorialTab.tsx` | Lista paginada (20/página) de respuestas |
| Perfil | `/user/perfil` | `PerfilTab.tsx` | Avatar, afiliaciones, cerrar sesión |

`/user/hilos` y `/user/capturas` redirigen a `/user`. Header con `TopNavBar` y `StreakRow` (racha).

### Host (`/host/*`)

| Tab | Ruta | Notas |
|---|---|---|
| Bitácoras | `/host/bitacoras` | Respuestas por fecha → usuario |
| Hilos | `/host/hilos`, `/host/hilos/:id` | Crear/eliminar hilos. Detalle: usuarios (invitar, agregar, quitar) y preguntas (crear, editar, eliminar, selector de Nudo) |
| Usuarios | `/host/usuarios`, `/host/usuarios/:id` | Lista + invitaciones pendientes. Detalle: hilos del usuario, calendario de bitácoras y respuestas por día |
| Perfil | `/host/perfil` | Avatar (localStorage), email, nombre, cerrar sesión |

### Estructura

```
src/
├── App.tsx                 rutas + ProtectedRoute
├── components/             BraidCanvas, MnesticsLogo, Shell, StreakRow, TopNavBar
├── contexts/AuthContext    login host/user, sesión en localStorage ('mnestics:session')
├── lib/utils.ts            cn, formatDate, toDate, dateToISO
├── pages/
│   ├── SignIn.tsx          host (email) vs user (username)
│   ├── host/               HostDashboard, HiloDetail, UsuarioDetail, tabs/
│   └── user/               UserDashboard, tabs/
├── services/api.ts         cliente GraphQL (hilosApi, usersApi, invitacionesApi,
│                           preguntasApi, respuestasApi, bitacorasApi, healthApi)
└── types/index.ts          tipos + nudoColor()
```

---

## Limpieza realizada (2026-10-16)

- Eliminado el código huérfano: `CapturasTab.tsx`, `HilosTab.tsx` (usuario) y `HoyTab.tsx`, más la paleta de Tailwind `fulla` y los alias `nodosApi` / `dimensionesApi`.
- Eliminadas dependencias sin uso: `browser-image-compression`, `vaul`, `next-themes`, `@tanstack/react-query-devtools`, `workbox-window`.
- `npm audit fix`: **0 vulnerabilidades en dependencias de producción**. Quedan 7 en la cadena de build de Tailwind 3 (`braces`, `micromatch`, `postcss-selector-parser`…); solo afectan al desarrollo y arreglarlas exige migrar a Tailwind 4 (cambio mayor).
- Eliminados el 2026-10-09: `Redesign/mnestics/` (prototipo de Google AI Studio), `PROGRESS.md`, `ProjectStatus.md` y `DEPLOYMENT_AZURE.md` (guía de otro proyecto).

---

## Gotchas del backend

- `LoginUserInput.email` recibe el **username** del usuario.
- `Collection.date` es un Unix ms timestamp en string; usar `toDate()`.
- `groups`, `users`, `invites` y `categories` son **solo host**. El usuario debe usar `group(id)` por cada ID.
- `currentUser.groups` devuelve **nombres** de grupo, no UUIDs; los UUID reales salen de `answer.question.groupId`.
- `categories` no trae `color`; se asigna localmente.
- El filtro `date` de `answers` es poco fiable; se filtra en el cliente por `createdAt`.
- Mutations disponibles: `loginHost`, `loginUser`, `createGroup`, `updateGroup`, `removeGroup`, `createQuestion`, `updateQuestion`, `removeQuestion`, `createAnswer`, `updateAnswer`, `removeAnswer`, `sendInvite`, `acceptInvite`, `removeInvite`, `addUserToGroup`, `removeUserFromGroup`.

## Bugs resueltos (referencia)

| Bug | Causa | Fix |
|---|---|---|
| Tabs → pantalla oscura | NavLinks relativos mal resueltos en RR v7 | Rutas absolutas |
| `loginUser` fallaba | El backend espera `email`, no `username` | Cambiado en `api.ts` |
| Pantalla oscura post-login host | Fechas Unix ms rompían `date-fns` | `toDate()` en utils |
| Unauthorized en vista del usuario | `groups` es host-only | `hilosApi.getByIds()` con `group(id)` |
| App en blanco en Azure (abril) | MIME types / config de despliegue | `staticwebapp.config.json` + `output dist` |

---

## Pendientes

**Backend**
- [ ] Causa raíz del pool de Prisma agotado: revisar logs del contenedor y fijar `connection_limit` / `pool_timeout` en `DATABASE_URL` (el 2026-10-12 se resolvió solo con reinicio)
- [ ] Exponer `categories` con token de usuario (hoy los Nudos están hardcodeados)
- [ ] Exponer `group(id)` o `userQuestions` con token de usuario: sin eso, las preguntas nuevas del host no aparecen al usuario hasta que las contesta
- [ ] Eliminar usuario (`usersApi.delete` no existe) y editar nombre del host (verificar `updateHost`)

**Front**
- [ ] Ruta propia de bitácora por usuario+fecha del host (`/host/bitacoras/:fecha?userId=`); hoy el detalle de usuario ya muestra el calendario y las respuestas por día
- [x] Host: bitácora con los días correctos (se mostraban dos días atrás), con todos los usuarios de cada día (antes solo el primero), últimos 30 días + "Ver 90 días más" y respuestas al abrir cada usuario/día. El calendario del detalle de usuario marcaba un día de menos
- [x] Host: en las preguntas de un hilo, contador de respuestas y botón "Cambiar de hilo" (necesita `updateQuestion` con `groupId` y `Question.answerCount` del backend)
- [x] Racha por día local (antes agrupaba por UTC y se quedaba corta: 2 en lugar de 5) y no se rompe si hoy aún no se contesta. `collections(timezone)` en el backend + `src/lib/streak.ts`
- [x] Diario: navegación acotada del primer mes con registro al mes actual y selector de año
- [ ] Historial: mostrar el contador del mes ("N días con registro este mes") para motivar al usuario. Los datos ya están en memoria: `HistorialTab` baja el mes completo una sola vez (`answersBetween`), de ahí salen la marca y el conteo de cada día y el detalle al tocar un día, sin más llamadas. Al guardar una respuesta se invalidan las consultas del mes y de la racha (`respuestas-month`, `bitacoras-dates`)
- [ ] Migrar a Tailwind 4 (cierra las 7 vulnerabilidades de build que quedan)

**Seguridad (siguiente fase)**
- [x] Dependencias de producción sin vulnerabilidades (`npm audit`)
- [x] Credenciales fuera de `scripts/*.js` (ahora en `.env.test`, ignorado por git)
- [ ] **Backend: `.env` estuvo trackeado en git desde 2023** (historial con llaves de SendGrid y Azure Storage). Ya está ignorado; falta rotar esas llaves (ver README del backend)
- [ ] Rotar las contraseñas de prueba (siguen en el historial de git y en este README) y decidir si se limpia el historial
- [ ] **Backend, se deja para el final:** `clients` (expone secretos OAuth) sin autenticación; `createHost`, `createClient` y `createRedirectUri` abiertos. `createHost` hoy es la forma de crear el primer super host; hay que construir esa función dentro de Mnestics, protegida por un admin, antes de cerrarlo. Además: JWT sin expiración, errores de Prisma expuestos, CORS `*` (configuración del App Service), `console.log` con datos de usuarios, `Dockerfile` sin versión fija. Detalle en el README del backend.
- [ ] Token de sesión en `localStorage` (evaluar alternativas)
