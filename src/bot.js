/**
 * Bot de Microsoft Teams con integración de IA
 * Maneja mensajes, comandos y eventos de Teams
 */

const { TeamsActivityHandler, CardFactory } = require('botbuilder');
const openaiService = require('./openaiService');
const config = require('./config');

class TeamsAIBot extends TeamsActivityHandler {
    constructor() {
        super();
        
        // ============================================
        // Handler: Mensajes entrantes
        // ============================================
        this.onMessage(async (context, next) => {
            const startTime = Date.now();
            
            // Extraer información del mensaje
            const userId = context.activity.from.id;
            const userName = context.activity.from.name || 'Usuario';
            const rawMessage = context.activity.text || '';
            
            // Limpiar mensaje (remover @menciones en canales)
            const userMessage = this.removeBotMention(context.activity);
            
            // Log de mensaje recibido
            console.log(`\n📨 Mensaje de ${userName}: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"`);
            
            // Verificar si es un mensaje vacío
            if (!userMessage.trim()) {
                await context.sendActivity('👋 ¡Hola! Envíame un mensaje y te ayudaré.');
                await next();
                return;
            }
            
            // Manejar comandos especiales
            const command = this.parseCommand(userMessage);
            if (command) {
                await this.handleCommand(context, command, userId);
                await next();
                return;
            }
            
            // Mostrar indicador de "escribiendo..."
            await context.sendActivity({ type: 'typing' });
            
            try {
                // Generar respuesta con IA
                const aiResponse = await openaiService.generateResponse(userId, userMessage);
                
                // Enviar respuesta
                await context.sendActivity(aiResponse);
                
                // Log de tiempo de respuesta
                const elapsed = Date.now() - startTime;
                console.log(`✅ Respuesta enviada (${elapsed}ms)`);
                
            } catch (error) {
                console.error('❌ Error procesando mensaje:', error);
                await context.sendActivity('❌ Lo siento, ocurrió un error. Por favor, intenta de nuevo.');
            }
            
            await next();
        });
        
        // ============================================
        // Handler: Nuevos miembros agregados
        // ============================================
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            
            for (const member of membersAdded) {
                // No saludar al bot mismo
                if (member.id !== context.activity.recipient.id) {
                    console.log(`👋 Nuevo miembro: ${member.name}`);
                    await this.sendWelcomeCard(context, member.name);
                }
            }
            
            await next();
        });
        
        // ============================================
        // Handler: Reacciones agregadas
        // ============================================
        this.onReactionsAdded(async (context, next) => {
            if (config.debugMode) {
                for (const reaction of context.activity.reactionsAdded) {
                    console.log(`👍 Reacción agregada: ${reaction.type}`);
                }
            }
            await next();
        });
    }
    
    /**
     * Remueve la @mención del bot del texto del mensaje
     * @param {Activity} activity - Actividad de Bot Framework
     * @returns {string} Mensaje limpio
     */
    removeBotMention(activity) {
        let text = activity.text || '';
        
        // Buscar y remover menciones al bot
        if (activity.entities) {
            for (const entity of activity.entities) {
                if (entity.type === 'mention' && 
                    entity.mentioned.id === activity.recipient.id) {
                    text = text.replace(entity.text, '').trim();
                }
            }
        }
        
        return text.trim();
    }
    
    /**
     * Parsea comandos del mensaje
     * @param {string} message - Mensaje del usuario
     * @returns {string|null} Comando encontrado o null
     */
    parseCommand(message) {
        const commandMatch = message.match(/^\/(\w+)/);
        if (commandMatch) {
            return commandMatch[1].toLowerCase();
        }
        return null;
    }
    
    /**
     * Maneja comandos especiales
     * @param {TurnContext} context - Contexto del turno
     * @param {string} command - Comando a ejecutar
     * @param {string} userId - ID del usuario
     */
    async handleCommand(context, command, userId) {
        console.log(`⚡ Comando: /${command}`);
        
        switch (command) {
            case 'help':
            case 'ayuda':
                await this.sendHelpCard(context);
                break;
                
            case 'clear':
            case 'limpiar':
                openaiService.clearHistory(userId);
                await context.sendActivity('🗑️ Historial de conversación limpiado. ¡Empecemos de nuevo!');
                break;
                
            case 'status':
            case 'estado':
                const stats = openaiService.getStats();
                await context.sendActivity(
                    `📊 **Estado del Bot**\n\n` +
                    `- IA habilitada: ${stats.enabled ? '✅ Sí' : '❌ No'}\n` +
                    `- Modelo: ${stats.model}\n` +
                    `- Conversaciones activas: ${stats.activeConversations}`
                );
                break;
                
            default:
                await context.sendActivity(`❓ Comando desconocido: /${command}\n\nUsa /help para ver comandos disponibles.`);
        }
    }
    
    /**
     * Envía tarjeta de bienvenida
     * @param {TurnContext} context - Contexto
     * @param {string} userName - Nombre del usuario
     */
    async sendWelcomeCard(context, userName) {
        const card = CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            body: [
                {
                    type: 'TextBlock',
                    text: `👋 ¡Bienvenido, ${userName || 'amigo'}!`,
                    weight: 'Bolder',
                    size: 'Large',
                    wrap: true
                },
                {
                    type: 'TextBlock',
                    text: 'Soy un asistente de IA integrado en Microsoft Teams. Estoy aquí para ayudarte con cualquier pregunta o tarea.',
                    wrap: true,
                    spacing: 'Medium'
                },
                {
                    type: 'TextBlock',
                    text: '**¿Qué puedo hacer?**',
                    weight: 'Bolder',
                    spacing: 'Medium'
                },
                {
                    type: 'TextBlock',
                    text: '• 💬 Responder preguntas\n• 💻 Ayudar con código\n• 📝 Asistir con redacción\n• 🔍 Analizar y resumir texto',
                    wrap: true
                },
                {
                    type: 'TextBlock',
                    text: '**Comandos disponibles:**',
                    weight: 'Bolder',
                    spacing: 'Medium'
                },
                {
                    type: 'TextBlock',
                    text: '• `/help` - Ver ayuda\n• `/clear` - Limpiar historial\n• `/status` - Ver estado',
                    wrap: true
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: '🚀 ¡Empezar!',
                    data: { action: 'getStarted' }
                }
            ]
        });
        
        await context.sendActivity({ attachments: [card] });
    }
    
    /**
     * Envía tarjeta de ayuda
     * @param {TurnContext} context - Contexto
     */
    async sendHelpCard(context) {
        const card = CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            body: [
                {
                    type: 'TextBlock',
                    text: '🤖 Ayuda del Bot de IA',
                    weight: 'Bolder',
                    size: 'Large'
                },
                {
                    type: 'TextBlock',
                    text: 'Simplemente escríbeme cualquier pregunta o solicitud y haré mi mejor esfuerzo para ayudarte.',
                    wrap: true,
                    spacing: 'Medium'
                },
                {
                    type: 'Container',
                    style: 'emphasis',
                    items: [
                        {
                            type: 'TextBlock',
                            text: '📌 **Comandos Disponibles**',
                            weight: 'Bolder'
                        },
                        {
                            type: 'FactSet',
                            facts: [
                                { title: '/help', value: 'Muestra esta ayuda' },
                                { title: '/clear', value: 'Limpia el historial de conversación' },
                                { title: '/status', value: 'Muestra el estado del bot' }
                            ]
                        }
                    ]
                },
                {
                    type: 'TextBlock',
                    text: '💡 **Consejos**',
                    weight: 'Bolder',
                    spacing: 'Medium'
                },
                {
                    type: 'TextBlock',
                    text: '• Sé específico en tus preguntas\n• Puedo recordar el contexto de la conversación\n• Usa /clear para empezar una conversación nueva',
                    wrap: true
                }
            ]
        });
        
        await context.sendActivity({ attachments: [card] });
    }
    
    /**
     * Maneja invocaciones de Adaptive Cards
     * @param {TurnContext} context - Contexto
     * @returns {Object} Respuesta de invocación
     */
    async onAdaptiveCardInvoke(context) {
        const data = context.activity.value;
        
        if (data.action === 'getStarted') {
            await context.sendActivity('¡Genial! 🚀 Escríbeme cualquier pregunta y te ayudaré.');
        }
        
        return { statusCode: 200, type: 'application/vnd.microsoft.activity.message' };
    }
}

module.exports = { TeamsAIBot };
