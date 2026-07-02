import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { DataProvider } from '@/contexts/DataContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Portal RRHH | Fundación Neuquén Oeste',
  description: 'Sistema de Gestión de Recursos Humanos — Fundación Neuquén Oeste',
  manifest: '/manifest.json',
  themeColor: '#23597e',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Portal FNO',
    startupImage: '/icon-512.png',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ErrorBoundary>
            <DataProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </DataProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
