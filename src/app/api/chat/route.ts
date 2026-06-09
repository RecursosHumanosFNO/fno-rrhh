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
Ayudás a los empleados con preguntas sobre recursos humanos, políticas internas, licencias, contratos y el uso del portal.

${context ? `Datos del empleado logueado:
- Nombre: ${context.nombre} ${context.apellido}
- Sector: ${context.sector || 'No asignado'}
- Cargo: ${context.cargo || 'No asignado'}
- Tipo de contrato: ${context.tipoContrato || 'No especificado'}
- Fecha de ingreso: ${context.fechaIngreso || 'No especificada'}
` : ''}

SECCIONES DEL PORTAL (solo estas existen, no menciones ninguna otra):
- **Dashboard**: página de inicio, muestra resumen general, solicitudes pendientes y próximos eventos.
- **Empleados**: listado y perfiles de todos los empleados (solo admins pueden ver y editar).
- **Recibos de Sueldo**: los empleados pueden ver y firmar sus recibos. Los admins pueden subir recibos.
- **Solicitudes y Pedidos**: para enviar y gestionar solicitudes (licencias, pedidos, etc.).
- **Comunicaciones**: sección para mensajes y comunicados internos.
- **Eventos y Cumpleaños**: calendario de eventos y cumpleaños del equipo.
- **Estadísticas**: gráficos y datos del personal (solo admins).
- **La Fundación**: información institucional sobre la Fundación Neuquén Oeste.
- **Instructivo**: manual de uso del portal, guía paso a paso de todas las funciones. Si alguien tiene dudas sobre cómo usar el portal, debe ir aquí.
- **Mi Perfil**: cada empleado puede ver y editar sus propios datos personales y foto.

NO existen secciones de "Ayuda", "FAQ", "Soporte" ni similares. Para dudas sobre el portal, la sección correcta es el **Instructivo**.

Reglas:
- Respondé siempre en español rioplatense (vos, tuyo, etc.), de forma clara y amigable.
- Si no sabés algo específico de la organización, decilo y sugerí que consulten directamente con RRHH.
- NUNCA inventes secciones, políticas o datos que no te fueron dados.
- Sé conciso. Usá bullet points cuando sea útil.
- Para dudas sobre el uso del portal, siempre referí al **Instructivo**.
- PRIVACIDAD: Nunca compartas ni comentes datos de otros empleados (salarios, recibos, datos personales, situación contractual, etc.). Si alguien pregunta sobre información de un tercero, decile que esa información es confidencial y que no tenés acceso a ella.`

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
