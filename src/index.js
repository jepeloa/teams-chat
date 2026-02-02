/**
 * Servidor principal del Bot de Teams
 * Configura Express, Bot Framework Adapter y manejo de errores
 */

const express = require('express');
const { 
    CloudAdapter, 
    ConfigurationBotFrameworkAuthentication,
    ConfigurationServiceClientCredentialFactory
} = require('botbuilder');
const { TeamsAIBot } = require('./bot');
const config = require('./config');

// ============================================
// Crear aplicación Express
// ============================================
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// ============================================
// Endpoints de salud y estado
// ============================================

// Health check básico
app.get('/', (req, res) => {
    res.json({ 
        name: 'Teams AI Bot',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check para monitoreo
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// ============================================
// Configurar Bot Framework Adapter
// ============================================

// Crear fábrica de credenciales
// Para MultiTenant, no se debe pasar TenantId
const credentialsConfig = {
    MicrosoftAppId: config.MicrosoftAppId,
    MicrosoftAppPassword: config.MicrosoftAppPassword,
    MicrosoftAppType: config.MicrosoftAppType
};

// Solo agregar TenantId si NO es MultiTenant
if (config.MicrosoftAppType !== 'MultiTenant') {
    credentialsConfig.MicrosoftAppTenantId = config.MicrosoftAppTenantId;
}

console.log('🔑 Configuración de credenciales:');
console.log(`   App ID: ${config.MicrosoftAppId}`);
console.log(`   App Type: ${config.MicrosoftAppType}`);
console.log(`   Tenant ID: ${config.MicrosoftAppType !== 'MultiTenant' ? config.MicrosoftAppTenantId : '(No usado para MultiTenant)'}`);

const credentialsFactory = new ConfigurationServiceClientCredentialFactory(credentialsConfig);

// Crear autenticación
const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
    {},
    credentialsFactory
);

// Crear adaptador
const adapter = new CloudAdapter(botFrameworkAuthentication);

// ============================================
// Manejo de errores global
// ============================================
adapter.onTurnError = async (context, error) => {
    // Log detallado del error
    console.error('═══════════════════════════════════════');
    console.error('❌ ERROR NO MANEJADO EN EL BOT');
    console.error('═══════════════════════════════════════');
    console.error(`Mensaje: ${error.message}`);
    console.error(`Nombre: ${error.name}`);
    console.error(`Código: ${error.code}`);
    console.error(`Status: ${error.statusCode}`);
    console.error(`Detalles: ${JSON.stringify(error.details || error.body || {})}`);
    console.error(`Stack: ${error.stack}`);
    console.error('═══════════════════════════════════════');
    
    // Intentar notificar al usuario
    try {
        // Mensaje amigable para el usuario
        await context.sendActivity(
            '❌ Lo siento, ocurrió un error inesperado. Por favor, intenta de nuevo más tarde.'
        );
        
        // En desarrollo, enviar detalles del error
        if (config.nodeEnv === 'development') {
            await context.sendActivity(`🔧 Debug: ${error.message}`);
        }
    } catch (sendError) {
        console.error('Error enviando mensaje de error:', sendError.message);
    }
};

// ============================================
// Crear instancia del bot
// ============================================
const bot = new TeamsAIBot();

// ============================================
// Endpoint principal de mensajes
// ============================================
app.post('/api/messages', async (req, res) => {
    // Log de solicitud entrante (siempre activo para debugging)
    console.log('\n─────────────────────────────────────');
    console.log('📥 Solicitud entrante a /api/messages');
    console.log(`   Tipo: ${req.body?.type}`);
    console.log(`   De: ${req.body?.from?.name || 'Desconocido'}`);
    console.log(`   Headers Auth: ${req.headers.authorization ? 'Presente' : 'NO PRESENTE'}`);
    console.log('─────────────────────────────────────');
    
    try {
        // Procesar la solicitud con el adaptador
        await adapter.process(req, res, (context) => bot.run(context));
    } catch (error) {
        console.error('Error procesando solicitud:', error.message);
        
        // Si aún no se envió respuesta, enviar error
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Error interno del servidor',
                message: config.nodeEnv === 'development' ? error.message : undefined
            });
        }
    }
});

// ============================================
// Iniciar servidor
// ============================================
const PORT = config.port;

app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   🤖  TEAMS AI BOT - SERVIDOR INICIADO                   ║');
    console.log('║                                                           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║   📡 Puerto: ${PORT}                                         ║`);
    console.log(`║   🌍 Entorno: ${config.nodeEnv.padEnd(41)}║`);
    console.log(`║   🔗 Endpoint: http://localhost:${PORT}/api/messages        ║`);
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Verificaciones de configuración
    if (!config.MicrosoftAppId || !config.MicrosoftAppPassword) {
        console.log('⚠️  ADVERTENCIA: Credenciales de Azure Bot no configuradas');
        console.log('   Configura MICROSOFT_APP_ID y MICROSOFT_APP_PASSWORD en .env');
        console.log('');
    }
    
    if (!config.openaiApiKey) {
        console.log('⚠️  ADVERTENCIA: API key de OpenAI no configurada');
        console.log('   El bot funcionará pero sin respuestas de IA');
        console.log('   Configura OPENAI_API_KEY en .env para habilitar IA');
        console.log('');
    }
    
    console.log('📋 Para probar localmente:');
    console.log('   1. Ejecuta: ngrok http 3978');
    console.log('   2. Copia la URL HTTPS de ngrok');
    console.log('   3. Actualiza el Messaging Endpoint en Azure Portal');
    console.log('');
});

// ============================================
// Manejo de cierre graceful
// ============================================
process.on('SIGTERM', () => {
    console.log('\n👋 SIGTERM recibido, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 SIGINT recibido, cerrando servidor...');
    process.exit(0);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});
