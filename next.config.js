/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

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

module.exports = withSentryConfig(nextConfig, {
  org: 'fundacion-neuquen-oeste',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
