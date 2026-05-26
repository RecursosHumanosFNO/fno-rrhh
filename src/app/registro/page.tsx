'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/contexts/DataContext'
import { SECTORES } from '@/lib/mockData'
import { Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function RegistroPage() {
  const { addPendingRegistration, getUserByEmail, getPendingByEmail } = useData()
  const router = useRouter()

  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', email: '',
    password: '', confirmPassword: '', sector: '', cargo: '', telefono: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.nombre || !form.apellido || !form.dni || !form.email || !form.password || !form.sector || !form.cargo)
      return setError('Completá todos los campos obligatorios.')
    if (form.password.length < 6)
      return setError('La contraseña debe tener al menos 6 caracteres.')
    if (form.password !== form.confirmPassword)
      return setError('Las contraseñas no coinciden.')

    const emailNorm = form.email.toLowerCase().trim()
    if (getUserByEmail(emailNorm))
      return setError('Ya existe una cuenta con ese email.')
    if (getPendingByEmail(emailNorm))
      return setError('Ya hay una solicitud pendiente con ese email.')

    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    addPendingRegistration({
      nombre: form.nombre, apellido: form.apellido, dni: form.dni,
      email: emailNorm, password: form.password,
      sector: form.sector, cargo: form.cargo, telefono: form.telefono,
    })
    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">¡Solicitud enviada!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Tu solicitud de acceso fue enviada correctamente. El área de Recursos Humanos revisará tus datos y activará tu cuenta. Recibirás una notificación cuando esté lista.
          </p>
          <Link href="/login" className="btn-primary w-full justify-center">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-700 flex items-center justify-center">
            <Image src="/logo.png" alt="Logo FNO" width={48} height={48} className="object-contain"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.display='none' }} />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">Fundación Neuquén Oeste</p>
            <p className="text-slate-500 text-xs">Portal de RRHH</p>
          </div>
        </div>

        <div className="card p-6">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-5">
            <ArrowLeft className="w-4 h-4" /> Volver al login
          </Link>

          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Crear cuenta</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Completá tus datos. El administrador de RRHH deberá aprobar tu acceso antes de que puedas ingresar.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-5">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">⚠️ Acceso sujeto a aprobación</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              Tu cuenta será revisada por el área de RRHH antes de activarse. Solo personal de la Fundación puede acceder al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nombre *</label>
                <input className="form-input" placeholder="María" value={form.nombre} onChange={e => update('nombre', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Apellido *</label>
                <input className="form-input" placeholder="García" value={form.apellido} onChange={e => update('apellido', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">DNI *</label>
                <input className="form-input" placeholder="XX.XXX.XXX" value={form.dni} onChange={e => update('dni', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input className="form-input" placeholder="299-XXXXXXX" value={form.telefono} onChange={e => update('telefono', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="tu@email.com" value={form.email} onChange={e => update('email', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Sector *</label>
                <select className="form-select" value={form.sector} onChange={e => update('sector', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Cargo *</label>
                <input className="form-input" placeholder="Docente" value={form.cargo} onChange={e => update('cargo', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-label">Contraseña *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="form-input pr-10"
                  placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => update('password', e.target.value)} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">Confirmar contraseña *</label>
              <input type="password" className="form-input" placeholder="Repetí la contraseña"
                value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={loading}>
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
              ) : 'Enviar solicitud de acceso'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
