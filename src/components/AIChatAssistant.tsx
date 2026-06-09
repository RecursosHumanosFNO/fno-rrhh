'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useChat } from 'ai/react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { EVENTO_TIPO_LABEL, cn } from '@/lib/utils'
import { Sparkles, X, Send, Loader2, ChevronDown, AlertCircle, ArrowRight } from 'lucide-react'

// Renderiza texto con links markdown [texto](/ruta) como botones de navegación
function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  // Regex para detectar [texto](/ruta)
  const linkRegex = /\[([^\]]+)\]\((\/[^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    // Texto antes del link
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="whitespace-pre-wrap">
          {content.slice(lastIndex, match.index)}
        </span>
      )
    }
    // Botón de navegación
    parts.push(
      <Link
        key={match.index}
        href={match[2]}
        className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1.5 ai-gradient hover:opacity-90 text-white text-xs font-medium rounded-lg transition-opacity"
      >
        {match[1]}
        <ArrowRight className="w-3 h-3" />
      </Link>
    )
    lastIndex = match.index + match[0].length
  }

  // Texto restante
  if (lastIndex < content.length) {
    parts.push(
      <span key={lastIndex} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>
    )
  }

  if (parts.length === 0) {
    return <p className="whitespace-pre-wrap">{content}</p>
  }

  return <div className={isUser ? 'text-white' : ''}>{parts}</div>
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default function AIChatAssistant() {
  const { empleado } = useAuth()
  const { eventos, empleados } = useData()
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Formatear eventos relevantes para la IA (últimos 30 días + próximos 120)
  const eventosResumen = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const en120 = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const relevantes = eventos
      .filter(e => e.fecha >= hace30 && e.fecha <= en120)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
    if (relevantes.length === 0) return null
    return relevantes
      .map(e => {
        const tipoLabel = EVENTO_TIPO_LABEL[e.tipo] ?? e.tipo
        const desc = e.descripcion ? ` — ${e.descripcion}` : ''
        const pasado = e.fecha < hoy ? ' [pasado]' : e.fecha === hoy ? ' [HOY]' : ''
        return `${e.fecha}${pasado} ${tipoLabel}: ${e.titulo}${desc}`
      })
      .join('\n')
  }, [eventos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cumpleaños del equipo: solo nombre + día/mes, sin año (no expone edad)
  const cumpleanos = useMemo(() => {
    return empleados
      .filter(e => e.fechaNacimiento && e.estado !== 'inactivo')
      .map(e => {
        const partes = e.fechaNacimiento.split('-')
        const mes = parseInt(partes[1], 10) - 1
        const dia = parseInt(partes[2], 10)
        return `${e.nombre} ${e.apellido}: ${dia} de ${MESES[mes]}`
      })
      .sort()
      .join('\n')
  }, [empleados])

  // Memoizar para no recrear el objeto en cada render
  const context = useMemo(() => ({
    ...(empleado ? {
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      sector: empleado.sector,
      cargo: empleado.cargo,
      tipoContrato: empleado.tipoContrato,
      fechaIngreso: empleado.fechaIngreso,
    } : {}),
    eventosResumen,
    cumpleanos: cumpleanos || null,
    hoy: new Date().toISOString().slice(0, 10),
  }), [empleado?.id, eventosResumen, cumpleanos]) // eslint-disable-line react-hooks/exhaustive-deps

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append, error } = useChat({
    api: '/api/chat',
    body: { context },
    onError: (err) => {
      console.error('[AIChatAssistant] error:', err)
    },
  })

  // Scroll automático al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleClose() {
    setOpen(false)
  }

  function handleClear() {
    setMessages([])
  }

  return (
    <>
      {/* Panel de chat */}
      <div
        className={cn(
          'fixed bottom-20 right-4 z-50 w-[350px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 origin-bottom-right',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none',
        )}
        style={{ maxHeight: '520px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 ai-gradient rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">Asistente RRHH</p>
              <p className="text-white/60 text-xs">Fundación Neuquén Oeste</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
              >
                Limpiar
              </button>
            )}
            <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: '360px' }}>
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 ai-gradient rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¡Hola{empleado ? `, ${empleado.nombre}` : ''}! 👋
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Soy tu asistente de RRHH. Podés preguntarme sobre vacaciones, licencias, contratos y más.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  '¿Cómo solicito una licencia?',
                  '¿Cómo uso el portal?',
                  '¿Qué tipos de contrato existen?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => append({ role: 'user', content: q })}
                    className="block w-full text-left text-xs bg-slate-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-600 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-300 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => (
            <div
              key={m.id}
              className={cn(
                'flex',
                m.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 ai-gradient rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ai-gradient text-white rounded-tr-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm',
                )}
              >
                <MessageContent content={m.content} isUser={m.role === 'user'} />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 ai-gradient rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 break-all">
                {error.message || 'Error desconocido'}
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          id="ai-chat-form"
          onSubmit={handleSubmit}
          className="flex items-center gap-2 p-3 border-t border-slate-200 dark:border-slate-700"
        >
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Escribí tu consulta..."
            disabled={isLoading}
            className="flex-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500 transition-all placeholder:text-slate-400 dark:text-slate-200 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-8 h-8 ai-gradient hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-opacity flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </form>
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          open
            ? 'bg-slate-600 hover:bg-slate-700 rotate-0'
            : 'ai-gradient hover:opacity-90 hover:scale-110',
        )}
        title="Asistente RRHH"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <Sparkles className="w-5 h-5 text-white" />
        }
      </button>
    </>
  )
}
