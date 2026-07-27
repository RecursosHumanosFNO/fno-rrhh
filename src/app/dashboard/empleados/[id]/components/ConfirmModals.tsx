import { UserCheck, Trash2, Loader2, Shield } from 'lucide-react'

type Rol = 'admin' | 'employee' | 'comunicaciones' | 'rrhh'

export function ReactivarModal({ nombreCompleto, onClose, onConfirm }: {
  nombreCompleto: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Reactivar a {nombreCompleto}?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            El empleado volverá a tener acceso al portal con sus credenciales anteriores. Se borrarán los datos de desvinculación.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button
              onClick={onConfirm}
              className="flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors inline-flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" /> Reactivar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EliminarModal({ nombreCompleto, deleting, error, onClose, onConfirm }: {
  nombreCompleto: string
  deleting: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => { if (!deleting) onClose() }}>
      <div className="card w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Eliminar a {nombreCompleto}?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Se eliminará su cuenta de acceso y su perfil de forma permanente. No podrá volver a iniciar sesión. Esta acción no se puede deshacer.
          </p>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={deleting} className="btn-secondary flex-1 justify-center disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={deleting}
              className="flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
              {deleting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Eliminando...</>
                : <>Sí, eliminar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ConfirmarRolModal({ rol, nombre, onClose, onConfirm }: {
  rol: Rol
  nombre: string
  onClose: () => void
  onConfirm: () => void
}) {
  const fondo = rol === 'admin' ? 'bg-amber-100 dark:bg-amber-900/30'
    : rol === 'comunicaciones' ? 'bg-blue-100 dark:bg-blue-900/30'
    : rol === 'rrhh' ? 'bg-emerald-100 dark:bg-emerald-900/30'
    : 'bg-slate-100 dark:bg-slate-800'

  const iconoColor = rol === 'admin' ? 'text-amber-500'
    : rol === 'comunicaciones' ? 'text-blue-500'
    : rol === 'rrhh' ? 'text-emerald-500'
    : 'text-slate-400'

  const titulo = rol === 'admin' ? '¿Hacer administrador?'
    : rol === 'comunicaciones' ? '¿Asignar rol Comunicaciones?'
    : rol === 'rrhh' ? '¿Asignar rol Gestión de Personal?'
    : '¿Volver a empleado?'

  const detalle = rol === 'admin'
    ? `${nombre} tendrá acceso completo al portal: empleados, recibos, estadísticas y configuración.`
    : rol === 'comunicaciones'
    ? `${nombre} podrá crear y editar comunicados y eventos, pero no verá empleados, recibos ni datos administrativos.`
    : rol === 'rrhh'
    ? `${nombre} tendrá acceso a empleados, solicitudes, novedades internas y estadísticas, pero no a recibos de sueldo.`
    : `${nombre} pasará a ser empleado regular y solo verá sus propios datos.`

  const boton = rol === 'admin' ? 'bg-amber-500 hover:bg-amber-600'
    : rol === 'comunicaciones' ? 'bg-blue-600 hover:bg-blue-700'
    : rol === 'rrhh' ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-slate-500 hover:bg-slate-600'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${fondo}`}>
            <Shield className={`w-7 h-7 ${iconoColor}`} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{titulo}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{detalle}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${boton}`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
