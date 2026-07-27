export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ── Tipos para carga masiva ────────────────────────────────────────────────
export type BulkRow = {
  file: File
  detectedDni: string
  empleadoId: string      // '' = sin asignar
  status: 'matched' | 'unmatched' | 'manual'
  selected: boolean       // si se incluye en el envío
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error'
  errorMsg?: string
}
export type BulkStep = 'select' | 'preview' | 'uploading' | 'done'

// ── Helpers de matching ────────────────────────────────────────────────────
export function normDni(d: string) { return d.replace(/\D/g, '') }

export function extractDniFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  // Busca secuencia de 7 u 8 dígitos en el nombre (DNI argentino)
  const m = base.match(/\b(\d{7,8})\b/)
  return m ? m[1] : ''
}
