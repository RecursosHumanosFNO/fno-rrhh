'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/components/ThemeProvider'
import { AlertCircle, ExternalLink, Sun, Moon } from 'lucide-react'
import Image from 'next/image'

// Única forma de entrar: la cuenta de Google.
//
// Antes convivían las dos. La contraseña arrastraba todo un aparato —mails con
// links que vencen, "olvidé mi contraseña", reenvíos— que fue, de lejos, lo que
// más problemas dio para que la gente simplemente pudiera entrar. Con Google no
// hay nada que recordar ni que reenviar, y el correo lo verifica Google, así que
// desaparece de paso el camino por el que alguien podía declarar un mail ajeno.
export default function LoginPage() {
  const { loginConGoogle, estadoAcceso, motivoRechazo } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  const [error, setError] = useState('')
  const [googleCargando, setGoogleCargando] = useState(false)

  // Con sesión de Google pero sin cuenta del portal, el paso siguiente es
  // cargar los datos. Son parte del camino, no un rechazo.
  useEffect(() => {
    if (estadoAcceso === 'sin-cuenta' || estadoAcceso === 'pendiente') {
      router.replace('/registro')
    }
  }, [estadoAcceso, router])

  async function handleGoogle() {
    setError('')
    setGoogleCargando(true)
    const err = await loginConGoogle()
    // Si salió bien el navegador ya se está yendo a Google; el spinner queda
    // hasta que se va, a propósito.
    if (err) { setError(err); setGoogleCargando(false) }
  }


  return (
    <div className="min-h-screen flex">
      {/* Toggle modo claro/oscuro */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-white/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 shadow-lg hover:scale-105 transition-transform"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Left panel — imagen de fondo */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* Foto de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/sede.jpg')" }}
        />
        {/* Overlay degradado */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/90 via-brand-700/80 to-brand-500/70" />

        {/* Contenido */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="Logo FNO" width={56} height={56} className="object-contain" onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.display='none' }} />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Fundación</p>
              <p className="text-blue-200 text-sm font-medium">Neuquén Oeste</p>
            </div>
          </div>
          <div className="mt-8">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Portal de<br />Recursos Humanos
            </h1>
            <p className="text-blue-100/80 text-lg leading-relaxed">
              Gestioná tu información laboral, solicitá permisos y accedé a todos tus documentos en un solo lugar.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { n: '+160', label: 'Empleados' },
              { n: '+1000', label: 'Alumnos' },
              { n: '24/7', label: 'Disponible' },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center border border-white/20">
                <p className="text-2xl font-bold text-white">{item.n}</p>
                <p className="text-blue-200 text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <a
            href="https://fundacionnqnoeste.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-200 hover:text-white text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            fundacionnqnoeste.com
          </a>
        </div>
      </div>

      {/* Right panel — formulario (sobre la aurora institucional del body) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 dark:border-slate-700/60 p-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-700 flex items-center justify-center">
              <Image src="/logo.png" alt="Logo FNO" width={48} height={48} className="object-contain" onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.display='none' }} />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Fundación Neuquén Oeste</p>
              <p className="text-slate-500 text-xs">Portal de RRHH</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Iniciar sesión</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Ingresá con tus credenciales institucionales</p>
          </div>

          {!error && motivoRechazo && (
            <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg px-4 py-3 mb-5 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {motivoRechazo}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-5 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}


          <div className="mt-5">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleCargando}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
            >
              {googleCargando ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                  <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
                </svg>
              )}
              {googleCargando ? 'Abriendo Google...' : 'Continuar con Google'}
            </button>

            <p className="text-xs text-slate-400 mt-2 text-center">
              Usá la cuenta de Google del correo que le diste a RRHH.
            </p>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">¿Primera vez?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Entrá con tu cuenta de Google igual. Te vamos a pedir tus datos y
              RRHH va a revisar tu solicitud antes de darte acceso.
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-8">
            © {new Date().getFullYear()} Fundación Neuquén Oeste — Portal Interno RRHH v2.0
          </p>
        </div>
      </div>
    </div>
  )
}
