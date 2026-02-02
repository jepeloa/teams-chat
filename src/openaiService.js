/**
 * Servicio de integración con OpenAI
 * Maneja conversaciones, historial y generación de respuestas
 */

const OpenAI = require('openai');
const config = require('./config');

class OpenAIService {
    constructor() {
        // Inicializar cliente de OpenAI
        if (config.openaiApiKey) {
            this.client = new OpenAI({
                apiKey: config.openaiApiKey
            });
            this.enabled = true;
        } else {
            this.enabled = false;
            console.warn('⚠️  OpenAI no configurado - respuestas de IA deshabilitadas');
        }
        
        // Almacenar historial de conversación por usuario
        // Map<userId, Array<{role, content}>>
        this.conversationHistory = new Map();
    }
    
    /**
     * Obtiene o inicializa el historial de conversación para un usuario
     * @param {string} userId - ID único del usuario
     * @returns {Array} Historial de mensajes
     */
    getConversationHistory(userId) {
        if (!this.conversationHistory.has(userId)) {
            // Inicializar con system prompt
            this.conversationHistory.set(userId, [
                { role: 'system', content: config.systemPrompt }
            ]);
        }
        return this.conversationHistory.get(userId);
    }
    
    /**
     * Agrega un mensaje al historial de conversación
     * @param {string} userId - ID del usuario
     * @param {string} role - 'user' | 'assistant' | 'system'
     * @param {string} content - Contenido del mensaje
     */
    addToHistory(userId, role, content) {
        const history = this.getConversationHistory(userId);
        history.push({ role, content });
        
        // Limitar historial para no exceder límites de tokens
        // Mantener: 1 system + últimos N mensajes
        const maxMessages = config.maxConversationHistory;
        if (history.length > maxMessages + 1) {
            // Eliminar mensajes más antiguos (pero mantener system prompt)
            history.splice(1, 2); // Eliminar par user/assistant más antiguo
        }
    }
    
    /**
     * Limpia el historial de conversación de un usuario
     * @param {string} userId - ID del usuario
     */
    clearHistory(userId) {
        this.conversationHistory.delete(userId);
        console.log(`🗑️  Historial limpiado para usuario: ${userId.substring(0, 8)}...`);
    }
    
    /**
     * Genera una respuesta de IA para el mensaje del usuario
     * @param {string} userId - ID del usuario
     * @param {string} userMessage - Mensaje del usuario
     * @returns {Promise<string>} Respuesta generada
     */
    async generateResponse(userId, userMessage) {
        // Si OpenAI no está configurado, respuesta por defecto
        if (!this.enabled) {
            return this.getDefaultResponse(userMessage);
        }
        
        try {
            // Agregar mensaje del usuario al historial
            this.addToHistory(userId, 'user', userMessage);
            
            // Obtener historial completo
            const history = this.getConversationHistory(userId);
            
            // Log en modo debug
            if (config.debugMode) {
                console.log(`📤 Enviando a OpenAI (${history.length} mensajes)`);
            }
            
            // Llamar a OpenAI API
            const response = await this.client.chat.completions.create({
                model: config.openaiModel,
                messages: history,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });
            
            // Extraer respuesta
            const assistantMessage = response.choices[0]?.message?.content;
            
            if (!assistantMessage) {
                throw new Error('Respuesta vacía de OpenAI');
            }
            
            // Agregar respuesta al historial
            this.addToHistory(userId, 'assistant', assistantMessage);
            
            // Log de uso de tokens
            if (config.debugMode) {
                const usage = response.usage;
                console.log(`📊 Tokens: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`);
            }
            
            return assistantMessage;
            
        } catch (error) {
            console.error('❌ Error de OpenAI:', error.message);
            
            // Manejar errores específicos
            if (error.code === 'insufficient_quota') {
                return '⚠️ Se ha excedido la cuota de la API de OpenAI. Por favor, verifica tu cuenta de facturación.';
            }
            
            if (error.code === 'invalid_api_key') {
                return '⚠️ La clave de API de OpenAI es inválida. Por favor, verifica la configuración.';
            }
            
            if (error.code === 'rate_limit_exceeded') {
                return '⚠️ Se ha excedido el límite de solicitudes. Por favor, intenta de nuevo en unos segundos.';
            }
            
            // Error genérico
            return '❌ Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.';
        }
    }
    
    /**
     * Respuesta por defecto cuando OpenAI no está configurado
     * @param {string} message - Mensaje del usuario
     * @returns {string} Respuesta por defecto
     */
    getDefaultResponse(message) {
        const responses = [
            '👋 ¡Hola! Soy un bot de Teams. La integración con IA no está configurada actualmente.',
            `📝 Recibí tu mensaje: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
            '💡 Para habilitar respuestas de IA, configura OPENAI_API_KEY en las variables de entorno.',
        ];
        return responses.join('\n\n');
    }
    
    /**
     * Obtiene estadísticas del servicio
     * @returns {Object} Estadísticas
     */
    getStats() {
        return {
            enabled: this.enabled,
            activeConversations: this.conversationHistory.size,
            model: config.openaiModel
        };
    }
}

// Exportar instancia única (Singleton)
module.exports = new OpenAIService();
