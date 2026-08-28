'use client'

import { useRef, useState } from 'react'
import { ShieldAlert, Eye, Download, Upload, Trash2, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/authFetch'
import { formatFecha } from '@/lib/utils'
import { PdfViewerOverlay } from './PdfViewerOverlay'
import type { Empleado } from '@/types'

type Credencial = Pick<Empleado, 'credencialArt' | 'credencialArtNombre' | 'credencialArtSubidaEn'>

// Tarjeta de la credencial digital de la ART. La usan el perfil propio (sólo
// ver/descargar) y la ficha del empleado (Gestión de Personal puede cargarla y
// sacarla). El PDF vive en un bucket privado: acá nunca hay una URL fija, se
// pide una firmada por diez minutos justo antes de abrirlo.
export function CredencialArt({ empleadoId, credencial, puedeEditar, onCambio }: {
  empleadoId: string
  credencial: Credencial
  puedeEditar: boolean
  onCambio?: (c: Credencial) => void
}) {
  const [cargando, setCargando] = useState<'ver' | 'descargar' | 'subir' | 'borrar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visor, setVisor] = useState<{ url: string; label: string } | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const tiene = !!credencial.credencialArt
  const nombre = credencial.credencialArtNombre || 'Credencial de ART'

  async function urlFirmada(descargar: boolean) {
    const res = await authFetch(
      `/api/credencial-art?empleadoId=${encodeURIComponent(empleadoId)}${descargar ? '&descargar=1' : ''}`,
    )
    const data = await res.json()
    if (!res.ok || !data.url) throw new Error(data.error ?? 'No se pudo abrir la credencial')
    return data.url as string
  }

  async function handleVer() {
    setCargando('ver'); setError(null)
    try { setVisor({ url: await urlFirmada(false), label: nombre }) }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir') }
    finally { setCargando(null) }
  }

  async function handleDescargar() {
    setCargando('descargar'); setError(null)
    try {
      // La URL ya viene con Content-Disposition: attachment, así que alcanza con
      // navegar a ella — y funciona en iPhone, donde el atributo download no
      // sirve porque el archivo es de otro dominio.
      window.location.href = await urlFirmada(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar')
    } finally { setCargando(null) }
  }

  async function handleSubir(file: File) {
    setCargando('subir'); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('empleadoId', empleadoId)
      const res = await authFetch('/api/credencial-art', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo subir')
      onCambio?.({
        credencialArt: data.path,
        credencialArtNombre: data.nombre,
        credencialArtSubidaEn: data.subidaEn,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir')
    } finally {
      setCargando(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleBorrar() {
    setCargando('borrar'); setError(null)
    try {
      const res = await authFetch(`/api/credencial-art?empleadoId=${encodeURIComponent(empleadoId)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo borrar')
      onCambio?.({ credencialArt: '', credencialArtNombre: '', credencialArtSubidaEn: '' })
      setConfirmar(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar')
    } finally { setCargando(null) }
  }

  return (
    <div className="card p-5">
      <p className="section-title mb-4 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" /> Credencial de ART
      </p>

      {tiene ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{nombre}</p>
            {credencial.credencialArtSubidaEn && (
              <p className="text-xs text-slate-400 mt-0.5">
                Cargada el {formatFecha(credencial.credencialArtSubidaEn.slice(0, 10))}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleVer} disabled={cargando === 'ver'} className="btn-secondary text-sm py-1.5 disabled:opacity-60">
              {cargando === 'ver' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Ver
            </button>
            <button onClick={handleDescargar} disabled={cargando === 'descargar'} className="btn-secondary text-sm py-1.5 disabled:opacity-60">
              {cargando === 'descargar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Descargar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todavía no hay una credencial cargada.
          {!puedeEditar && ' Cuando RRHH la suba, vas a poder verla y descargarla desde acá.'}
        </p>
      )}

      {puedeEditar && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleSubir(f) }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={cargando === 'subir'}
            className="btn-primary text-sm py-1.5 disabled:opacity-60"
          >
            {cargando === 'subir' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {tiene ? 'Reemplazar credencial' : 'Subir credencial (PDF)'}
          </button>
          {tiene && (confirmar ? (
            <>
              <button onClick={handleBorrar} disabled={cargando === 'borrar'} className="btn-danger text-sm py-1.5 disabled:opacity-60">
                {cargando === 'borrar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirmar
              </button>
              <button onClick={() => setConfirmar(false)} className="btn-secondary text-sm py-1.5">Cancelar</button>
            </>
          ) : (
            <button onClick={() => setConfirmar(true)} className="btn-secondary text-sm py-1.5 text-red-600 dark:text-red-400">
              <Trash2 className="w-4 h-4" /> Sacar credencial
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {visor && <PdfViewerOverlay viewer={visor} onClose={() => setVisor(null)} />}
    </div>
  )
}
