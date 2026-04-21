# 🚀 Deployment en Azure Static Web Apps

Guía paso a paso para desplegar la PWA MedPacX en Azure Static Web Apps.

---

## 📋 Tabla de Contenidos

1. [¿Qué es Azure Static Web Apps?](#qué-es-azure-static-web-apps)
2. [Pre-requisitos](#pre-requisitos)
3. [Paso a Paso: Deployment](#paso-a-paso-deployment)
4. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
5. [Instalación como PWA en Android/iOS](#instalación-como-pwa-en-androidios)
6. [Troubleshooting](#troubleshooting)

---

## 🤔 ¿Qué es Azure Static Web Apps?

Azure Static Web Apps es un servicio que:

✅ **Hostea tu frontend** (React, Vue, Angular, etc.)
✅ **HTTPS automático** con certificado SSL gratis
✅ **CI/CD integrado** con GitHub (deploy automático en cada push)
✅ **CDN global** (rápido en todo el mundo)
✅ **Free tier generoso** (100 GB ancho de banda/mes)

### **¿Esto nos da una PWA instalable?**

**SÍ!** Una vez desplegado:

1. **Web normal**: Accedes desde cualquier navegador → `https://tu-app.azurestaticapps.net`
2. **PWA instalable**:
   - En **Android**: Chrome muestra "Instalar app" → se agrega al home screen como app nativa
   - En **iOS**: Safari muestra "Agregar a pantalla de inicio" → funciona como app
   - En **Desktop**: Chrome/Edge muestran icono de instalación en la barra de URL

**No es lo mismo que App Service:**
- **App Service** = Para backends (APIs, bases de datos)
- **Static Web Apps** = Para frontends (React, HTML, CSS, JS)

---

## ✅ Pre-requisitos

Antes de comenzar, necesitas:

- [ ] Cuenta de Azure activa
- [ ] Repositorio GitHub: `https://github.com/CEIDataMeaning/MedpacX`
- [ ] Proyecto MedPacX-PWA funcionando localmente
- [ ] Azure CLI instalado (opcional, pero recomendado)

---

## 🎯 Paso a Paso: Deployment

### **Paso 1: Verificar que el proyecto compile**

Antes de desplegar, asegúrate que el build funciona:

```bash
cd /mnt/c/Proyectos/MedPacX-PWA
pnpm run build
```

✅ **Debe generar carpeta `dist/` sin errores**

Si hay errores, arregla antes de continuar.

---

### **Paso 2: Crear Azure Static Web App**

#### **Opción A: Desde Azure Portal (Recomendado - más visual)**

1. **Ir al Portal de Azure**
   - Abre: https://portal.azure.com

2. **Crear nuevo recurso**
   - Click en "Create a resource"
   - Busca: "Static Web App"
   - Click "Create"

3. **Configuración básica**
   ```
   Subscription:        [Tu suscripción de Azure]
   Resource Group:      [Mismo del backend - ej: rg-medpacx]
   Name:                medpacx-pwa
   Plan type:           Free (para MVP)
   Region:              Central US (o el más cercano)
   ```

4. **Configuración de GitHub**
   ```
   Source:              GitHub
   Organization:        CEIDataMeaning
   Repository:          MedpacX
   Branch:              main (o master, según tu repo)
   ```

5. **Build Presets**
   ```
   Build Presets:       Custom
   App location:        /
   Api location:        (dejar vacío)
   Output location:     dist
   ```

6. **Review + Create**
   - Revisa que todo esté correcto
   - Click "Create"
   - Espera 2-3 minutos

7. **Azure creará automáticamente:**
   - El recurso Static Web App
   - Un workflow de GitHub Actions en tu repo
   - Un deploy automático inicial

---

#### **Opción B: Con Azure CLI (Opcional - NO es necesario)**

**¿Para qué sirve el CLI?**
El Azure CLI es útil si quieres:
- Automatizar el deployment desde la terminal
- Crear recursos sin usar el portal web
- Integrar con scripts de CI/CD personalizados

**Para MedPacX NO es necesario usar CLI porque:**
1. Azure Portal es más visual y fácil
2. GitHub Actions ya maneja el CI/CD automático
3. Solo necesitas configurarlo una vez desde el portal

**Si decides usar CLI (opcional):**

```bash
# Login a Azure
az login

# Crear Static Web App
az staticwebapp create \
  --name medpacx-pwa \
  --resource-group rg-medpacx \
  --source https://github.com/CEIDataMeaning/MedpacX \
  --location "Central US" \
  --branch main \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github
```

---

### **Paso 3: Archivo staticwebapp.config.json (Ya está listo)**

**¿Para qué sirve este archivo?**

El archivo `staticwebapp.config.json` es **NECESARIO** para que tu PWA funcione correctamente en Azure. Este archivo le dice a Azure cómo manejar las rutas de tu Single Page Application.

**¿Por qué es importante?**

Sin este archivo:
- ❌ Si alguien recarga la página en `/dashboard`, Azure devolverá 404
- ❌ Las rutas de React Router no funcionarán correctamente
- ❌ El manifest.webmanifest no se servirá con el MIME type correcto

Con este archivo:
- ✅ Todas las rutas redirigen a `index.html` (SPA routing)
- ✅ Los assets (CSS, JS, imágenes) se sirven correctamente
- ✅ El manifest se sirve con el MIME type correcto para PWA

**Ya lo creamos por ti en:**
```
/mnt/c/Proyectos/MedPacX-PWA/staticwebapp.config.json
```

Este archivo:
- Redirige todas las rutas no encontradas a `index.html` (para React Router)
- Excluye los assets estáticos de esta regla
- Configura MIME types correctos para PWA
- Permite acceso anónimo a las rutas `/api/*`

**Azure lo detectará automáticamente** cuando hagas el deployment desde GitHub.

---

### **Paso 4: Verificar el Workflow de GitHub**

Azure creará automáticamente un archivo en tu repo:

```
.github/workflows/azure-static-web-apps-<random-id>.yml
```

Este archivo:
- Se ejecuta automáticamente en cada `push` a `main`
- Hace `pnpm install` y `pnpm build`
- Sube la carpeta `dist/` a Azure

**Verificar:**
1. Ve a tu repo: https://github.com/CEIDataMeaning/MedpacX
2. Click en "Actions"
3. Deberías ver un workflow corriendo o completado

---

### **Paso 5: Obtener la URL de tu app**

Una vez que el workflow termina:

1. **Opción 1: Desde Azure Portal**
   - Ve a tu Static Web App: `medpacx-pwa`
   - En "Overview" verás la URL:
   ```
   https://[random-name].azurestaticapps.net
   ```

2. **Opción 2: Desde CLI**
   ```bash
   az staticwebapp show \
     --name medpacx-pwa \
     --resource-group rg-medpacx \
     --query "defaultHostname" -o tsv
   ```

---

### **Paso 6: Configurar Dominio Personalizado (Opcional)**

Si quieres usar `medpacx.com` en lugar de `*.azurestaticapps.net`:

1. En Azure Portal → tu Static Web App
2. Click "Custom domains"
3. Add custom domain
4. Sigue instrucciones para configurar DNS

---

## ⚙️ Configuración de Variables de Entorno

### **IMPORTANTE: Diferencias desarrollo vs producción**

En **desarrollo** (localhost):
```env
VITE_API_BASE_URL=
# Vacío porque usa proxy de Vite
```

En **producción** (Azure):
```env
VITE_API_BASE_URL=https://medpacx.azurewebsites.net
# URL completa porque no hay proxy
```

### **Configurar en Azure Static Web Apps:**

1. **Portal Azure** → tu Static Web App
2. Click "Configuration"
3. Click "Application settings"
4. Add:
   ```
   Name:  VITE_API_BASE_URL
   Value: https://medpacx.azurewebsites.net
   ```
5. Add:
   ```
   Name:  VITE_APP_NAME
   Value: MedPacX
   ```
6. Add:
   ```
   Name:  VITE_ENV
   Value: production
   ```
7. Save

⚠️ **IMPORTANTE**: Después de agregar variables, necesitas re-deployar:
- Ve a GitHub Actions
- Re-run el último workflow
- O haz un pequeño cambio y push

---

## 📱 Instalación como PWA en Android/iOS

Una vez desplegado, cualquier usuario puede instalar la app:

### **Android (Chrome)**

1. Abre la URL en Chrome: `https://tu-app.azurestaticapps.net`
2. Chrome mostrará un banner: **"Instalar MedPacX"**
3. Click "Instalar"
4. La app se agrega al home screen
5. Funciona offline (gracias al Service Worker)

**Características:**
✅ Icono en home screen
✅ Splash screen al abrir
✅ Pantalla completa (sin barra del navegador)
✅ Funciona offline
✅ Push notifications (si las implementamos después)

### **iOS (Safari)**

1. Abre la URL en Safari: `https://tu-app.azurestaticapps.net`
2. Click en botón "Compartir" (cuadro con flecha)
3. Scroll y click "Agregar a pantalla de inicio"
4. Click "Agregar"

**Características:**
✅ Icono en home screen
✅ Splash screen al abrir
✅ Funciona offline
⚠️ Limitaciones iOS: No todos los Service Workers features

### **Desktop (Chrome/Edge)**

1. Abre la URL en Chrome/Edge
2. En la barra de URL, verás un icono de instalación (monitor/móvil)
3. Click en el icono
4. Click "Instalar"

---

## 🔄 Workflow Automático

Cada vez que hagas `git push` a `main`:

1. GitHub Actions detecta el push
2. Corre el workflow automáticamente:
   ```bash
   npm install (o pnpm install)
   npm run build
   ```
3. Sube el contenido de `dist/` a Azure
4. La app se actualiza automáticamente en ~2 minutos

**No necesitas hacer nada manual después del setup inicial!**

---

## 🐛 Troubleshooting

### **Problema 1: Build falla en GitHub Actions**

**Error:** `pnpm: command not found`

**Solución:** Azure usa `npm` por default. Necesitas especificar que uses `pnpm`.

Edita el workflow en `.github/workflows/azure-static-web-apps-*.yml`:

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 10

- name: Setup Node
  uses: actions/setup-node@v3
  with:
    node-version: '20'
    cache: 'pnpm'

- name: Install dependencies
  run: pnpm install

- name: Build
  run: pnpm build
```

---

### **Problema 2: Error de TypeScript en el build**

**Error:**
```
src/services/api/client.ts(31,12): error TS18048: 'config.baseURL' is possibly 'undefined'.
src/services/api/client.ts(31,29): error TS18048: 'config.url' is possibly 'undefined'.
```

**Causa:** TypeScript en modo estricto detecta valores potencialmente undefined en el logging.

**Solución:** Agregar null coalescing operators en `src/services/api/client.ts`:

```typescript
// ANTES (error):
url: config.baseURL + config.url,

// DESPUÉS (correcto):
url: (config.baseURL || '') + (config.url || ''),
```

---

### **Problema 3: Error "frozen-lockfile" con pnpm**

**Error:**
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json

specifiers in the lockfile don't match specifiers in package.json:
* 2 dependencies were added: @actions/core@^1.6.0, @actions/http-client@^2.2.3
```

**Causa:** El workflow de Azure necesita `@actions/core` y `@actions/http-client` para funcionar, pero estas dependencias no están en tu `pnpm-lock.yaml`.

**Solución:** Agregar las dependencias localmente y hacer commit del lockfile actualizado:

```bash
# En tu máquina local
pnpm add -D @actions/core@1.6.0 @actions/http-client

# Commit y push
git add package.json pnpm-lock.yaml
git commit -m "Add @actions dependencies for GitHub workflow"
git push
```

**¿Por qué son necesarias?**
- `@actions/core` y `@actions/http-client` son requeridas por el step `actions/github-script@v6` en el workflow
- Son solo devDependencies, no afectan tu aplicación en producción
- Se usan para obtener el token OIDC de Azure

---

### **Problema 4: Error "The number of static files was too large"**

**Error:**
```
The content server has rejected the request with: BadRequest
Reason: The number of static files was too large.
```

**Causa:** Azure Oryx está intentando deployar TODO el repositorio (incluyendo `node_modules/`) en lugar de solo la carpeta `dist/`.

**Solución:** Agregar `skip_app_build: true` en el workflow para que use tu build de pnpm en lugar del build automático de Oryx:

```yaml
- name: Build And Deploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_XXXX }}
    action: "upload"
    app_location: "/"
    output_location: "dist"
    skip_app_build: true  # 👈 IMPORTANTE: Evita que Oryx intente buildear
```

**Workflow completo recomendado:**

```yaml
# Install dependencies
- name: Install dependencies
  run: pnpm install --frozen-lockfile

# Build the app with environment variables
- name: Build app
  run: pnpm run build
  env:
    VITE_API_BASE_URL: https://medpacx.azurewebsites.net
    VITE_APP_NAME: MedPacX
    VITE_ENV: production

# Deploy only the dist/ folder
- name: Build And Deploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    skip_app_build: true
    output_location: "dist"
```

---

### **Problema 5: Unsupported Node.js version (18.x)**

**Error:**
```
npm warn EBADENGINE Unsupported engine {
  package: 'vite@7.1.11',
  required: { node: '^20.19.0 || >=22.12.0' },
  current: { node: 'v18.20.8' }
}
```

**Causa:** Azure Oryx usa Node.js 18 por defecto, pero Vite 7 requiere Node.js 20+.

**Solución:** Configurar explícitamente Node.js 20 en el workflow:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '20'  # 👈 Especifica Node 20
    cache: 'pnpm'
```

---

### **Problema 6: App carga pero login no funciona (CORS)**

**Causa:** El backend de Azure API necesita permitir tu nuevo dominio.

**Solución:** Configurar CORS en el backend FastAPI.

En el backend (Azure App Service), asegúrate que CORS permite:
```python
origins = [
    "https://medpacx-pwa.azurestaticapps.net",
    "http://localhost:5173",  # Para desarrollo
]
```

---

### **Problema 3: Variables de entorno no se aplican**

**Causa:** Azure no re-builda automáticamente al cambiar variables.

**Solución:**
1. Ve a GitHub Actions
2. Re-run el último workflow
3. O haz un commit vacío: `git commit --allow-empty -m "Trigger rebuild"`

---

### **Problema 4: PWA no se instala en móvil**

**Checklist:**
- [ ] ¿Usas HTTPS? (Azure lo da automáticamente)
- [ ] ¿Existe `manifest.json`? → Debería estar en `dist/manifest.webmanifest`
- [ ] ¿Existe Service Worker? → Vite PWA plugin lo genera
- [ ] ¿Los iconos existen? → Deberían estar en `public/icons/`

**Verificar manifest:**
1. Abre DevTools (F12)
2. Application tab
3. Manifest section
4. Debe mostrar tu manifest sin errores

---

## 📊 Comparación: Static Web Apps vs App Service

| Feature | Static Web Apps | App Service |
|---------|----------------|-------------|
| **Propósito** | Frontend (HTML, CSS, JS) | Backend (APIs, Servidores) |
| **MedPacX** | PWA React ✅ | FastAPI Backend ✅ |
| **HTTPS** | Automático ✅ | Requiere configuración |
| **CDN** | Incluido ✅ | Requiere Azure CDN |
| **CI/CD** | GitHub Actions incluido | Requiere configuración |
| **Costo Free Tier** | 100 GB/mes | 60 min CPU/día |
| **Mejor para** | PWAs, SPAs | APIs, Bases de datos |

---

## 🎉 Checklist Final

Después del deployment, verifica:

- [ ] Build exitoso en GitHub Actions
- [ ] App carga en `https://[tu-app].azurestaticapps.net`
- [ ] Login funciona correctamente
- [ ] Variables de entorno configuradas
- [ ] Manifest.json se sirve correctamente
- [ ] Service Worker se registra
- [ ] PWA instalable en Android Chrome
- [ ] PWA instalable en iOS Safari
- [ ] Iconos se ven correctamente

---

## 📞 Soporte

- **Documentación Azure:** https://docs.microsoft.com/azure/static-web-apps/
- **Logs de deployment:** GitHub Actions → Ver workflows
- **Logs de Azure:** Portal Azure → Static Web App → Logs

---

## 🔗 URLs Importantes

| Recurso | URL |
|---------|-----|
| **Repo GitHub** | https://github.com/CEIDataMeaning/MedpacX |
| **Backend API** | https://medpacx.azurewebsites.net |
| **Frontend PWA** | https://[tu-app].azurestaticapps.net |
| **Azure Portal** | https://portal.azure.com |

---

**Última actualización:** 2025-10-22
**Versión:** 1.0
**Autor:** Claude (Anthropic) + Ismael Peregrina
