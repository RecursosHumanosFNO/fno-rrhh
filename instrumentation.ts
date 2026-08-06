// Punto de entrada de Sentry para el lado del servidor.
//
// Faltaba: estaban los tres sentry.*.config.ts y el withSentryConfig en
// next.config.js, pero desde @sentry/nextjs v8 los configs de server y edge se
// cargan desde este hook. Sin el archivo, Sentry sólo inicializaba en el
// browser: los errores de las API routes y de los crons no llegaban a ningún
// lado, y la única forma de enterarse de que algo fallaba era que alguien
// avisara que no le había llegado un mail.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
