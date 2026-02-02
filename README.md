# Teams AI Bot - Documentación Técnica

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Diagrama de Flujo](#diagrama-de-flujo)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Configuración](#configuración)
6. [Componentes del Código](#componentes-del-código)
7. [Infraestructura](#infraestructura)
8. [Despliegue](#despliegue)
9. [Comandos Útiles](#comandos-útiles)
10. [Troubleshooting](#troubleshooting)

---

## Descripción General

Bot de Microsoft Teams integrado con inteligencia artificial (OpenAI GPT-4) que permite a los usuarios de una organización chatear con un asistente de IA directamente desde Teams.

### Características Principales

- ✅ Chat 1:1 con el bot desde Teams
- ✅ Respuestas generadas por GPT-4
- ✅ Historial de conversación por usuario
- ✅ Soporte para múltiples usuarios simultáneos
- ✅ Comandos especiales (/help, /clear, /status)
- ✅ Tarjeta de bienvenida interactiva

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MICROSOFT CLOUD                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐         ┌──────────────────┐         ┌───────────────┐  │
│   │              │         │                  │         │               │  │
│   │   Microsoft  │◄───────►│   Azure Bot      │◄───────►│   Azure AD    │  │
│   │    Teams     │         │   Service (F0)   │         │ (Auth/Entra)  │  │
│   │              │         │                  │         │               │  │
│   └──────────────┘         └────────┬─────────┘         └───────────────┘  │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ HTTPS
                                      │ POST /api/messages
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVIDOR (DigitalOcean)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐         ┌──────────────────────────────────────┐    │
│   │                  │         │           Docker Container           │    │
│   │   Caddy          │         │           (teams-ai-bot)             │    │
│   │   (SSL/HTTPS)    │────────►│                                      │    │
│   │                  │  :3978  │  ┌────────────┐    ┌──────────────┐ │    │
│   │  :443 ◄──────────│         │  │  Express   │───►│   Bot.js     │ │    │
│   │                  │         │  │  Server    │    │  (Handler)   │ │    │
│   └──────────────────┘         │  └────────────┘    └──────┬───────┘ │    │
│                                │                           │         │    │
│                                │                           ▼         │    │
│                                │                   ┌──────────────┐  │    │
│                                │                   │   OpenAI     │  │    │
│                                │                   │   Service    │  │    │
│                                │                   └──────────────┘  │    │
│                                │                           │         │    │
│                                └───────────────────────────┼─────────┘    │
│                                                            │              │
└────────────────────────────────────────────────────────────┼──────────────┘
                                                             │
                                                             ▼
                                               ┌──────────────────────┐
                                               │                      │
                                               │   OpenAI API         │
                                               │   (GPT-4)            │
                                               │                      │
                                               └──────────────────────┘
```

---

## Diagrama de Flujo

### Flujo de un Mensaje

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE MENSAJE COMPLETO                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ Usuario │
    │ Teams   │
    └────┬────┘
         │ 1. Envía "Hola, ¿cómo estás?"
         ▼
    ┌─────────────────┐
    │  Microsoft      │
    │  Teams Server   │
    └────────┬────────┘
             │ 2. Reenvía mensaje
             ▼
    ┌─────────────────┐
    │  Azure Bot      │
    │  Service        │
    └────────┬────────┘
             │ 3. POST /api/messages (con auth token)
             ▼
    ┌─────────────────┐
    │  Caddy (SSL)    │
    │  :443 → :3978   │
    └────────┬────────┘
             │ 4. Proxy a contenedor
             ▼
    ┌─────────────────┐
    │  Express.js     │
    │  index.js       │
    └────────┬────────┘
             │ 5. Valida autenticación Azure
             │ 6. Pasa a Bot Framework
             ▼
    ┌─────────────────┐
    │  Bot.js         │
    │  onMessage()    │
    └────────┬────────┘
             │ 7. Extrae texto y userId
             │ 8. ¿Es comando?
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌───────┐      ┌─────────────┐
│ /help │      │ Mensaje     │
│ /clear│      │ normal      │
│/status│      └──────┬──────┘
└───┬───┘             │
    │                 │ 9. Obtiene historial del usuario
    │                 ▼
    │          ┌─────────────────┐
    │          │  OpenAI Service │
    │          │  getResponse()  │
    │          └────────┬────────┘
    │                   │ 10. Arma prompt con historial
    │                   ▼
    │          ┌─────────────────┐
    │          │  OpenAI API     │
    │          │  GPT-4          │
    │          └────────┬────────┘
    │                   │ 11. Genera respuesta
    │                   ▼
    │          ┌─────────────────┐
    │          │  Guarda en      │
    │          │  historial      │
    │          └────────┬────────┘
    │                   │
    └─────────┬─────────┘
              │ 12. Respuesta
              ▼
    ┌─────────────────┐
    │  context.send   │
    │  Activity()     │
    └────────┬────────┘
             │ 13. Bot Framework envía respuesta
             ▼
    ┌─────────────────┐
    │  Azure Bot      │
    │  Service        │
    └────────┬────────┘
             │ 14. Entrega a Teams
             ▼
    ┌─────────────────┐
    │  Usuario ve     │
    │  respuesta      │
    └─────────────────┘
```

### Flujo de Autenticación

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE AUTENTICACIÓN                            │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  Azure Bot      │
    │  Service        │
    └────────┬────────┘
             │ Incluye JWT token en header
             │ Authorization: Bearer <token>
             ▼
    ┌─────────────────┐
    │  Nuestro Bot    │
    │  (index.js)     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────────────────────────────┐
    │  ConfigurationBotFrameworkAuthentication │
    │                                          │
    │  Valida:                                 │
    │  - Token firmado por Microsoft          │
    │  - AppId coincide                        │
    │  - Token no expirado                     │
    └────────┬────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌───────┐      ┌───────────┐
│ VÁLIDO│      │ INVÁLIDO  │
│       │      │ → 401     │
└───┬───┘      └───────────┘
    │
    ▼
┌─────────────────┐
│  Procesa        │
│  mensaje        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Para RESPONDER, el bot necesita su propio  │
│  token. Usa credenciales para obtenerlo:    │
│                                              │
│  POST login.microsoftonline.com/token       │
│  - client_id = APP_ID                        │
│  - client_secret = APP_PASSWORD              │
│  - scope = api.botframework.com             │
└─────────────────────────────────────────────┘
```

---

## Estructura del Proyecto

```
teams_chat/
├── src/
│   ├── index.js          # Servidor Express, endpoint /api/messages
│   ├── bot.js            # Lógica del bot, manejo de mensajes
│   ├── openaiService.js  # Integración con OpenAI, historial
│   └── config.js         # Configuración centralizada
├── appPackage/
│   ├── manifest.json     # Manifest de la app de Teams
│   ├── color.png         # Ícono 192x192
│   └── outline.png       # Ícono 32x32
├── .env                  # Variables de entorno (NO en git)
├── .env.example          # Ejemplo de variables
├── .gitignore            # Archivos ignorados
├── package.json          # Dependencias Node.js
├── Dockerfile            # Imagen Docker
├── docker-compose.yml    # Orquestación de contenedores
├── Caddyfile             # Configuración SSL/proxy
└── README.md             # Este archivo
```

---

## Configuración

### Variables de Entorno Requeridas

Copia `.env.example` a `.env` y configura:

```env
# Azure Bot (obtener de Azure Portal)
MICROSOFT_APP_ID=<tu-app-id>
MICROSOFT_APP_PASSWORD=<tu-client-secret>
MICROSOFT_APP_TYPE=SingleTenant
MICROSOFT_APP_TENANT_ID=<tu-tenant-id>

# OpenAI (obtener de platform.openai.com)
OPENAI_API_KEY=<tu-api-key>
OPENAI_MODEL=gpt-4

# Server
NODE_ENV=production
PORT=3978
DEBUG_MODE=false
```

### Recursos Azure Necesarios

1. **Azure Bot Service** (F0 gratuito)
   - Configurar Messaging Endpoint
   - Habilitar canal de Teams

2. **App Registration** (Azure AD)
   - Crear Client Secret
   - Configurar como SingleTenant o MultiTenant según corresponda

---

## Componentes del Código

### index.js - Servidor Principal

- Iniciar servidor Express en puerto 3978
- Configurar Bot Framework Authentication
- Endpoint GET / para health check
- Endpoint POST /api/messages para recibir mensajes
- Manejo global de errores

### bot.js - Lógica del Bot

Clase `TeamsAIBot` extiende `TeamsActivityHandler`:

- `onMessage()` → Procesa mensajes de texto
- `onMembersAdded()` → Envía bienvenida

Comandos soportados:
- `/help` → Muestra ayuda
- `/clear` → Limpia historial de conversación
- `/status` → Estado del bot

### openaiService.js - Integración con IA

Clase `OpenAIService`:

- Mantiene historial separado por usuario (Map en memoria)
- `getResponse(userId, message)` → Obtiene respuesta de GPT-4
- `clearHistory(userId)` → Limpia historial de un usuario
- Limita historial a últimos 20 mensajes

### config.js - Configuración

- Carga variables de entorno con dotenv
- Valores por defecto para desarrollo
- System prompt configurable del bot

---

## Infraestructura

### Docker Compose

Dos servicios:
- **teams-bot**: Aplicación Node.js (puerto 3978)
- **caddy**: Reverse proxy con SSL automático (puertos 80, 443)

### Caddy

- SSL automático via Let's Encrypt
- Renovación automática de certificados
- Proxy reverso al contenedor del bot

---

## Despliegue

### Despliegue Inicial

```bash
# En el servidor
git clone <repo-url> /root/teams-chat
cd /root/teams-chat
cp .env.example .env
# Editar .env con credenciales reales
docker compose up -d --build
```

### Actualizar Código

```bash
# Desde local
git add . && git commit -m "mensaje" && git push origin main

# En servidor
cd /root/teams-chat
git pull origin main
docker compose up -d --build
```

### Comando Rápido (desde local)

```bash
ssh root@<IP_SERVIDOR> "cd /root/teams-chat && git pull origin main && docker compose up -d --build"
```

---

## Comandos Útiles

```bash
# Ver logs (últimos 50)
docker logs teams-ai-bot --tail 50

# Logs en tiempo real
docker logs -f teams-ai-bot

# Reiniciar bot
docker compose restart teams-bot

# Reconstruir completamente
docker compose down && docker compose up -d --build

# Ver variables en contenedor
docker exec teams-ai-bot env | grep MICROSOFT

# Health check
curl https://<tu-dominio>/
```

---

## Troubleshooting

### Error 401 al responder

**Síntoma:** El bot recibe mensajes pero no puede responder (RestError 401)

**Causas:**
- Client Secret incorrecto o expirado
- MicrosoftAppType no coincide con Azure Bot Configuration
- Variables de entorno no actualizadas en contenedor

**Solución:**
```bash
# Verificar variables en contenedor
docker exec teams-ai-bot env | grep MICROSOFT

# Reconstruir contenedor
docker compose down && docker compose up -d --build
```

### Bot no recibe mensajes

**Verificar:**
- Messaging Endpoint correcto en Azure Bot Configuration
- Certificado SSL válido
- Caddy funcionando

```bash
# Probar endpoint
curl https://<tu-dominio>/

# Ver logs de Caddy
docker logs teams-caddy --tail 20
```

### OpenAI no responde

**Verificar:**
- API Key válida
- Créditos disponibles en OpenAI
- Ver logs para errores específicos

---

## Seguridad

- ⚠️ Nunca commitear archivos `.env` con credenciales
- Las credenciales están en `CREDENCIALES.md` (archivo local, no en repo)
- El archivo `.gitignore` excluye archivos sensibles
- Rotar Client Secrets periódicamente

---

*Documentación actualizada: Febrero 2026*
