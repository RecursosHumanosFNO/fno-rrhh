'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X, FileText, ClipboardList, Bell, HeadphonesIcon } from 'lucide-react'

interface Props {
  nombre: string
  empleadoId: string
}

export function WelcomeModal({ nombre, empleadoId }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const key = `fno_bienvenida_${empleadoId}`
    if (!localStorage.getItem(key)) {
      setOpen(true)
    }
  }, [empleadoId])

  function cerrar() {
    const key = `fno_bienvenida_${empleadoId}`
    localStorage.setItem(key, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white relative">
          <button
            onClick={cerrar}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">¡Bienvenido/a, {nombre}!</h2>
          <p className="text-blue-100 text-sm mt-1">Ya sos parte del Portal RRHH de la Fundación Neuquén Oeste</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-5">
            Desde acá podés gestionar todo lo relacionado a tu trabajo. Estas son las secciones principales:
          </p>
          <div className="space-y-3">
            <Feature icon={FileText} title="Recibos de sueldo" desc="Descargá y firmá tus recibos desde la sección Recibos." />
            <Feature icon={ClipboardList} title="Solicitudes" desc="Pedí vacaciones, licencias y permisos de forma digital." />
            <Feature icon={Bell} title="Novedades" desc="Mantente informado con comunicados institucionales." />
            <Feature icon={HeadphonesIcon} title="Tickets RRHH" desc="Consultá o realizá trámites administrativos online." />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button onClick={cerrar} className="btn-primary w-full justify-center">
            ¡Empezar! →
          </button>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-brand-50 dark:bg-brand-900/30 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  )
}
