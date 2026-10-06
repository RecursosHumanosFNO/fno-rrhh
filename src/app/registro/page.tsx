'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { SECTORES, CARGOS_POR_SECTOR } from '@/lib/mockData'
import { CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// Segundo paso del camino Google → datos → RRHH → portal.
//
// Antes era una pantalla suelta donde la persona escribía su email y elegía una
// contraseña. Ahora se llega acá sólo con sesión de Google ya abierta, y el
// correo viene de ahí: no se escribe y no se puede cambiar. Eso cierra de raíz
// el caso de alguien pidiendo acceso con el mail de otro, y de paso garantiza
// que el correo con el que RRHH lo aprueba es exactamente con el que va a
// entrar.
export default function RegistroPage() {
  const { addPendingRegistration } = useData()
  const { estadoAcceso, datosGoogle, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '',
    sector: '', cargo: '', telefono: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Sin sesión no hay nada que completar: el camino empieza en el login.
  // Y quien ya tiene acceso no tiene por qué volver a pedirlo.
  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) { router.replace('/dashboard'); return }
    if (estadoAcceso !== 'sin-cuenta' && estadoAcceso !== 'pendiente') router.replace('/login')
  }, [isLoading, isAuthenticated, estadoAcceso, router])

  // Google ya sabe cómo se llama: se precarga y queda editable, porque el
  // nombre de la cuenta personal no siempre es el que corresponde al legajo.
  useEffect(() => {
    if (!datosGoogle) return
    setForm(f => ({
      ...f,
      nombre: f.nombre || datosGoogle.nombre,
      apellido: f.apellido || datosGoogle.apellido,
    }))
  }, [datosGoogle])

  function update(field: string, value: string) {
    if (field === 'sector') {
      setForm(prev => ({ ...prev, sector: value, cargo: '' }))
    } else {
      setForm(prev => ({ ...prev, [field]: value }))
    }
  }

  const cargosDisponibles = form.sector ? CARGOS_POR_SECTOR[form.sector] ?? [] : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.nombre || !form.apellido || !form.dni || !form.sector || !form.cargo)
      return setError('Completá todos los campos obligatorios.')

    const emailNorm = (datosGoogle?.email ?? '').toLowerCase().trim()
    if (!emailNorm) return setError('No pudimos leer tu correo. Entrá de nuevo con Google.')

    setLoading(true)
    addPendingRegistration({
      nombre: form.nombre, apellido: form.apellido, dni: form.dni,
      email: emailNorm,
      sector: form.sector, cargo: form.cargo, telefono: form.telefono,
    })
    setLoading(false)
    setSuccess(true)
  }

  // Mientras se resuelve la sesión no se decide nada: sin esto, el formulario
  // parpadea un instante antes de que el efecto redirija a quien no corresponde.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    )
  }

  // Ya mandó sus datos y espera a RRHH. Es el estado en el que va a quedar
  // cada vez que entre hasta que lo aprueben, así que tiene que decir algo
  // claro y no devolverle el formulario en blanco para que lo cargue de nuevo.
  if (estadoAcceso === 'pendiente' && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Tu solicitud está en revisión</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Ya recibimos tus datos. El área de Recursos Humanos tiene que aprobarlos
            antes de que puedas entrar. Cuando lo hagan, entrás con Google como ahora
            y ya vas a ver el portal.
          </p>
          <button onClick={() => { logout(); router.replace('/login') }} className="btn-secondary w-full justify-center">
            Cerrar sesión
          </button>
        </div>
      </div>
    )
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
          <button onClick={() => { logout(); router.replace('/login') }} className="btn-secondary w-full justify-center">
            Cerrar sesión
          </button>
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Completá tus datos</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
            Entraste con Google. Falta que nos digas quién sos para que RRHH
            pueda darte acceso.
          </p>

          {/* El correo no se escribe: lo confirmó Google al entrar. */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3 mb-5">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Entrando como</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {datosGoogle?.email ?? '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { logout(); router.replace('/login') }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shrink-0"
            >
              No soy yo
            </button>
          </div>

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
                <label htmlFor="registro-nombre" className="form-label">Nombre *</label>
                <input id="registro-nombre" name="nombre" autoComplete="given-name" className="form-input" placeholder="María" value={form.nombre} onChange={e => update('nombre', e.target.value)} />
              </div>
              <div>
                <label htmlFor="registro-apellido" className="form-label">Apellido *</label>
                <input id="registro-apellido" name="apellido" autoComplete="family-name" className="form-input" placeholder="García" value={form.apellido} onChange={e => update('apellido', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="registro-dni" className="form-label">DNI *</label>
                <input id="registro-dni" name="dni" className="form-input" placeholder="XX.XXX.XXX" value={form.dni} onChange={e => update('dni', e.target.value)} />
              </div>
              <div>
                <label htmlFor="registro-telefono" className="form-label">Teléfono</label>
                <input id="registro-telefono" name="telefono" type="tel" autoComplete="tel" className="form-input" placeholder="299-XXXXXXX" value={form.telefono} onChange={e => update('telefono', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="registro-sector" className="form-label">Sector *</label>
                <select id="registro-sector" name="sector" className="form-select" value={form.sector} onChange={e => update('sector', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="registro-cargo" className="form-label">Cargo *</label>
                <select
                  id="registro-cargo"
                  name="cargo"
                  className="form-select"
                  value={form.cargo}
                  onChange={e => update('cargo', e.target.value)}
                  disabled={!form.sector}
                >
                  <option value="">{form.sector ? 'Seleccionar' : 'Primero elegí sector'}</option>
                  {cargosDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* No hay contraseña en ninguna parte del camino: al portal se
                entra con la cuenta de Google que la persona ya usó para llegar
                hasta acá. */}
            <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              Cuando RRHH apruebe tu solicitud te avisamos por mail y entrás con esta misma cuenta de Google. No hay contraseña que crear.
            </p>

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
