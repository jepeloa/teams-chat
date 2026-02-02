# Teams AI Bot

Bot de Microsoft Teams con integración de IA (OpenAI GPT-4).

## Deploy con Docker

```bash
# Clonar repo
git clone git@github.com:jepeloa/teams-chat.git
cd teams-chat

# Crear archivo .env con las credenciales
cp .env.example .env
nano .env

# Build y run
docker-compose up -d --build

# Ver logs
docker-compose logs -f
```

## Variables de entorno

- `MICROSOFT_APP_ID` - App ID de Azure Bot
- `MICROSOFT_APP_PASSWORD` - Client Secret
- `MICROSOFT_APP_TYPE` - SingleTenant o MultiTenant
- `MICROSOFT_APP_TENANT_ID` - Tenant ID de Azure
- `OPENAI_API_KEY` - API Key de OpenAI
- `OPENAI_MODEL` - Modelo (default: gpt-4)

## Endpoints

- `GET /` - Info del bot
- `GET /health` - Health check
- `POST /api/messages` - Endpoint para Bot Framework
