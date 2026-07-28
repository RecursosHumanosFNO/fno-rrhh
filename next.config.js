/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  customWorkerDir: 'worker',
  // Workbox descarga TODO el manifiesto al instalar el service worker, y si una
  // sola URL responde 404 la instalación entera falla y el worker nunca activa
  // (el síntoma es que las notificaciones push no se pueden activar nunca).
  //
  // Los .map no se sirven en producción porque Sentry está con
  // hideSourceMaps, y los build manifests tampoco son públicos: si entran al
  // precache, rompen la instalación.
  buildExcludes: [
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

module.exports = withSentryConfig(withPWA(nextConfig), {
  org: 'fundacion-neuquen-oeste',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
