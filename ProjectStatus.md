# 🌳 Fulla — PWA de Hábitos & Respuestas

**Fulla** es una aplicación web progresiva (PWA) para registrar respuestas a preguntas organizadas jerárquicamente por **Nudos** (momentos del día), **Hilos** (grupos de preguntas) y **Respuestas** (respuestas del usuario).

## 🎯 Estado del Proyecto

| Aspecto | Estado | Detalles |
|--------|--------|----------|
| **Frontend** | ✅ Completo | React 19, Vite 7, TailwindCSS |
| **Rutas** | ✅ Completo | User + Host dashboards con router |
| **Tabs usuario** | ✅ Completo | Nudos, Hilos, Historial, Perfil |
| **Tabs host** | ✅ Completo | Bitácoras, Hilos, Usuarios, Perfil |
| **PWA** | ✅ Completo | Service Worker, manifest, iconos |
| **Azure deployment** | 🚧 En curso | Build OK, pero app sale en blanco |
| **Backend** | 🔌 Integrado | GraphQL en `delta-habits.azurewebsites.net` |

---

## 🚀 Deployment

**URL viva:** https://purple-pebble-004ec2710.7.azurestaticapps.net

### Build Pipeline
```
GitHub push → npm ci → npm run build → dist/ → Azure CDN
```

**Workflow:** `.github/workflows/azure-static-web-apps-purple-pebble-004ec2710.yml`
- Node 20 setup
- npm build con `VITE_API_URL` desde secret
- `skip_app_build: true` (evita Oryx)
- Deploy a `/dist` con `staticwebapp.config.json`

---

## 🔍 Diagnóstico: App sale en blanco

**Síntomas:**
- ✅ Build en GitHub Actions: SUCCESS
- ✅ Deploy a Azure: SUCCESS
- ✅ URL carga: SÍ (muestra "Fulla")
- ❌ Assets CSS/JS: NO (página en blanco excepto texto "Fulla")

**Posibles causas:**

### 1. **staticwebapp.config.json no se encuentra**
El archivo debe estar en `public/` para que Azure lo detecte. Actualmente está en:
```
public/staticwebapp.config.json
```
✅ Existe. Pero revisar:
- ¿Se copia a `dist/` durante el build de Vite?
- ¿Azure lo está leyendo?

**Fix:** Verificar que Vite copie este archivo a `dist/`:
```bash
npm run build && ls -la dist/staticwebapp.config.json
```

### 2. **Assets path incorrectos**
Vite genera:
```
dist/assets/index-{HASH}.css
dist/assets/index-{HASH}.js
```

El `index.html` debe referenciarlos correctamente. Revisar:
```bash
cat dist/index.html | grep -E "href|src"
```

Si los paths son relativos, deberían ser OK. Si no cargan, Azure no está sirviendo los assets.

### 3. **Manifest o Service Worker con problemas**
Vite PWA plugin genera:
```
dist/manifest.webmanifest
dist/sw.js
dist/workbox-{HASH}.js
```

Si uno falla, puede romper toda la app.

**Fix:** Abre DevTools (F12) en `https://purple-pebble-004ec2710.7.azurestaticapps.net`:
- **Console tab:** ¿Hay errores?
- **Network tab:** ¿Qué recursos fallan (404)?
- **Application tab:** ¿Manifest cargó?

### 4. **Azure no está sirviendo `dist/` correctamente**
El workflow especifica:
```yaml
output_location: "dist"
skip_app_build: true
```

Pero Azure puede estar buscando en otro lugar.

**Fix:** Revisar logs en Azure Portal:
1. Portal → Static Web App `fulla-pwa`
2. Click "Build Details" en el último deployment
3. Ver logs de la ejecución

---

## 📋 Checklist para Debug

- [ ] `npm run build` localmente y verificar que `dist/` contiene todos los assets
- [ ] Verificar que `dist/staticwebapp.config.json` existe
- [ ] Abrir DevTools en la URL → Console/Network → identificar qué falla
- [ ] Revisar logs de Azure deployment
- [ ] Verificar que `VITE_API_URL` secret está configurado en Azure
- [ ] Forzar un re-deploy: push vacío a main (`git commit --allow-empty`)

---

## 🛠 Setup Local

### Requisitos
- Node.js 20+
- npm 10+

### Instalar & Correr
```bash
# Install
npm install

# Dev server (localhost:5173)
npm run dev

# Build production
npm run build

# Preview build
npm run preview

# Generate PWA icons
node scripts/generate-icons.js
```

### Variables de Entorno
**Desarrollo** (`localhost:5173`):
```env
VITE_API_URL=          # Vacío (usa proxy de Vite)
```

**Producción** (Azure):
```env
VITE_API_URL=https://delta-habits.azurewebsites.net
```

---

## 📁 Estructura

```
fulla/
├── src/
│   ├── pages/
│   │   ├── SignIn.tsx              ← Auth (email para host/@user para user)
│   │   ├── user/
│   │   │   ├── Dashboard.tsx       ← Rutas del usuario
│   │   │   └── tabs/
│   │   │       ├── NudosTab.tsx    ← BraidCanvas con constelación
│   │   │       ├── HilosTab.tsx    ← Lista de hilos del usuario
│   │   │       ├── HistorialTab.tsx ← Paginado 20/página
│   │   │       └── PerfilTab.tsx   ← Avatar, afiliaciones, logout
│   │   └── host/
│   │       ├── HostDashboard.tsx   ← Rutas del host
│   │       ├── HiloDetail.tsx      ← Detalle hilo (usuarios + preguntas)
│   │       ├── UsuarioDetail.tsx   ← Perfil usuario + calendario
│   │       └── tabs/
│   │           ├── BitacorasTab.tsx ← Respuestas por fecha
│   │           ├── HilosTab.tsx    ← Crear/editar/eliminar hilos
│   │           ├── UsuariosTab.tsx ← Invitar, listar, detalle
│   │           └── PerfilTab.tsx   ← Perfil host, logout
│   ├── components/
│   │   └── BraidCanvas.tsx         ← Visualización constelación
│   ├── services/
│   │   └── api.ts                  ← GraphQL + fetch mutations/queries
│   ├── types/
│   │   └── index.ts                ← Tipos + nudoColor() con mapa semántico
│   └── lib/
│       └── utils.ts                ← formatDate, toDate, todayISO
├── public/
│   ├── staticwebapp.config.json    ← Config Azure (SPA routing)
│   ├── logo_png.png                ← Logo transparente
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── manifest.webmanifest        ← PWA metadata
├── scripts/
│   └── generate-icons.js           ← Crea iconos desde logo.jpg
├── .github/workflows/
│   └── azure-static-web-apps-purple-pebble-004ec2710.yml
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

---

## 🎨 Terminología

| Backend | Fulla | Significado |
|---------|-------|------------|
| `Category` | **Nudo** | Momento del día (Waking Up, Morning, Meal, Afternoon, Evening, Night) |
| `Group` | **Hilo** | Grupo de preguntas (Nutricion, Achaques, ActividadEnDia, etc.) |
| `Question` | **Pregunta** | Pregunta dentro de un hilo |
| `Answer` | **Respuesta** | Respuesta del usuario a una pregunta |

---

## 🎨 Colores

| Nudo | Color Hex | Uso |
|-----|-----------|-----|
| Waking Up | `#FBBF24` | Amarillo sol (amanecer) |
| Morning | `#10b981` | Verde fresco |
| Meal | `#0D9488` | Teal/Aguamarina |
| Afternoon | `#f97316` | Naranja cálido |
| Evening | `#ec4899` | Rosa |
| Night | `#8b5cf6` | Morado |

**Tema claro:** Fondo `#EDE9F8`, cards blancas, texto `#2D2440`

---

## 📱 Instalación PWA

Una vez desplegado correctamente:

### Android (Chrome)
1. Abre la URL en Chrome
2. Banner: "Instalar Fulla" → Click
3. App se agrega al home screen

### iOS (Safari)
1. Abre la URL en Safari
2. Click compartir (cuadro con flecha)
3. "Agregar a pantalla de inicio" → Click

### Desktop (Chrome/Edge)
1. Click icono de instalación en barra de URL
2. Click instalar

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| **Build falla** | `npm run build` localmente, revisar errores de TypeScript |
| **App en blanco** | Ver sección [Diagnóstico](#-diagnóstico-app-sale-en-blanco) |
| **Login no funciona** | Revisar `VITE_API_URL` en Azure, revisar CORS en backend |
| **Icons no aparecen** | Ejecutar `node scripts/generate-icons.js`, pushear cambios |
| **PWA no se instala** | Verificar que HTTPS funciona (Azure lo da automáticamente) |

---

## 🔗 URLs

| Recurso | URL |
|---------|-----|
| **PWA viva** | https://purple-pebble-004ec2710.7.azurestaticapps.net |
| **Repo GitHub** | https://github.com/DonPeregrina/fulla-frontEnd |
| **Backend API** | https://delta-habits.azurewebsites.net/graphql |
| **Azure Portal** | https://portal.azure.com |

---

## 🚧 Pendientes Backend

| Feature | Estado | Impact |
|---------|--------|--------|
| `categories` con user token | ⏳ Pendiente | Reemplazar `getNudos()` hardcodeado |
| `group(id)` con user token | ⏳ **CRÍTICO** | Preguntas nuevas no aparecen hasta responder |
| `updateQuestion` mutation | ✅ Existe | Editar preguntas funciona |
| `deleteUser` mutation | ⏳ Pendiente | No se puede eliminar usuarios desde host |

---

## 📝 Licencia

Proyecto interno de Delta Habits.

---

**Última actualización:** 2026-04-22  
**Versión:** 0.1.0 (Alpha deployment)
