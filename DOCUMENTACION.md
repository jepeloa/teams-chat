# 🤖 Guía Completa: Bot de Microsoft Teams con IA

> Documentación paso a paso para crear un bot de Teams con inteligencia artificial usando Azure Bot Service (gratis) y servidor self-hosted.

---

## 📋 Tabla de Contenidos

1. [Resumen del Proyecto](#resumen-del-proyecto)
2. [Arquitectura](#arquitectura)
3. [Requisitos Previos](#requisitos-previos)
4. [Fase 1: Registro en Azure](#fase-1-registro-en-azure)
5. [Fase 2: Configuración del Proyecto](#fase-2-configuración-del-proyecto)
6. [Fase 3: Desarrollo Local](#fase-3-desarrollo-local)
7. [Fase 4: App Manifest de Teams](#fase-4-app-manifest-de-teams)
8. [Fase 5: Despliegue en Producción](#fase-5-despliegue-en-producción)
9. [Fase 6: Publicar en Teams](#fase-6-publicar-en-teams)
10. [Troubleshooting](#troubleshooting)

---

## Resumen del Proyecto

### ¿Qué vamos a construir?

Un bot para Microsoft Teams que:
- ✅ Recibe mensajes de usuarios (chats privados y canales)
- ✅ Procesa los mensajes con IA (OpenAI GPT-4)
- ✅ Responde automáticamente
- ✅ Mantiene historial de conversación
- ✅ **Costo de Microsoft: $0** (usando tier gratuito)

### Comparativa de Opciones

| Alternativa | Enviar | Recibir | Chats Privados | Costo MS | Estabilidad |
|-------------|--------|---------|----------------|----------|-------------|
| **Azure Bot (Free)** | ✅ | ✅ | ✅ | **$0** | Alta |
| Graph API | ✅ | ✅ | ✅ | $$$$ | Alta |
| Webhooks | ✅ | ⚠️ | ❌ | $0 | Media |
| Power Automate | ✅ | ⚠️ | ❌ | $0* | Alta |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARQUITECTURA DEL BOT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    Bot Framework    ┌─────────────────┐       │
│  │   Teams     │◄──────────────────►│  Tu Servidor    │       │
│  │   Cliente   │   (HTTPS)          │  (Node.js)      │       │
│  │             │                     │                 │       │
│  │  - Web      │                     │  Puerto 3978    │       │
│  │  - Desktop  │                     │                 │       │
│  │  - Mobile   │                     └────────┬────────┘       │
│  └─────────────┘                              │                │
│         │                                     │                │
│         ▼                                     ▼                │
│  ┌─────────────────┐              ┌─────────────────┐         │
│  │ Azure Bot       │              │   OpenAI API    │         │
│  │ Registration    │              │   (GPT-4)       │         │
│  │ (Solo registro, │              │                 │         │
│  │  gratis)        │              │  o LLM local    │         │
│  └─────────────────┘              │  (Ollama)       │         │
│                                   └─────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Mensajes

```
Usuario escribe en Teams
        │
        ▼
Microsoft Teams Server
        │
        ▼ (HTTPS POST a tu endpoint)
Tu Servidor (/api/messages)
        │
        ▼
Bot Framework SDK procesa
        │
        ▼
Llama a OpenAI API
        │
        ▼
Recibe respuesta IA
        │
        ▼
Envía respuesta a Teams
        │
        ▼
Usuario ve la respuesta
```

---

## Requisitos Previos

### Cuentas Necesarias

| Cuenta | URL | Costo |
|--------|-----|-------|
| Microsoft Azure | https://azure.microsoft.com/free | Gratis (con $200 crédito inicial) |
| Microsoft 365 | (tu cuenta de trabajo/escuela) | Ya existente |
| OpenAI | https://platform.openai.com | Pay-per-use (~$0.01-0.03 por request) |

### Software Necesario

```bash
# Node.js 18+ 
node --version  # debe ser >= 18.0.0

# npm
npm --version

# Git
git --version

# ngrok (para desarrollo local)
# Descargar de: https://ngrok.com/download
```

---

## Fase 1: Registro en Azure

### Paso 1.1: Crear Cuenta de Azure (si no tienes)

1. **Ir a**: https://azure.microsoft.com/free

2. **Clic en** "Start free"

3. **Iniciar sesión** con cuenta Microsoft existente o crear una nueva

4. **Completar verificación**:
   - Número de teléfono
   - Tarjeta de crédito (NO se cobra, solo verificación)

5. **Obtener**: $200 de crédito gratis por 30 días + servicios gratis por 12 meses

> ⚠️ **Nota**: Azure Bot Service tier F0 es **gratis permanentemente**, no consume el crédito.

---

### Paso 1.2: Acceder a Azure Portal

1. **Ir a**: https://portal.azure.com

2. **Iniciar sesión** con tu cuenta Microsoft

3. **Verificar** que estás en la suscripción correcta (esquina superior derecha)

---

### Paso 1.3: Crear Recurso Azure Bot

1. **Clic en** `+ Create a resource` (esquina superior izquierda, botón con icono +)

2. **En el buscador**, escribir: `Azure Bot`

3. **En resultados**, seleccionar "Azure Bot" (de Microsoft)

4. **Clic en** `Create`

5. **Completar formulario "Create an Azure Bot"**:

#### Pestaña: Basics

| Campo | Valor | Notas |
|-------|-------|-------|
| **Subscription** | Tu suscripción | Free Trial, Pay-As-You-Go, etc. |
| **Resource group** | `teams-bot-rg` | Clic "Create new" si no existe |
| **Bot handle** | `mi-teams-ai-bot` | ⚠️ Debe ser único globalmente |
| **Data residency** | `Global` | O selecciona tu región |
| **Pricing tier** | `F0` | ⚠️ **MUY IMPORTANTE: Seleccionar FREE** |

#### Pestaña: Microsoft App ID

| Campo | Valor |
|-------|-------|
| **Type of App** | `Multi Tenant` |
| **Creation type** | `Create new Microsoft App ID` |

6. **Clic en** `Review + create`

7. **Revisar** la configuración:
   ```
   Pricing tier: F0 (Free)    ✓
   Type of App: Multi Tenant  ✓
   ```

8. **Clic en** `Create`

9. **Esperar** 1-2 minutos hasta ver "Your deployment is complete"

10. **Clic en** `Go to resource`

---

### Paso 1.4: Obtener Microsoft App ID

1. **En tu recurso Azure Bot**, menú lateral izquierdo → `Configuration`

2. **Localizar** "Microsoft App ID" (GUID formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

3. **Copiar** este valor

4. **Guardar** en un archivo seguro:
   ```
   MICROSOFT_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

---

### Paso 1.5: Generar Client Secret (Password)

1. **En la página Configuration**, junto a "Microsoft App ID", clic en `Manage Password`
   
   > Esto abre una nueva pestaña: Azure Active Directory → App registrations

2. **En el menú izquierdo**, clic en `Certificates & secrets`

3. **En la sección "Client secrets"**, clic en `+ New client secret`

4. **Completar diálogo**:
   | Campo | Valor |
   |-------|-------|
   | **Description** | `Teams Bot Secret` |
   | **Expires** | `24 months` |

5. **Clic en** `Add`

6. ⚠️ **CRÍTICO: Copiar INMEDIATAMENTE el "Value"**
   
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │  ⚠️  ADVERTENCIA                                           │
   │                                                             │
   │  El valor del secret solo se muestra UNA VEZ.              │
   │  Si no lo copias ahora, tendrás que crear uno nuevo.       │
   │                                                             │
   │  Copia el "Value", NO el "Secret ID"                       │
   └─────────────────────────────────────────────────────────────┘
   ```

7. **Guardar** en archivo seguro:
   ```
   MICROSOFT_APP_PASSWORD=el-valor-del-secret-que-copiaste
   ```

---

### Paso 1.6: Habilitar Canal de Microsoft Teams

1. **Volver a tu recurso Azure Bot** 
   - Pestaña anterior, o
   - Buscar "Azure Bot" en portal, o
   - URL: https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.BotService%2FbotServices

2. **Menú izquierdo** → `Channels`

3. **En "Available channels"**, clic en el icono de **Microsoft Teams** (logo azul)

4. **Aceptar términos**:
   - Leer los términos de servicio
   - Marcar checkbox ✓
   - Clic `Agree`

5. **En pestaña "Messaging"**:
   - Verificar que está habilitado (toggle ON)
   - Dejar configuración por defecto

6. **Clic en** `Apply` (parte inferior)

7. **Verificar** en lista de canales:
   ```
   Microsoft Teams    Running ✓
   ```

---

### Paso 1.7: Configurar Messaging Endpoint

1. **Menú izquierdo** → `Configuration`

2. **En "Messaging endpoint"**, ingresar tu URL:
   ```
   https://tu-dominio.com/api/messages
   ```
   
   Ejemplos según tu hosting:
   | Hosting | URL |
   |---------|-----|
   | ngrok (desarrollo) | `https://abc123.ngrok-free.app/api/messages` |
   | Render.com | `https://mi-bot.onrender.com/api/messages` |
   | Railway | `https://mi-bot.up.railway.app/api/messages` |

3. **Clic en** `Apply`

---

### Resumen de Credenciales Obtenidas

Al finalizar la Fase 1, debes tener:

```bash
MICROSOFT_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_APP_PASSWORD=tu-client-secret-muy-largo
MICROSOFT_APP_TYPE=MultiTenant
```

---

## Fase 2: Configuración del Proyecto

### Paso 2.1: Estructura del Proyecto

El proyecto ya está creado con la siguiente estructura:

```
teams_chat/
├── src/
│   ├── index.js           # Servidor Express principal
│   ├── bot.js             # Lógica del bot (TeamsActivityHandler)
│   ├── config.js          # Configuración centralizada
│   └── openaiService.js   # Integración con OpenAI
├── appPackage/
│   ├── manifest.json      # Manifest de Teams App
│   ├── color.png          # Icono 192x192 (crear)
│   └── outline.png        # Icono 32x32 (crear)
├── .env                   # Variables de entorno (crear)
├── .env.example           # Ejemplo de variables
├── .gitignore
└── package.json
```

---

### Paso 2.2: Instalar Dependencias

```bash
cd /home/javier/teams_chat
npm install
```

---

### Paso 2.3: Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus valores reales
nano .env
```

Contenido del `.env`:

```env
# AZURE BOT CONFIGURATION
MICROSOFT_APP_ID=tu-app-id-de-azure
MICROSOFT_APP_PASSWORD=tu-client-secret-de-azure
MICROSOFT_APP_TYPE=MultiTenant

# SERVER CONFIGURATION
PORT=3978
NODE_ENV=development

# OPENAI CONFIGURATION
OPENAI_API_KEY=sk-tu-api-key-de-openai
OPENAI_MODEL=gpt-4

# DEBUG MODE
DEBUG_MODE=true
```

---

## Fase 3: Desarrollo Local

### Paso 3.1: Iniciar el Bot

```bash
# Modo desarrollo (con auto-reload)
npm run dev

# O modo normal
npm start
```

Deberías ver:

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🤖  TEAMS AI BOT - SERVIDOR INICIADO                   ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║   📡 Puerto: 3978                                         ║
║   🌍 Entorno: development                                 ║
║   🔗 Endpoint: http://localhost:3978/api/messages        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

### Paso 3.2: Configurar ngrok

#### Instalar ngrok

```bash
# Opción 1: Snap (Linux)
sudo snap install ngrok

# Opción 2: Descarga directa
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

#### Crear cuenta de ngrok (REQUERIDO)

1. Ir a https://ngrok.com/
2. Crear cuenta gratis
3. Ir a Dashboard → Your Authtoken
4. Copiar el token

```bash
# Configurar token
ngrok authtoken TU_AUTH_TOKEN_AQUI
```

#### Iniciar túnel

```bash
# En una nueva terminal (mantén el bot corriendo)
ngrok http 3978
```

Verás algo como:

```
Forwarding    https://abc123xyz.ngrok-free.app -> http://localhost:3978
```

**Copia la URL HTTPS** (ej: `https://abc123xyz.ngrok-free.app`)

---

### Paso 3.3: Actualizar Azure Bot

1. **Ir a** Azure Portal → tu Azure Bot → Configuration

2. **En "Messaging endpoint"**, pegar:
   ```
   https://abc123xyz.ngrok-free.app/api/messages
   ```

3. **Clic en** `Apply`

---

### Paso 3.4: Verificar Funcionamiento

```bash
# Verificar que el servidor responde
curl https://abc123xyz.ngrok-free.app/health
```

Debe responder:
```json
{"status":"healthy","uptime":123.456}
```

---

## Fase 4: App Manifest de Teams

### Paso 4.1: Actualizar manifest.json

Editar `appPackage/manifest.json` y reemplazar:

1. `TU-MICROSOFT-APP-ID-AQUI` con tu Microsoft App ID real (aparece 2 veces)

2. Actualizar información de desarrollador si deseas

---

### Paso 4.2: Crear Iconos

#### Opción A: Con ImageMagick

```bash
# Instalar ImageMagick
sudo apt-get install imagemagick

# Crear icono color (192x192)
convert -size 192x192 xc:'#5558AF' \
    -gravity center -fill white -pointsize 72 -annotate 0 'AI' \
    appPackage/color.png

# Crear icono outline (32x32)
convert -size 32x32 xc:transparent \
    -gravity center -fill white -pointsize 18 -annotate 0 'AI' \
    appPackage/outline.png
```

#### Opción B: Iconos por defecto

Puedes descargar iconos genéricos de https://icons8.com o crear los tuyos:
- `color.png`: 192x192 píxeles, color completo
- `outline.png`: 32x32 píxeles, blanco con fondo transparente

---

### Paso 4.3: Empaquetar la App

```bash
cd appPackage
zip -r ../teams-ai-bot.zip manifest.json color.png outline.png
cd ..
```

---

## Fase 5: Despliegue en Producción

### Opción A: Render.com (Recomendado - Free Tier)

1. **Crear cuenta** en https://render.com con GitHub

2. **New → Web Service** → Conectar repositorio

3. **Configurar**:
   | Campo | Valor |
   |-------|-------|
   | Name | `teams-ai-bot` |
   | Environment | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | `Free` |

4. **Agregar Variables** en Environment:
   ```
   MICROSOFT_APP_ID=tu-app-id
   MICROSOFT_APP_PASSWORD=tu-client-secret
   MICROSOFT_APP_TYPE=MultiTenant
   OPENAI_API_KEY=tu-openai-key
   PORT=10000
   NODE_ENV=production
   ```

5. **Deploy** y copiar URL

6. **Actualizar Azure Bot** con nueva URL

---

### Opción B: Railway

1. https://railway.app → Sign up con GitHub
2. New Project → Deploy from GitHub
3. Agregar variables
4. Deploy → Generate Domain
5. Actualizar Azure Bot

---

## Fase 6: Publicar en Teams

### Sideload para Pruebas

1. **Abrir Microsoft Teams**

2. **Apps** (barra lateral) → **Manage your apps**

3. **Upload an app** → **Upload a custom app**

4. **Seleccionar** `teams-ai-bot.zip`

5. **Add** → ¡El bot aparece en tu lista de chats!

---

### Publicar para la Organización

> Requiere permisos de administrador

1. **Teams Admin Center**: https://admin.teams.microsoft.com

2. **Teams apps** → **Manage apps** → **Upload new app**

3. **Subir** el ZIP y publicar

---

## Troubleshooting

### Bot no responde

```bash
# 1. Verificar que el servidor está corriendo
curl https://tu-url.com/health

# 2. Verificar endpoint en Azure
# Azure Portal → Bot → Configuration → Messaging endpoint

# 3. Verificar canal Teams habilitado
# Azure Portal → Bot → Channels → Teams = Running
```

### Error 401 Unauthorized

- Verificar App ID correcto
- Verificar Client Secret no expirado
- Sin espacios extra en variables de entorno

### OpenAI no responde

```bash
# Probar API directamente
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'
```

---

## Comandos Rápidos

```bash
# Desarrollo
npm run dev                    # Iniciar con auto-reload
ngrok http 3978               # Crear túnel

# Producción
npm start                     # Iniciar servidor

# Empaquetar app
cd appPackage && zip -r ../teams-ai-bot.zip * && cd ..
```

---

## URLs de Referencia

| Recurso | URL |
|---------|-----|
| Azure Portal | https://portal.azure.com |
| Teams Admin Center | https://admin.teams.microsoft.com |
| Bot Framework Docs | https://docs.microsoft.com/en-us/azure/bot-service |
| OpenAI API | https://platform.openai.com |
| ngrok | https://ngrok.com |
| Render.com | https://render.com |

---

**Última actualización:** Enero 2026
