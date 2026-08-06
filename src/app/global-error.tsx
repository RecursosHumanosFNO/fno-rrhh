'use client'

// Último recinto: un error de render que ni siquiera el ErrorBoundary alcanza a
// atrapar (los del root layout) deja la pantalla en blanco. Acá al menos se
// reporta a Sentry y la persona ve algo con qué seguir.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <html lang="es">
      <body style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc', padding: '24px', margin: 0,
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, color: '#1e293b', marginBottom: 8 }}>
            Algo se rompió
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
            Ya nos llegó el aviso. Probá de nuevo; si sigue pasando, avisale a RRHH.
          </p>
          <button onClick={reset} style={{
            background: '#0f766e', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer',
          }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
