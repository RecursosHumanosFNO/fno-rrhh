'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const code = params.get('code') ?? ''

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Intercambiar el código de Supabase por una sesión activa
  useEffect(() => {
    if (!code) { setStatus('invalid'); return }
    if (!supabase) { setStatus('invalid'); return }

    supabase.auth.exchangeCodeForSession(code)
      .then(({ data, error: err }) => {
        if (err || !data.session) {
          setStatus('invalid')
        } else {
          setEmail(data.session.user.email ?? '')
          setStatus('valid')
        }
      })
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (!supabase) { setError('Error de conexión.'); return }

    setSubmitting(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (err) {
      setError(err.message ?? 'Ocurrió un error. Intentá de nuevo.')
    } else {
      setStatus('success')
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(145deg, #82cac2 0%, #76bfac 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-[#1e3a5f] p-6 text-center">
            <h1 className="text-xl font-bold text-white">Fundación Neuquén Oeste</h1>
            <p className="text-blue-200 text-sm mt-1">Portal de Recursos Humanos</p>
          </div>

          <div className="p-8">
            {status === 'loading' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-500">Verificando enlace...</p>
              </div>
            )}

            {status === 'invalid' && (
              <div className="text-center py-4">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-slate-800 mb-2">Enlace inválido o expirado</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Este enlace ya fue utilizado o expiró. Solicitá uno nuevo desde la pantalla de inicio de sesión.
                </p>
                <Link href="/login" className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#162d4a] transition-colors text-sm">
                  Volver al inicio
                </Link>
              </div>
            )}

            {status === 'valid' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-7 h-7 text-[#1e3a5f]" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Nueva contraseña</h2>
                  {email && <p className="text-slate-500 text-sm mt-1">Para la cuenta <strong>{email}</strong></p>}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar contraseña</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                    placeholder="Repetí la contraseña"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1e3a5f] text-white py-3 rounded-lg font-semibold hover:bg-[#162d4a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {submitting ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </form>
            )}

            {status === 'success' && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-slate-800 mb-2">¡Contraseña actualizada!</h2>
                <p className="text-slate-500 text-sm mb-2">Tu contraseña fue cambiada correctamente.</p>
                <p className="text-slate-400 text-sm">Redirigiendo al inicio de sesión...</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/70 text-sm mt-6">
          ¿Recordaste tu contraseña?{' '}
          <Link href="/login" className="text-white font-medium hover:underline">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
