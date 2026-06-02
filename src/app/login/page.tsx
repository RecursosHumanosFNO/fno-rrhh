'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/components/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Lock, Mail, AlertCircle, ExternalLink, Sun, Moon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Completá todos los campos.'); return }
    setLoading(true)
    const result = await login(email, password, remember)
    setLoading(false)
    if (result === 'ok') router.replace('/dashboard')
    else if (result === 'pendiente') setError('Tu solicitud de acceso está pendiente de aprobación por el administrador.')
    else if (result === 'timeout') setError('El servidor está tardando en responder. Esperá un minuto y volvé a intentar.')
    else setError('Email o contraseña incorrectos.')
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

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-5 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" className="form-input pl-10" placeholder="tu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="form-label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPass ? 'text' : 'password'} className="form-input pl-10 pr-10"
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Recordar sesión</span>
              </label>
              <ForgotPasswordLink />
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Ingresando...</>
              ) : 'Ingresar al Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ¿Primera vez en el sistema?{' '}
              <Link href="/registro" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                Crear cuenta
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-8">
            © 2026 Fundación Neuquén Oeste — Portal Interno RRHH v2.0
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Componente "Olvidé mi contraseña" ─────────────────────────────────────────
function ForgotPasswordLink() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !supabase) return
    setStatus('loading')
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      { redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password` },
    )
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium">
        ¿Olvidaste tu contraseña?
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setOpen(false); setStatus('idle'); setEmail('') }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Recuperar contraseña</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Ingresá tu email y te enviaremos un link para crear una nueva contraseña.
            </p>
            {status === 'sent' ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✉️</span>
                </div>
                <p className="font-medium text-slate-800 dark:text-slate-100 mb-1">¡Email enviado!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Revisá tu bandeja de entrada. El link es válido por 30 minutos.</p>
                <button onClick={() => { setOpen(false); setStatus('idle') }} className="mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-4">
                {status === 'error' && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    Ocurrió un error. Intentá de nuevo o contactá a RRHH.
                  </p>
                )}
                <input
                  type="email"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setOpen(false); setStatus('idle') }} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={status === 'loading'} className="flex-1 bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-60">
                    {status === 'loading' ? 'Enviando...' : 'Enviar link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
