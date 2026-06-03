'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import type { PendingRegistration } from '@/types'
import {
  UserCheck, UserX, Clock, Mail, Phone,
  Building2, Briefcase, CreditCard, CheckCircle, XCircle, Users, RefreshCw,
} from 'lucide-react'

export default function RegistrosPendientesPage() {
  const { user } = useAuth()
  const { pendingRegistrations, approvePendingRegistration, rejectPendingRegistration, refreshPending } = useData()
  const router = useRouter()

  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; reg: PendingRegistration } | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'approve' | 'reject'; nombre: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await refreshPending()
    setRefreshing(false)
  }

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  if (user?.role !== 'admin') return null

  const handleConfirm = () => {
    if (!confirmAction) return
    const { type, reg } = confirmAction
    setProcessing(reg.id)
    setConfirmAction(null)

    if (type === 'approve') {
      approvePendingRegistration(reg.id)
      setToast({ type: 'approve', nombre: `${reg.nombre} ${reg.apellido}` })
    } else {
      rejectPendingRegistration(reg.id)
      setToast({ type: 'reject', nombre: `${reg.nombre} ${reg.apellido}` })
    }

    setProcessing(null)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            Solicitudes de Acceso
            {pendingRegistrations.length > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
                {pendingRegistrations.length}
              </span>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Empleados que solicitaron acceso al portal y están pendientes de aprobación
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary shrink-0"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-white text-sm font-medium animate-fade-in',
          toast.type === 'approve' ? 'bg-emerald-600' : 'bg-slate-700',
        )}>
          {toast.type === 'approve'
            ? <><CheckCircle className="w-5 h-5 shrink-0" /> {toast.nombre} fue aprobado/a. Se envió un email de confirmación.</>
            : <><XCircle className="w-5 h-5 shrink-0" /> Solicitud de {toast.nombre} rechazada. Se notificó por email.</>}
        </div>
      )}

      {/* Empty state */}
      {pendingRegistrations.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Sin solicitudes pendientes
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No hay empleados esperando aprobación de acceso al portal.
          </p>
        </div>
      )}

      {/* Lista */}
      {pendingRegistrations.length > 0 && (
        <div className="space-y-3">
          {pendingRegistrations.map((reg) => (
            <div key={reg.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Avatar + datos */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-lg shrink-0">
                    {reg.nombre.charAt(0)}{reg.apellido.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-base">
                      {reg.nombre} {reg.apellido}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                      <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5" /> {reg.email}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <CreditCard className="w-3.5 h-3.5" /> DNI {reg.dni}
                      </span>
                      {reg.telefono && (
                        <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                          <Phone className="w-3.5 h-3.5" /> {reg.telefono}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <Building2 className="w-3.5 h-3.5" /> {reg.sector}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <Briefcase className="w-3.5 h-3.5" /> {reg.cargo}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> Solicitado el {reg.fechaSolicitud}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmAction({ type: 'approve', reg })}
                    disabled={processing === reg.id}
                    className="btn-success"
                  >
                    <UserCheck className="w-4 h-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'reject', reg })}
                    disabled={processing === reg.id}
                    className="btn-danger"
                  >
                    <UserX className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4',
              confirmAction.type === 'approve'
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-red-100 dark:bg-red-900/30',
            )}>
              {confirmAction.type === 'approve'
                ? <UserCheck className="w-6 h-6 text-emerald-600" />
                : <UserX className="w-6 h-6 text-red-500" />}
            </div>
            <h3 className="text-center font-semibold text-slate-800 dark:text-white text-lg mb-2">
              {confirmAction.type === 'approve' ? '¿Aprobar acceso?' : '¿Rechazar solicitud?'}
            </h3>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
              {confirmAction.type === 'approve' ? (
                <>Se creará el acceso para{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {confirmAction.reg.nombre} {confirmAction.reg.apellido}
                  </strong>{' '}
                  y se le enviará un email avisándole que ya puede ingresar al portal.</>
              ) : (
                <>Se eliminará la solicitud de{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {confirmAction.reg.nombre} {confirmAction.reg.apellido}
                  </strong>{' '}
                  y se le notificará por email.</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className={cn(
                  'flex-1 justify-center',
                  confirmAction.type === 'approve' ? 'btn-success' : 'btn-danger',
                )}
              >
                {confirmAction.type === 'approve' ? 'Sí, aprobar' : 'Sí, rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
