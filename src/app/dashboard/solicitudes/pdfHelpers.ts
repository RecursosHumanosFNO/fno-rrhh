import type { Empleado } from '@/types'

// ── PDF helpers ───────────────────────────────────────────────────────────────
export const BRAND_C: [number, number, number] = [10, 110, 130]
export const DARK_C:  [number, number, number] = [30, 41, 59]
export const GRAY_C:  [number, number, number] = [100, 116, 139]
export const LIGHT_C: [number, number, number] = [241, 245, 249]

export type JsPDFDoc = import('jspdf').jsPDF

export function _pdfHeader(doc: JsPDFDoc, subtitle: string) {
  doc.setFillColor(...BRAND_C); doc.rect(0, 0, 210, 36, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('Fundación Neuquén Oeste', 14, 16)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`Portal de Recursos Humanos · ${subtitle}`, 14, 26)
}

export function _pdfFooter(doc: JsPDFDoc) {
  doc.setFillColor(...LIGHT_C); doc.rect(0, 282, 210, 15, 'F')
  const now = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  doc.setTextColor(...GRAY_C); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
  doc.text(`Generado el ${now} · Portal RRHH · Fundación Neuquén Oeste · portalfno.com`, 14, 291)
}

export function _pdfField(doc: JsPDFDoc, label: string, value: string, y: number, maxW = 182): number {
  doc.setTextColor(...GRAY_C); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
  doc.text(label, 14, y); y += 4.5
  doc.setTextColor(...DARK_C); doc.setFontSize(10.5); doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(value, maxW)
  doc.text(lines, 14, y)
  return y + lines.length * 5 + 5
}

export function _pdfDivider(doc: JsPDFDoc, y: number): number {
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.25)
  doc.line(14, y, 196, y); return y + 8
}

export function _pdfEmpCard(doc: JsPDFDoc, emp: Empleado, label: string, y: number): number {
  doc.setFillColor(...LIGHT_C); doc.roundedRect(14, y, 182, 21, 2.5, 2.5, 'F')
  doc.setTextColor(...GRAY_C); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
  doc.text(label, 20, y + 7)
  doc.setTextColor(...DARK_C); doc.setFontSize(11.5); doc.setFont('helvetica', 'bold')
  doc.text(`${emp.apellido}, ${emp.nombre}`, 20, y + 13)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_C)
  doc.text(`${emp.cargo} · ${emp.sector}`, 20, y + 18.5)
  return y + 27
}

export function _pdfBadge(doc: JsPDFDoc, text: string, color: [number,number,number], y: number): number {
  doc.setFillColor(...color); doc.roundedRect(14, y, 36, 6.5, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  doc.text(text.toUpperCase(), 16, y + 4.5); return y + 12
}

export function _pdfRespuesta(doc: JsPDFDoc, texto: string, y: number): number {
  const lines = doc.splitTextToSize(texto, 168)
  const boxH = lines.length * 5 + 14
  doc.setFillColor(239, 246, 255); doc.roundedRect(14, y, 182, boxH, 2.5, 2.5, 'F')
  doc.setTextColor(...BRAND_C); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
  doc.text('RESPUESTA DE RRHH', 20, y + 7)
  doc.setTextColor(...DARK_C); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(lines, 20, y + 13)
  return y + boxH + 6
}
