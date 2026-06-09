'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useChat } from 'ai/react'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, X, Send, Loader2, ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AIChatAssistant() {
  const { empleado } = useAuth()
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Memoizar para no recrear el objeto en cada render
  const context = useMemo(() => empleado ? {
    nombre: empleado.nombre,
    apellido: empleado.apellido,
    sector: empleado.sector,
    cargo: empleado.cargo,
    tipoContrato: empleado.tipoContrato,
    fechaIngreso: empleado.fechaIngreso,
  } : null, [empleado?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-brand-600 rounded-t-2xl">
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
              <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-brand-500" />
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
                <div className="w-6 h-6 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm',
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">
                Error al conectar con el asistente. Revisá tu conexión o intentá de nuevo.
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
            className="w-8 h-8 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
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
            : 'bg-brand-600 hover:bg-brand-700 hover:scale-110',
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
