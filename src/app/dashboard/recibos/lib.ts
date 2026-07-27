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
  // Busca una secuencia de 7 u 8 dígitos (DNI argentino) separada del resto.
  //
  // Se parte por no-dígitos en vez de usar \b: el guión bajo cuenta como
  // carácter de palabra, así que "recibo_30123456_julio" no tenía límite de
  // palabra alrededor del número y quedaba sin detectar.
  const grupos = base.split(/\D+/).filter(Boolean)
  return grupos.find(g => g.length === 7 || g.length === 8) ?? ''
}
