import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'

export const maxDuration = 30

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json()

    const systemPrompt = `Sos el asistente virtual de RRHH de la Fundación Neuquén Oeste.
Respondés preguntas sobre recursos humanos, políticas internas, beneficios,
licencias, vacaciones y el uso del portal.

${context ? `Datos del empleado logueado:
- Nombre: ${context.nombre} ${context.apellido}
- Sector: ${context.sector || 'No asignado'}
- Cargo: ${context.cargo || 'No asignado'}
- Tipo de contrato: ${context.tipoContrato || 'No especificado'}
- Fecha de ingreso: ${context.fechaIngreso || 'No especificada'}
` : ''}

Reglas:
- Respondé siempre en español, de forma clara y amigable.
- Si no sabés algo específico de la organización, decilo y sugerí que consulten con el área de RRHH.
- No inventes datos ni políticas que no te fueron dados.
- Sé conciso pero completo. Usá bullet points cuando sea útil.
- No menciones datos sensibles como DNI, CUIL o CBU aunque los tengas.`

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (err) {
    console.error('[chat] error:', err)
    return new Response(
      JSON.stringify({ error: 'Error al procesar la consulta' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
