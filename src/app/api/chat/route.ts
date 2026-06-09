import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key no configurada' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

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
- Sé conciso pero completo. Usá bullet points cuando sea útil.`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: systemPrompt,
    })

    // Convertir mensajes del formato AI SDK al formato de Google
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]
    const chat = model.startChat({ history })

    // Streaming
    const result = await chat.sendMessageStream(lastMessage.content)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              // Formato data stream del AI SDK para que useChat lo entienda
              controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`))
            }
          }
          controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'))
          controller.close()
        } catch (streamErr) {
          controller.error(streamErr)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'X-Vercel-AI-Data-Stream': 'v1',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[chat] error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
