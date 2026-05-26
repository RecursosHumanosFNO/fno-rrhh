'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, Lock, Mail, AlertCircle, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const { login } = useAuth()
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
    else setError('Email o contraseña incorrectos.')
  }

  return (
    <div className="min-h-screen flex">
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
              { n: '10', label: 'Sectores' },
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

      {/* Right panel — formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
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

          <div className="mt-6 p-3.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              ¿Olvidaste tu contraseña? Contactá al área de RRHH para restablecerla.
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
