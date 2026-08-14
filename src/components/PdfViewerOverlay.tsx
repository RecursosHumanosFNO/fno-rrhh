import { FileText, Download, X } from 'lucide-react'

// Visor de PDF a pantalla completa (recibos y documentos del empleado).
export function PdfViewerOverlay({ viewer, onClose }: {
  viewer: { url: string; label: string }
  onClose: () => void
}) {
  // El visor nativo que Chrome/Safari embeben dentro del <iframe> abre el PDF
  // con un zoom propio en mobile —no es el 100% de "ajustar a pantalla" que
  // tienen al abrir un PDF suelto— y desde ahí no se puede bajar. #view=FitH
  // es un parámetro estándar de PDF (lo entienden PDFium y el visor de Safari)
  // que pide "ajustar al ancho" como estado inicial; el pellizco para hacer
  // zoom sigue funcionando igual después. Va en el fragment (#) y no en la
  // query: no viaja al servidor, así que no rompe la firma de la URL.
  const src = `${viewer.url}#view=FitH`

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <p className="text-sm font-medium text-white truncate">{viewer.label}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <a href={viewer.url} download className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors" onClick={e => e.stopPropagation()}>
            <Download className="w-3.5 h-3.5" /> Descargar
          </a>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
        <iframe src={src} className="w-full h-full border-0" title="Visor de recibo" />
      </div>
    </div>
  )
}
