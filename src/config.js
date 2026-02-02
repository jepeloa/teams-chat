/**
 * Configuración centralizada de la aplicación
 * Carga variables de entorno y valida configuración requerida
 */

require('dotenv').config();

const config = {
    // ============================================
    // Bot Framework Configuration
    // ============================================
    MicrosoftAppId: process.env.MICROSOFT_APP_ID,
    MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
    MicrosoftAppType: process.env.MICROSOFT_APP_TYPE || 'MultiTenant',
    MicrosoftAppTenantId: process.env.MICROSOFT_APP_TENANT_ID,
    
    // ============================================
    // Server Configuration
    // ============================================
    port: process.env.PORT || 3978,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // ============================================
    // OpenAI Configuration
    // ============================================
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
    
    // ============================================
    // Bot Behavior Configuration
    // ============================================
    maxConversationHistory: 20,  // Mensajes a mantener en historial
    maxTokens: 1000,             // Tokens máximos por respuesta
    temperature: 0.7,            // Creatividad (0-1)
    
    // ============================================
    // System Prompt for AI
    // ============================================
    systemPrompt: `Eres un asistente de IA integrado en Microsoft Teams.
Tu rol es ayudar a los usuarios con sus preguntas y tareas.

Directrices:
- Sé conciso y profesional
- Responde en el mismo idioma que el usuario
- Usa formato Markdown cuando sea apropiado
- Si no sabes algo, dilo honestamente
- Para código, usa bloques de código con el lenguaje especificado

Capacidades:
- Responder preguntas generales
- Ayudar con programación y código
- Explicar conceptos técnicos
- Asistir con redacción y edición
- Análisis y resumen de texto`,

    // ============================================
    // Debug Configuration
    // ============================================
    debugMode: process.env.DEBUG_MODE === 'true'
};

// ============================================
// Validación de Configuración Requerida
// ============================================
const requiredEnvVars = [
    'MICROSOFT_APP_ID',
    'MICROSOFT_APP_PASSWORD'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Error: Variables de entorno faltantes:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n📝 Copia .env.example a .env y completa los valores.');
    
    // En producción, salir. En desarrollo, advertir.
    if (config.nodeEnv === 'production') {
        process.exit(1);
    }
}

if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  Advertencia: OPENAI_API_KEY no configurada.');
    console.warn('   El bot funcionará pero sin capacidades de IA.');
}

module.exports = config;
