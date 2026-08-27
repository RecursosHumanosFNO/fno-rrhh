// Sentry del lado del cliente.
//
// Antes esto era sentry.client.config.ts. Next lo reemplazó por este archivo, y
// el nombre viejo deja de funcionar con Turbopack — que es el compilador por
// defecto desde Next 16. Acá el build todavía usa webpack por next-pwa, así que
// el rename es para no quedar atados a esa dependencia.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,
  integrations: [
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
})

// Instrumenta las navegaciones del App Router: sin esto Sentry no puede medir
// los cambios de pantalla, que en una SPA son la mayoría de la navegación.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
