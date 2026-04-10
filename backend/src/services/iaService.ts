import OpenAI from 'openai';
import { env } from '../config/env';
import { prismaReadOnly, prisma } from '../config/database';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un analista de negocio experto para un desarrollador de SaaS.
Tienes acceso SOLO LECTURA a una base de datos PostgreSQL con clientes, suscripciones y pagos de múltiples SaaS.

REGLAS ESTRICTAS:
- Solo generar SELECT, NUNCA UPDATE, DELETE, INSERT, DROP, ALTER, TRUNCATE
- Siempre incluir LIMIT 100 en las queries
- No acceder a datos personales sensibles (password_hash)
- Si no hay datos suficientes, decirlo claramente
- Sugerir acciones basadas en datos

ESQUEMA DE BASE DE DATOS:
- clientes_global: id, email, nombre, telefono, pais, empresa, origen_saas, estado, fecha_registro, fecha_ultimo_login
- suscripciones: id, cliente_id, saas, plan_tipo, estado, monto, moneda, fecha_inicio, fecha_fin, fecha_cancelacion
- pagos: id, suscripcion_id, cliente_id, monto, moneda, estado, fecha_pago
- metricas_diarias: id, fecha, saas, nuevos_registros, nuevos_pagos, cancelaciones, mrr, arr, churn_rate
- eventos: id, tipo, severidad, cliente_id, saas, datos, fecha

CONTEXTO DE NEGOCIO:
- MRR = Monthly Recurring Revenue (ingresos recurrentes mensuales)
- Churn = clientes que cancelan / total clientes activos
- LTV = valor de vida del cliente
- Trial = periodo de prueba gratuito

FORMATO DE RESPUESTA:
- Respuestas cortas para preguntas simples
- Listas con bullets para comparativas
- Tablas Markdown para datos tabulares
- Emojis para indicadores visuales (📈 📉 ⚠️ ✅)`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: 'Ejecuta una consulta SELECT de solo lectura en la base de datos',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'Consulta SQL SELECT (solo lectura)' },
          explanation: { type: 'string', description: 'Explicación breve de qué busca la query' },
        },
        required: ['sql', 'explanation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_metric_summary',
      description: 'Obtiene un resumen de métricas para un período y SaaS específicos',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', enum: ['mrr', 'churn', 'registros', 'pagos', 'cancelaciones'] },
          period: { type: 'string', enum: ['hoy', 'ayer', 'semana', 'mes', 'trimestre'] },
          saas: { type: 'string', description: 'Nombre del SaaS (opcional, todos si no se especifica)' },
        },
        required: ['metric', 'period'],
      },
    },
  },
];

function validateSQL(sql: string): boolean {
  const normalized = sql.toUpperCase().trim();
  const forbidden = ['UPDATE', 'DELETE', 'INSERT', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE', 'EXEC'];
  for (const keyword of forbidden) {
    if (normalized.includes(keyword)) return false;
  }
  if (!normalized.startsWith('SELECT')) return false;
  if (!normalized.includes('LIMIT')) return false;
  if (normalized.includes('PASSWORD') || normalized.includes('SECRET') || normalized.includes('TOKEN')) return false;
  return true;
}

async function executeReadOnlyQuery(sql: string): Promise<any[]> {
  if (!validateSQL(sql)) {
    throw new Error('Query no permitida: solo SELECT con LIMIT permitido');
  }

  const result = await prismaReadOnly.$queryRawUnsafe(sql);
  return result as any[];
}

export async function chatWithIA(
  userId: number,
  message: string
): Promise<{ response: string; sql?: string; data?: any; time: number }> {
  const start = Date.now();

  try {
    // Get recent conversation context
    const recentConversations = await prisma.conversacionIa.findMany({
      where: { usuarioId: userId },
      orderBy: { fecha: 'desc' },
      take: 5,
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentConversations.reverse().flatMap((c) => [
        { role: 'user' as const, content: c.mensajeUsuario },
        { role: 'assistant' as const, content: c.respuestaIa },
      ]),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 1000,
    });

    let responseText = '';
    let sqlGenerated: string | undefined;
    let queryData: any;

    const choice = completion.choices[0];

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === 'query_database') {
        sqlGenerated = args.sql;
        try {
          queryData = await executeReadOnlyQuery(args.sql);
        } catch (err: any) {
          queryData = { error: err.message };
        }

        // Get natural language response
        const followUp = await openai.chat.completions.create({
          model: env.OPENAI_MODEL,
          messages: [
            ...messages,
            choice.message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(queryData),
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        });

        responseText = followUp.choices[0].message.content || 'No pude generar una respuesta.';
      }
    } else {
      responseText = choice.message.content || 'No pude procesar tu consulta.';
    }

    const time = Date.now() - start;

    // Save conversation
    await prisma.conversacionIa.create({
      data: {
        usuarioId: userId,
        mensajeUsuario: message,
        respuestaIa: responseText,
        sqlGenerado: sqlGenerated,
        datosConsulta: queryData,
        tiempoRespuesta: time,
      },
    });

    return { response: responseText, sql: sqlGenerated, data: queryData, time };
  } catch (error) {
    logger.error('IA chat error:', error);
    const time = Date.now() - start;
    return { response: 'Error al procesar tu consulta. Inténtalo de nuevo.', time };
  }
}
