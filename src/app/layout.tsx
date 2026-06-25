import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { DataProvider } from '@/contexts/DataContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Portal RRHH | Fundación Neuquén Oeste',
  description: 'Sistema de Gestión de Recursos Humanos — Fundación Neuquén Oeste',
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
