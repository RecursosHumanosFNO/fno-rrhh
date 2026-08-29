/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')
// OJO: el build tiene que correr con `next build --webpack` (ver package.json).
// Serwist, igual que next-pwa antes, es un plugin de webpack: con Turbopack no
// falla nada, simplemente NO genera public/sw.js. Como ese archivo está en
// .gitignore, en Vercel no existiría y las push dejarían de funcionar sin
// ningún error visible. (Existe @serwist/turbopack, pero es experimental y no
// vale el riesgo para el worker que sostiene las notificaciones.)
const withSerwist = require('@serwist/next').default({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // El registro lo hace ServiceWorkerRegister.tsx, que además escucha los
  // mensajes del worker para navegar al tocar una push.
  register: false,
  // next-pwa no recargaba la app al volver la conexión; Serwist sí lo hace por
  // defecto. Se deja como estaba: una recarga sorpresa en medio de un formulario
  // es peor que un dato viejo.
  reloadOnOnline: false,
  // Serwist descarga TODO el manifiesto al instalar el service worker, y si una
  // sola URL responde 404 la instalación entera falla y el worker nunca activa
  // (el síntoma es que las notificaciones push no se pueden activar nunca).
  //
  // Los .map no se sirven en producción porque Sentry está con hideSourceMaps,
  // y los build manifests tampoco son públicos: si entran al precache, rompen
  // la instalación.
  exclude: [
    /\.map$/,
    /^build-manifest\.json$/,
    /^react-loadable-manifest\.json$/,
    /app-build-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
  ],
})

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
}

module.exports = withSentryConfig(withSerwist(nextConfig), {
  org: 'fundacion-neuquen-oeste',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  // Estas dos se movieron bajo `webpack` en @sentry/nextjs 10; en la raíz
  // siguen funcionando pero avisan que van a desaparecer.
  webpack: {
    treeshake: { removeDebugLogging: true },
    // Sigue en false: los monitores automáticos de cron de Vercel son de pago
    // y acá no se usan.
    automaticVercelMonitors: false,
  },
})
