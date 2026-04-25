/**
 * Redesign Maxi WhatsApp Agent - Tool-Calling Architecture
 * Replaces the rigid state machine with a proper AI agent that uses tools.
 */

const N8N_API = 'https://diegoproyects8.app.n8n.cloud/api/v1';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZDVmNjVlZC1iODJjLTRmNDktOWNhMS05YzAyZjgwOTAzOTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNjA4NTZkN2YtZjMyOC00MGZiLWEzOGYtODhmNmRkMWUzMzcyIiwiaWF0IjoxNzc3MTAzODUwLCJleHAiOjE3Nzk2ODE2MDB9.xOqRR46GkWgxahtyRcOYNDQqBz6ahJf_zGvwmmAjNRo';
const WORKFLOW_ID = '7tp2UignQFVbzMkH17OFi';
const BACKEND_URL = 'https://pro-lomasrico-api.onrender.com';

const SYSTEM_PROMPT = `# IDENTIDAD
Eres Maxi, el asistente de WhatsApp de "Lo Más Rico", cevichería premium en Concepción, Chile.
Eres amigable, directo, experto en el menú. Usas español chileno cercano y profesional con emojis moderados.

# HERRAMIENTAS DISPONIBLES
Tienes 4 herramientas. Úsalas cuando corresponda:

1. **identificar_cliente** → LLÁMALA SIEMPRE al inicio para saber quién es, sus puntos y nombre.
2. **ver_menu** → Obtiene el catálogo con productos, precios y modificadores. Llámala cuando pregunten por el menú o para verificar un producto.
3. **cotizar_envio** → Calcula el costo de envío a una dirección. Llámala cuando el cliente dé una dirección.
4. **crear_pedido** → Crea la orden y genera link de pago MercadoPago. Llámala SOLO cuando TODO esté confirmado.

# REGLAS FUNDAMENTALES
1. NUNCA pidas ID, UUID ni datos técnicos. El sistema identifica al cliente por teléfono.
2. NUNCA inventes productos. Si no está en el catálogo, dilo.
3. Mantén respuestas CORTAS. No envíes muros de texto.
4. Guía paso a paso los modificadores: formato → proteínas → extras.
5. NO avances al paso siguiente sin confirmar el anterior.
6. Cuando el cliente confirme todo, muestra un RESUMEN claro antes de crear el pedido.

# CONOCIMIENTO DEL MENÚ (referencia rápida)
Categorías: CEVICHES (desde $8.900), CRUDOS ($8.900), BOWLS ($6.900), GOHAN ($6.900), ROLLS ($6.900-$7.900), PROMOS ($9.900-$25.900), PAPAS/FRITOS ($3.500+), EMPANADAS ($2.000), BEBIDAS ($1.400-$3.000).

## Modificadores de Ceviches (ejemplo):
- Formato (obligatorio): 350g=base / 500g=+$3.000 / 750g=+$8.000 / 1kg=+$12.000
- Proteínas (obligatorio, 1 a 3): Salmón, Reineta, Camarón, Atún, Machas
- Extras (opcional): Sopaipillas +$1.900, Pan con ajo +$1.900
- Limonadas (opcional): Jengibre/Mango/Frambuesa +$1.900

Siempre consulta el catálogo real con ver_menu para obtener precios y opciones actualizadas.

# FLUJO DE CONVERSACIÓN NATURAL
1. Al recibir mensaje → identificar_cliente con el teléfono
2. Saludar usando el nombre si lo tiene
3. Si preguntan por productos → ver_menu y presentar opciones
4. Si eligen producto con modificadores → guiar paso a paso
5. Preguntar: "¿Algo más o procedemos?"
6. Preguntar: "¿Retiro en local o envío?" 
7. Si envío → pedir dirección → cotizar_envio
8. Mostrar resumen final con total
9. Si confirma → crear_pedido → enviar link de pago

# ENVÍO
- Local: Obispo Salas 1205, Concepción
- Radio: 8km. Si está fuera, ofrecer retiro.
- Si no dan comuna, asumir Concepción.
- Aceptar cualquier formato de dirección chilena.

# PROGRAMA DE PUNTOS
- 4% del subtotal se acumula como puntos
- 1 punto = $1 CLP de descuento
- Si el cliente tiene puntos (loyaltyPoints > 0), mencionarlo al mostrar el resumen
- Si es nuevo: "¡Con esta compra empiezas a acumular puntos! 🎁"
- Nunca presionar para usar puntos, solo informar

# EJEMPLOS DE CONVERSACIÓN
Cliente: "hola quiero un ceviche"
Maxi: [llama identificar_cliente] [llama ver_menu]
"¡Hola [nombre]! 🐟 ¡Qué buena elección! ¿Qué formato prefieres?
• 350g (personal) - $8.900
• 500g - $11.900
• 750g - $16.900
• 1kg - $20.900"

Cliente: "mándame un cevi 500 con salmón y camarón a Los Carrera 1234"
Maxi: [identifica lo que quiere + llama cotizar_envio]
"Perfecto! Tu Ceviche 500g con Salmón y Camarón = $11.900
📍 Envío a Los Carrera 1234: $2.500
💰 Total: $14.400
¿Confirmas para enviarte el link de pago?"`;

async function redesign() {
    console.log('🔄 Obteniendo workflow actual...');
    const current = await (await fetch(`${N8N_API}/workflows/${WORKFLOW_ID}`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    })).json();

    const nodes = [
        // 1. WEBHOOK
        {
            id: 'webhook-1',
            name: 'WhatsApp Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [0, 300],
            webhookId: current.nodes.find(n => n.type.includes('webhook'))?.webhookId,
            parameters: { httpMethod: 'POST', path: 'whatsapp-in', responseMode: 'lastNode', options: {} }
        },
        // 2. CONFIG
        {
            id: 'config-1',
            name: 'Config',
            type: 'n8n-nodes-base.set',
            typeVersion: 3.4,
            position: [220, 300],
            parameters: {
                assignments: { assignments: [
                    { id: 'c1', name: 'backendBaseUrl', value: BACKEND_URL, type: 'string' },
                    { id: 'c2', name: 'twilioWhatsAppNumber', value: '+12622170245', type: 'string' }
                ]},
                includeOtherFields: true, options: {}
            }
        },
        // 3. EXTRACT DATA
        {
            id: 'extract-1',
            name: 'Extract Data',
            type: 'n8n-nodes-base.set',
            typeVersion: 3.4,
            position: [440, 300],
            parameters: {
                assignments: { assignments: [
                    { id: 'e1', name: 'phone', value: "={{ $('WhatsApp Webhook').item.json.body.From.replace('whatsapp:', '') }}", type: 'string' },
                    { id: 'e2', name: 'userMessage', value: "={{ $('WhatsApp Webhook').item.json.body.Body }}", type: 'string' },
                    { id: 'e3', name: 'profileName', value: "={{ $('WhatsApp Webhook').item.json.body.ProfileName || '' }}", type: 'string' }
                ]},
                includeOtherFields: false, options: {}
            }
        },
        // 4. CHECK CONVERSATION MODE
        {
            id: 'checkmode-1',
            name: 'Check Mode',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [660, 300],
            parameters: {
                url: `=${BACKEND_URL}/api/whatsapp/conversations/by-phone?phone={{ $json.phone.replace('+', '') }}`,
                options: { response: { response: { neverError: true } } }
            }
        },
        // 5. IS HUMAN?
        {
            id: 'ishuman-1',
            name: 'Is Human?',
            type: 'n8n-nodes-base.if',
            typeVersion: 2.2,
            position: [880, 300],
            parameters: {
                conditions: {
                    options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
                    conditions: [{ id: 'h1', leftValue: "={{ $json.mode }}", rightValue: 'HUMAN', operator: { type: 'string', operation: 'equals' } }],
                    combinator: 'and'
                }
            }
        },
        // 6. SAVE INBOUND (Human path)
        {
            id: 'save-human-1',
            name: 'Save Msg (Human)',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [1100, 160],
            parameters: {
                method: 'POST',
                url: `=${BACKEND_URL}/api/whatsapp/conversations/webhook/inbound`,
                sendHeaders: true,
                headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
                sendBody: true, specifyBody: 'json',
                jsonBody: `={{ JSON.stringify({ From: $('Extract Data').item.json.phone, Body: $('Extract Data').item.json.userMessage, ProfileName: $('Extract Data').item.json.profileName }) }}`
            }
        },
        // 7. SAVE INBOUND (Bot path)
        {
            id: 'save-bot-1',
            name: 'Save Msg (Bot)',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [1100, 440],
            parameters: {
                method: 'POST',
                url: `=${BACKEND_URL}/api/whatsapp/conversations/webhook/inbound`,
                sendHeaders: true,
                headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
                sendBody: true, specifyBody: 'json',
                jsonBody: `={{ JSON.stringify({ From: $('Extract Data').item.json.phone, Body: $('Extract Data').item.json.userMessage, ProfileName: $('Extract Data').item.json.profileName }) }}`
            }
        },
        // 8. MAXI AI AGENT (Tools Agent)
        {
            id: 'agent-1',
            name: 'Maxi Agent',
            type: '@n8n/n8n-nodes-langchain.agent',
            typeVersion: 1.7,
            position: [1320, 440],
            parameters: {
                agentType: 'toolsAgent',
                promptType: 'define',
                text: `Teléfono del cliente: {{ $('Extract Data').item.json.phone }}\nNombre WhatsApp: {{ $('Extract Data').item.json.profileName }}\n\nMensaje del cliente: {{ $('Extract Data').item.json.userMessage }}`,
                options: {
                    systemMessage: SYSTEM_PROMPT,
                    maxIterations: 8,
                    returnIntermediateSteps: false
                }
            }
        },
        // 9. OPENAI MODEL
        {
            id: 'openai-1',
            name: 'OpenAI GPT-4o-mini',
            type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
            typeVersion: 1.2,
            position: [1120, 640],
            parameters: {
                model: { __rl: true, mode: 'id', value: 'gpt-4o-mini' },
                options: { temperature: 0.7 }
            },
            credentials: { openAiApi: { id: 'W7t44rvkt0juFhIs', name: 'OpenAi account' } }
        },
        // 10. MEMORY (by phone)
        {
            id: 'memory-1',
            name: 'Chat Memory',
            type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
            typeVersion: 1.3,
            position: [1260, 640],
            parameters: {
                sessionKey: 'custom_key',
                contextWindowLength: 20,
                sessionIdOption: 'customKey',
                customSessionKey: "={{ $('Extract Data').item.json.phone }}"
            }
        },
        // 11. TOOL: Identificar Cliente
        {
            id: 'tool-identify-1',
            name: 'Tool: Identificar Cliente',
            type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
            typeVersion: 1.1,
            position: [1400, 640],
            parameters: {
                method: 'GET',
                url: `${BACKEND_URL}/api/bot/identify-phone?phone={phone}`,
                placeholderDefinitions: {
                    values: [
                        { name: 'phone', description: 'Número de teléfono del cliente, exactamente como viene (ej: +56987654321). Elimina el + si lo tiene.', type: 'string' }
                    ]
                },
                description: 'Identifica al cliente por teléfono. Retorna: nombre, loyaltyPoints (puntos de fidelidad), historicalOrders (número de pedidos previos), historicalSpent (total gastado), isNewUser. LLAMA SIEMPRE al inicio de la conversación.',
                authentication: 'none',
                options: {}
            }
        },
        // 12. TOOL: Ver Menú
        {
            id: 'tool-menu-1',
            name: 'Tool: Ver Menú',
            type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
            typeVersion: 1.1,
            position: [1540, 640],
            parameters: {
                method: 'GET',
                url: `${BACKEND_URL}/api/bot/catalog`,
                description: 'Obtiene el catálogo completo de Lo Más Rico con todos los productos, precios, variantes y modificadores (formato, proteínas, extras). Llámala cuando el cliente pregunte por el menú, un producto específico, o necesites verificar precios y opciones disponibles. Retorna un array de productos con sus modifiers.',
                authentication: 'none',
                placeholderDefinitions: { values: [] },
                options: {}
            }
        },
        // 13. TOOL: Cotizar Envío
        {
            id: 'tool-quote-1',
            name: 'Tool: Cotizar Envío',
            type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
            typeVersion: 1.1,
            position: [1680, 640],
            parameters: {
                method: 'POST',
                url: `${BACKEND_URL}/api/bot/quote`,
                sendBody: true,
                specifyBody: 'json',
                jsonBody: '{ "address": "{address}" }',
                placeholderDefinitions: {
                    values: [
                        { name: 'address', description: 'Dirección completa de entrega. Si no dan comuna, agrega ", Concepción". Ejemplo: "Los Carrera 1234, Concepción"', type: 'string' }
                    ]
                },
                description: 'Calcula el costo de envío a una dirección. Retorna: inRange (boolean), shippingCost (número en CLP), eta (tiempo estimado). Si inRange=false, el cliente está fuera del radio de 8km.',
                authentication: 'none',
                sendHeaders: true,
                headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
                options: {}
            }
        },
        // 14. TOOL: Crear Pedido
        {
            id: 'tool-order-1',
            name: 'Tool: Crear Pedido',
            type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
            typeVersion: 1.1,
            position: [1820, 640],
            parameters: {
                method: 'POST',
                url: `${BACKEND_URL}/api/bot/order`,
                sendBody: true,
                specifyBody: 'json',
                jsonBody: '{ "userId": "{userId}", "shippingAddress": "{shippingAddress}", "shippingCost": {shippingCost}, "items": {items_json} }',
                placeholderDefinitions: {
                    values: [
                        { name: 'userId', description: 'ID del usuario obtenido de identificar_cliente', type: 'string' },
                        { name: 'shippingAddress', description: 'Dirección de entrega o "Retiro en local"', type: 'string' },
                        { name: 'shippingCost', description: 'Costo de envío en CLP (número entero, 0 si es retiro)', type: 'number' },
                        { name: 'items_json', description: 'Array JSON de items. Cada item: {"productId":"<id del catálogo>","name":"<nombre>","quantity":<cantidad>,"price":<precio>,"dynamicSelections":[{"modifierGroupId":"<groupId>","selectedOptionIds":["<optionId>"]}]}. Los IDs vienen del catálogo (ver_menu). Ejemplo: [{"productId":"abc","name":"Ceviche LOMASRICO","quantity":1,"price":11900,"dynamicSelections":[{"modifierGroupId":"xyz","selectedOptionIds":["opt1","opt2"]}]}]', type: 'string' }
                    ]
                },
                description: 'Crea un pedido y genera link de pago MercadoPago. SOLO llamar cuando el cliente haya confirmado TODO: productos, modificadores, dirección/retiro. Retorna: orderId, orderCode, total, paymentLink. Envía el paymentLink al cliente para que pague.',
                authentication: 'none',
                sendHeaders: true,
                headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
                options: {}
            }
        },
        // 15. SEND WHATSAPP
        {
            id: 'send-wa-1',
            name: 'Enviar WhatsApp',
            type: 'n8n-nodes-base.twilio',
            typeVersion: 1,
            position: [1540, 440],
            parameters: {
                from: "={{ $('Config').item.json.twilioWhatsAppNumber }}",
                to: "={{ $('Extract Data').item.json.phone }}",
                toWhatsapp: true,
                message: "={{ $json.output }}",
                options: {}
            },
            credentials: { twilioApi: { id: 'Df5vCLNP73x57y8y', name: 'Twilio account' } }
        },
        // 16. LOG BOT RESPONSE
        {
            id: 'log-1',
            name: 'Log Response',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [1760, 440],
            parameters: {
                method: 'POST',
                url: `=${BACKEND_URL}/api/bot/log-response`,
                sendHeaders: true,
                headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
                sendBody: true, specifyBody: 'json',
                jsonBody: `={{ JSON.stringify({ phone: $('Extract Data').item.json.phone, text: $('Maxi Agent').item.json.output }) }}`
            }
        }
    ];

    const connections = {
        'WhatsApp Webhook': { main: [[{ node: 'Config', type: 'main', index: 0 }]] },
        'Config': { main: [[{ node: 'Extract Data', type: 'main', index: 0 }]] },
        'Extract Data': { main: [[{ node: 'Check Mode', type: 'main', index: 0 }]] },
        'Check Mode': { main: [[{ node: 'Is Human?', type: 'main', index: 0 }]] },
        'Is Human?': { main: [
            [{ node: 'Save Msg (Human)', type: 'main', index: 0 }],  // true = HUMAN
            [{ node: 'Save Msg (Bot)', type: 'main', index: 0 }]     // false = BOT
        ]},
        'Save Msg (Bot)': { main: [[{ node: 'Maxi Agent', type: 'main', index: 0 }]] },
        'Maxi Agent': { main: [[{ node: 'Enviar WhatsApp', type: 'main', index: 0 }]] },
        'Enviar WhatsApp': { main: [[{ node: 'Log Response', type: 'main', index: 0 }]] },
        // AI connections (tools, model, memory → agent)
        'OpenAI GPT-4o-mini': { ai_languageModel: [[{ node: 'Maxi Agent', type: 'ai_languageModel', index: 0 }]] },
        'Chat Memory': { ai_memory: [[{ node: 'Maxi Agent', type: 'ai_memory', index: 0 }]] },
        'Tool: Identificar Cliente': { ai_tool: [[{ node: 'Maxi Agent', type: 'ai_tool', index: 0 }]] },
        'Tool: Ver Menú': { ai_tool: [[{ node: 'Maxi Agent', type: 'ai_tool', index: 0 }]] },
        'Tool: Cotizar Envío': { ai_tool: [[{ node: 'Maxi Agent', type: 'ai_tool', index: 0 }]] },
        'Tool: Crear Pedido': { ai_tool: [[{ node: 'Maxi Agent', type: 'ai_tool', index: 0 }]] }
    };

    const updatedWorkflow = {
        name: current.name || 'Maxi WhatsApp Agent v2',
        nodes,
        connections,
        settings: current.settings || { executionOrder: 'v1' }
    };

    console.log('📤 Actualizando workflow...');
    const res = await fetch(`${N8N_API}/workflows/${WORKFLOW_ID}`, {
        method: 'PUT',
        headers: {
            'X-N8N-API-KEY': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedWorkflow)
    });

    const result = await res.json();
    if (res.ok) {
        console.log('✅ Workflow actualizado exitosamente!');
        console.log('   Nodos:', result.nodes?.length);
        console.log('   ID:', result.id);
        console.log('   Nombre:', result.name);
    } else {
        console.log('❌ Error:', JSON.stringify(result, null, 2));
    }
}

redesign().catch(e => console.error('FATAL:', e));
