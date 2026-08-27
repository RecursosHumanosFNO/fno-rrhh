'use client'

import { useState } from 'react'
import { Phone, Clock, ShieldAlert, FileWarning, Info } from 'lucide-react'

// Datos de la credencial digital de Provincia ART.
const EMERGENCIAS = '0800-333-1333'
const ATENCION = '0800-333-1278'

// El número marcable no lleva guiones (algunos teléfonos no los limpian solos).
const soloDigitos = (n: string) => n.replace(/\D/g, '')

export default function ArtPage() {
  // El logo oficial se sirve desde /provincia-art.png. Si el archivo todavía no
  // está subido, en vez de mostrar una imagen rota se cae al nombre en texto.
  const [sinLogo, setSinLogo] = useState(false)

  return (
    <div className="page-container">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        {!sinLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/provincia-art.png"
            alt="Provincia ART"
            className="h-12 w-auto object-contain"
            onError={() => setSinLogo(true)}
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {sinLogo ? 'Provincia ART' : 'ART'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Aseguradora de Riesgos del Trabajo · Fundación Cristiana Neuquén Oeste
          </p>
        </div>
      </div>

      {/* Emergencias médicas — lo primero y lo más grande: es el número que hay
          que encontrar sin pensar cuando pasó un accidente. */}
      <a
        href={`tel:${soloDigitos(EMERGENCIAS)}`}
        className="block rounded-2xl p-6 sm:p-8 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-lg shadow-emerald-600/20 text-white"
      >
        <div className="flex items-center gap-2 text-emerald-50">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Coordinación de Emergencias Médicas
          </span>
        </div>
        <p className="mt-3 font-black tracking-tight text-4xl sm:text-6xl tabular-nums">
          {EMERGENCIAS}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-emerald-50 text-sm">
          <Clock className="w-4 h-4" />
          Las 24 horas, los 365 días del año · Llamada gratuita
        </p>
      </a>

      {/* Atención al cliente */}
      <a
        href={`tel:${soloDigitos(ATENCION)}`}
        className="block rounded-2xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Phone className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Centro de Atención al Cliente
          </span>
        </div>
        <p className="mt-2 font-bold text-2xl sm:text-3xl text-slate-800 dark:text-slate-100 tabular-nums">
          {ATENCION}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm">
          <Clock className="w-4 h-4" />
          Lunes a viernes de 8 a 20
        </p>
      </a>

      {/* Qué hacer ante un accidente */}
      <div className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
          <FileWarning className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Si tenés un accidente de trabajo
        </h2>
        <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>
            Avisá <strong>inmediatamente</strong> a la Fundación. La Fundación se comunica
            al {EMERGENCIAS} detallando dónde y cómo sucedió, y qué tipo de lesión hubo,
            y completa el formulario de denuncia.
          </li>
          <li>
            Si el accidente fue <strong>in itinere</strong> (en el trayecto entre el
            trabajo y tu casa, o a la inversa), hay que informar igual dónde y cómo pasó.
          </li>
          <li>
            El centro de atención al que te manden <strong>no puede cobrarte</strong> ni la
            atención ni los medicamentos.
          </li>
        </ol>
      </div>

      {/* Para qué sirve la credencial */}
      <div className="rounded-2xl p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
          <Info className="w-5 h-5 text-slate-400" />
          Sobre la credencial digital
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Tu credencial de Provincia ART tiene tus datos personales: en caso de accidente,
          el prestador médico que te atienda puede identificarte y contactarse con la ART y
          con la Fundación. Si no la tenés a mano, alcanza con llamar al {EMERGENCIAS}: la
          cobertura no depende de mostrar la credencial.
        </p>
      </div>
    </div>
  )
}
