'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import {
  SOLICITUD_TIPO_LABEL, SOLICITUD_ESTADO_COLOR, SOLICITUD_ESTADO_LABEL,
  TICKET_ESTADO_LABEL, TICKET_ESTADO_COLOR, TICKET_TIPO_LABEL, formatFecha,
} from '@/lib/utils'
import type { SolicitudTipo, TicketTipo, TicketEstado, Solicitud, Empleado } from '@/types'
import {
  ClipboardList, Plus, Search, X, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Send, Hourglass, Save, Edit2, Loader2,
  HeadphonesIcon, MessageSquare, Circle, FileCheck, HelpCircle,
  RefreshCw, AlertCircle, MoreHorizontal, Bell, Download, FileText,
} from 'lucide-react'

const TICKET_TIPOS: TicketTipo[] = ['certificado_laboral', 'consulta', 'actualizacion_datos', 'reclamo', 'otro']
const TICKET_TIPO_ICONS: Record<TicketTipo, React.ElementType> = {
  certificado_laboral: FileCheck, consulta: HelpCircle,
  actualizacion_datos: RefreshCw, reclamo: AlertCircle, otro: MoreHorizontal,
}

const TIPOS: SolicitudTipo[] = [
  'ausencia', 'llegada_tarde', 'salida_anticipada',
  'licencia_medica', 'licencia_estudio', 'licencia_maternidad_paternidad', 'licencia_duelo',
  'permiso_personal',
  'horas_extra', 'cambio_turno', 'guardia_turno_especial', 'tarea_fuera_area',
  'capacitacion',
  'accidente_laboral', 'suspension', 'observacion_comportamiento', 'conflicto_interpersonal',
  'entrega_documentacion', 'reconocimiento', 'pedido_administrativo', 'otro',
]

// Agrupados para el select del modal (más fácil de leer)
const TIPO_GRUPOS = [
  { label: 'Asistencia', tipos: ['ausencia', 'llegada_tarde', 'salida_anticipada'] },
  { label: 'Licencias y Permisos', tipos: ['licencia_medica', 'licencia_estudio', 'licencia_maternidad_paternidad', 'licencia_duelo', 'permiso_personal'] },
  { label: 'Jornada Laboral', tipos: ['horas_extra', 'cambio_turno', 'guardia_turno_especial', 'tarea_fuera_area'] },
  { label: 'Formación', tipos: ['capacitacion'] },
  { label: 'Incidentes / RRHH', tipos: ['accidente_laboral', 'suspension', 'observacion_comportamiento', 'conflicto_interpersonal'] },
  { label: 'Administrativo', tipos: ['entrega_documentacion', 'reconocimiento', 'pedido_administrativo', 'otro'] },
] as const

// ── Excel export — solicitudes ────────────────────────────────────────────────
async function exportarSolicitudesExcel(solicitudes: Solicitud[], empleados: Empleado[]) {
  const { utils, writeFile } = await import('xlsx')

  const headers = [
    'Empleado', 'Sector', 'Tipo', 'Estado',
    'Fecha inicio', 'Fecha fin', 'Horario',
    'Descripción', 'Creada', 'Resuelta', 'Comentario RRHH',
  ]

  const rows = [...solicitudes]
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
    .map(s => {
      const emp = empleados.find(e => e.id === s.empleadoId)
      const horario = s.horarioDesde || s.horarioHasta
        ? `${s.horarioDesde ?? ''}${s.horarioHasta ? ` - ${s.horarioHasta}` : ''}`
        : ''
      return [
        emp ? `${emp.apellido}, ${emp.nombre}` : '—',
        emp?.sector ?? '',
        SOLICITUD_TIPO_LABEL[s.tipo] ?? s.tipo,
        SOLICITUD_ESTADO_LABEL[s.estado] ?? s.estado,
        s.fechaInicio ? formatFecha(s.fechaInicio) : '',
        s.fechaFin ? formatFecha(s.fechaFin) : '',
        horario,
        s.descripcion || '',
        s.fechaCreacion ? formatFecha(s.fechaCreacion) : '',
        s.fechaResolucion ? formatFecha(s.fechaResolucion) : '',
        s.comentarioAdmin || '',
      ]
    })

  const ws = utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [
    { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 13 },
    { wch: 13 }, { wch: 13 }, { wch: 16 },
    { wch: 40 }, { wch: 13 }, { wch: 13 }, { wch: 36 },
  ]
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Solicitudes')
  const hoy = new Date().toISOString().slice(0, 10)
  writeFile(wb, `solicitudes_fno_${hoy}.xlsx`)
}

// ── PDF helpers ───────────────────────────────────────────────────────────────
const BRAND_C: [number, number, number] = [10, 110, 130]
const DARK_C:  [number, number, number] = [30, 41, 59]
const GRAY_C:  [number, number, number] = [100, 116, 139]
const LIGHT_C: [number, number, number] = [241, 245, 249]

type JsPDFDoc = import('jspdf').jsPDF

function _pdfHeader(doc: JsPDFDoc, subtitle: string) {
  doc.setFillColor(...BRAND_C); doc.rect(0, 0, 210, 36, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('Fundación Neuquén Oeste', 14, 16)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`Portal de Recursos Humanos · ${subtitle}`, 14, 26)
}

function _pdfFooter(doc: JsPDFDoc) {
  doc.setFillColor(...LIGHT_C); doc.rect(0, 282, 210, 15, 'F')
  const now = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  doc.setTextColor(...GRAY_C); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
  doc.text(`Generado el ${now} · Portal RRHH · Fundación Neuquén Oeste · portalfno.com`, 14, 291)
}

function _pdfField(doc: JsPDFDoc, label: string, value: string, y: number, maxW = 182): number {
  doc.setTextColor(...GRAY_C); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
  doc.text(label, 14, y); y += 4.5
  doc.setTextColor(...DARK_C); doc.setFontSize(10.5); doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(value, maxW)
  doc.text(lines, 14, y)
  return y + lines.length * 5 + 5
}

function _pdfDivider(doc: JsPDFDoc, y: number): number {
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.25)
  doc.line(14, y, 196, y); return y + 8
}

function _pdfEmpCard(doc: JsPDFDoc, emp: Empleado, label: string, y: number): number {
  doc.setFillColor(...LIGHT_C); doc.roundedRect(14, y, 182, 21, 2.5, 2.5, 'F')
  doc.setTextColor(...GRAY_C); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
  doc.text(label, 20, y + 7)
  doc.setTextColor(...DARK_C); doc.setFontSize(11.5); doc.setFont('helvetica', 'bold')
  doc.text(`${emp.apellido}, ${emp.nombre}`, 20, y + 13)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_C)
  doc.text(`${emp.cargo} · ${emp.sector}`, 20, y + 18.5)
  return y + 27
}

function _pdfBadge(doc: JsPDFDoc, text: string, color: [number,number,number], y: number): number {
  doc.setFillColor(...color); doc.roundedRect(14, y, 36, 6.5, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  doc.text(text.toUpperCase(), 16, y + 4.5); return y + 12
}

function _pdfRespuesta(doc: JsPDFDoc, texto: string, y: number): number {
  const lines = doc.splitTextToSize(texto, 168)
  const boxH = lines.length * 5 + 14
  doc.setFillColor(239, 246, 255); doc.roundedRect(14, y, 182, boxH, 2.5, 2.5, 'F')
  doc.setTextColor(...BRAND_C); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
  doc.text('RESPUESTA DE RRHH', 20, y + 7)
  doc.setTextColor(...DARK_C); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(lines, 20, y + 13)
  return y + boxH + 6
}

async function descargarSolicitudPDF(sol: Solicitud, emp: Empleado | undefined) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  _pdfHeader(doc, 'Constancia de Solicitud')
  let y = 48
  doc.setTextColor(...DARK_C); doc.setFontSize(15); doc.setFont('helvetica', 'bold')
  doc.text('CONSTANCIA DE SOLICITUD', 14, y); y += 8
  const estadoBg: Record<string, [number,number,number]> = {
    aprobado: [16,185,129], rechazado: [239,68,68], pendiente: [245,158,11]
  }
  y = _pdfBadge(doc, SOLICITUD_ESTADO_LABEL[sol.estado] ?? sol.estado, estadoBg[sol.estado] ?? [100,116,139], y)
  if (emp) y = _pdfEmpCard(doc, emp, 'EMPLEADO', y)
  y = _pdfDivider(doc, y)
  y = _pdfField(doc, 'TIPO DE SOLICITUD', SOLICITUD_TIPO_LABEL[sol.tipo] ?? sol.tipo, y)
  y = _pdfField(doc, 'PERÍODO', sol.fechaFin ? `${formatFecha(sol.fechaInicio)} al ${formatFecha(sol.fechaFin)}` : formatFecha(sol.fechaInicio), y)
  if (sol.horarioDesde) y = _pdfField(doc, 'HORARIO', `${sol.horarioDesde}${sol.horarioHasta ? ` — ${sol.horarioHasta} hs` : ' hs'}`, y)
  y = _pdfField(doc, 'DESCRIPCIÓN / MOTIVO', sol.descripcion, y, 182)
  y = _pdfDivider(doc, y)
  y = _pdfField(doc, 'FECHA DE SOLICITUD', formatFecha(sol.fechaCreacion), y)
  if (sol.fechaResolucion) y = _pdfField(doc, 'FECHA DE RESOLUCIÓN', formatFecha(sol.fechaResolucion), y)
  if (sol.comentarioAdmin) y = _pdfRespuesta(doc, sol.comentarioAdmin, y)
  _pdfFooter(doc)
  doc.save(`solicitud_${emp?.apellido?.toLowerCase().replace(/\s/g,'_') ?? 'empleado'}_${sol.fechaInicio.replace(/-/g,'')}.pdf`)
}

async function descargarMensajePDF(emp: Empleado, asunto: string, mensaje: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  _pdfHeader(doc, 'Constancia de Comunicación Interna')
  let y = 48
  doc.setTextColor(...DARK_C); doc.setFontSize(15); doc.setFont('helvetica', 'bold')
  doc.text('CONSTANCIA DE MENSAJE RRHH', 14, y); y += 12
  y = _pdfEmpCard(doc, emp, 'DESTINATARIO', y)
  y = _pdfDivider(doc, y)
  y = _pdfField(doc, 'ASUNTO', asunto, y)
  y = _pdfField(doc, 'MENSAJE', mensaje, y, 182)
  y = _pdfDivider(doc, y)
  const ahora = new Date().toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  y = _pdfField(doc, 'FECHA Y HORA DE ENVÍO', `${ahora} · Enviado por RRHH`, y)
  _pdfFooter(doc)
  doc.save(`mensaje_rrhh_${emp.apellido.toLowerCase().replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`)
}

async function descargarTicketPDF(ticket: import('@/types').Ticket, emp: Empleado | undefined) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  _pdfHeader(doc, 'Constancia de Pedido a RRHH')
  let y = 48
  doc.setTextColor(...DARK_C); doc.setFontSize(15); doc.setFont('helvetica', 'bold')
  doc.text('CONSTANCIA DE PEDIDO A RRHH', 14, y); y += 8
  const ticketBg: Record<string, [number,number,number]> = {
    abierto: [245,158,11], en_proceso: [59,130,246], resuelto: [16,185,129], cerrado: [100,116,139]
  }
  y = _pdfBadge(doc, TICKET_ESTADO_LABEL[ticket.estado] ?? ticket.estado, ticketBg[ticket.estado] ?? [100,116,139], y)
  if (emp) y = _pdfEmpCard(doc, emp, 'EMPLEADO', y)
  y = _pdfDivider(doc, y)
  y = _pdfField(doc, 'TIPO DE PEDIDO', TICKET_TIPO_LABEL[ticket.tipo] ?? ticket.tipo, y)
  y = _pdfField(doc, 'ASUNTO', ticket.asunto, y)
  y = _pdfField(doc, 'DESCRIPCIÓN', ticket.descripcion, y, 182)
  y = _pdfDivider(doc, y)
  y = _pdfField(doc, 'FECHA DE PEDIDO', formatFecha(ticket.fechaCreacion), y)
  if (ticket.fechaActualizacion !== ticket.fechaCreacion)
    y = _pdfField(doc, 'ÚLTIMA ACTUALIZACIÓN', formatFecha(ticket.fechaActualizacion), y)
  if (ticket.respuesta) y = _pdfRespuesta(doc, ticket.respuesta, y)
  _pdfFooter(doc)
  doc.save(`pedido_rrhh_${emp?.apellido?.toLowerCase().replace(/\s/g,'_') ?? 'empleado'}_${ticket.fechaCreacion.slice(0,10).replace(/-/g,'')}.pdf`)
}

async function generarCertificadoLaboralPDF(ticket: import('@/types').Ticket, emp: Empleado) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  _pdfHeader(doc, 'Certificado Laboral')
  let y = 48

  // Título formal
  doc.setTextColor(...DARK_C); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('CERTIFICADO DE TRABAJO', 105, y, { align: 'center' }); y += 14

  // Cuerpo del certificado
  doc.setFontSize(11); doc.setFont('helvetica', 'normal')
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const antiguedadTexto = (() => {
    const [anio, mes, dia] = emp.fechaIngreso.split('-').map(Number)
    const ingreso = new Date(anio, mes - 1, dia)
    const ahora = new Date()
    const anios = ahora.getFullYear() - ingreso.getFullYear() - (ahora < new Date(ahora.getFullYear(), mes - 1, dia) ? 1 : 0)
    if (anios === 0) return 'menos de un año'
    return `${anios} año${anios !== 1 ? 's' : ''}`
  })()

  const parrafo1 = `La Fundación Neuquén Oeste, con domicilio en la ciudad de Neuquén, certifica por medio del presente documento que ${emp.nombre} ${emp.apellido}, con DNI N.° ${emp.dni}${emp.cuil ? ` y CUIL N.° ${emp.cuil}` : ''}, se desempeña en relación de dependencia con esta institución.`
  const lines1 = doc.splitTextToSize(parrafo1, 182)
  doc.text(lines1, 14, y); y += lines1.length * 5.5 + 6

  const parrafo2 = `El/La mencionado/a reviste el cargo de ${emp.cargo} en el sector ${emp.sector}, bajo la modalidad de contratación ${emp.tipoContrato} y jornada ${emp.jornada}, con fecha de ingreso el ${new Date(emp.fechaIngreso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}, acumulando una antigüedad de ${antiguedadTexto}.`
  const lines2 = doc.splitTextToSize(parrafo2, 182)
  doc.text(lines2, 14, y); y += lines2.length * 5.5 + 6

  const parrafo3 = `El presente certificado se emite a solicitud del/la interesado/a para ser presentado ante quien corresponda, en ${hoy}.`
  const lines3 = doc.splitTextToSize(parrafo3, 182)
  doc.text(lines3, 14, y); y += lines3.length * 5.5 + 16

  // Firma
  doc.setDrawColor(...BRAND_C); doc.setLineWidth(0.5)
  doc.line(105, y, 196, y); y += 5
  doc.setTextColor(...GRAY_C); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  doc.text('Recursos Humanos', 150, y, { align: 'center' }); y += 4.5
  doc.setFont('helvetica', 'normal')
  doc.text('Fundación Neuquén Oeste', 150, y, { align: 'center' })

  // Referencia al ticket
  y += 16
  doc.setFillColor(...LIGHT_C); doc.roundedRect(14, y, 182, 12, 2, 2, 'F')
  doc.setTextColor(...GRAY_C); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.text(`Emitido en respuesta al ticket #${ticket.id.slice(0,8).toUpperCase()} · ${ticket.asunto}`, 105, y + 7.5, { align: 'center' })

  _pdfFooter(doc)
  doc.save(`certificado_laboral_${emp.apellido.toLowerCase().replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`)
}

export default function SolicitudesPage() {
  const { user } = useAuth()
  const { empleados, solicitudes, addSolicitud, approveSolicitud, rejectSolicitud, editSolicitud, cancelSolicitud, tickets, addTicket, respondTicket, addNotification, addRegistroNovedad } = useData()
  const isAdmin = user?.role === 'admin' || user?.role === 'rrhh'
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'pedidos'>('solicitudes')

  const [estadoFilter, setEstadoFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [query, setQuery] = useState('')
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('')
  const [fechaHastaFilter, setFechaHastaFilter] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editEstado, setEditEstado] = useState<'aprobado' | 'rechazado'>('aprobado')
  const [showMensaje, setShowMensaje] = useState(false)
  const [mensajeForm, setMensajeForm] = useState({ empleadoId: '', asunto: '', mensaje: '' })
  const [enviandoMensaje, setEnviandoMensaje] = useState(false)
  const [mensajeOk, setMensajeOk] = useState(false)
  const [lastMensajeSnap, setLastMensajeSnap] = useState<{ emp: Empleado; asunto: string; mensaje: string } | null>(null)

  // Estado para pedidos a RRHH (tickets)
  const [showNuevoTicket, setShowNuevoTicket] = useState(false)
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const [ticketEstadoFilter, setTicketEstadoFilter] = useState('')
  const [respuesta, setRespuesta] = useState<Record<string, string>>({})
  const [estadoResp, setEstadoResp] = useState<Record<string, TicketEstado>>({})
  const [ticketForm, setTicketForm] = useState({ tipo: 'consulta' as TicketTipo, asunto: '', descripcion: '' })
  const [ticketError, setTicketError] = useState('')

  const baseTickets = isAdmin ? tickets : tickets.filter(t => t.empleadoId === user?.empleadoId)
  const filteredTickets = baseTickets
    .filter(t => !ticketEstadoFilter || t.estado === ticketEstadoFilter)
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
  const ticketsActivos = baseTickets.filter(t => t.estado === 'abierto' || t.estado === 'en_proceso').length

  function handleNuevoTicket() {
    setTicketError('')
    if (!ticketForm.asunto.trim()) { setTicketError('Completá el asunto.'); return }
    if (!ticketForm.descripcion.trim()) { setTicketError('Completá la descripción.'); return }
    if (!user?.empleadoId) return
    addTicket({ empleadoId: user.empleadoId, tipo: ticketForm.tipo, asunto: ticketForm.asunto, descripcion: ticketForm.descripcion })
    setShowNuevoTicket(false)
    setTicketForm({ tipo: 'consulta', asunto: '', descripcion: '' })
  }

  function handleResponderTicket(ticketId: string) {
    respondTicket(ticketId, respuesta[ticketId] ?? '', estadoResp[ticketId] ?? 'en_proceso')
    setRespuesta(prev => { const n = { ...prev }; delete n[ticketId]; return n })
    setExpandedTicketId(null)
  }

  // New solicitud form state
  const [newForm, setNewForm] = useState({
    tipo: 'permiso_personal' as SolicitudTipo,
    fechaInicio: '', fechaFin: '',
    horarioDesde: '', horarioHasta: '',
    descripcion: '',
  })
  const [newError, setNewError] = useState('')
  const [submitToast, setSubmitToast] = useState(false)

  // Autocomplete combobox state for mensajeForm employee
  const [mensajeQuery, setMensajeQuery] = useState('')
  const [mensajeDropOpen, setMensajeDropOpen] = useState(false)

  const base = isAdmin
    ? solicitudes
    : solicitudes.filter(s => s.empleadoId === user?.empleadoId)

  const filtered = base.filter(s => {
    const emp = empleados.find(e => e.id === s.empleadoId)
    const matchQuery = !query || (emp ? `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(query.toLowerCase()) : false)
    const matchEstado = !estadoFilter || s.estado === estadoFilter
    const matchTipo = !tipoFilter || s.tipo === tipoFilter
    const matchDesde = !fechaDesdeFilter || s.fechaInicio >= fechaDesdeFilter
    const matchHasta = !fechaHastaFilter || s.fechaInicio <= fechaHastaFilter
    return matchQuery && matchEstado && matchTipo && matchDesde && matchHasta
  }).sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))

  const pendientes = base.filter(s => s.estado === 'pendiente').length

  const AUSENCIA_TIPOS: SolicitudTipo[] = [
    'ausencia', 'llegada_tarde', 'salida_anticipada',
    'licencia_medica', 'licencia_estudio', 'licencia_maternidad_paternidad', 'licencia_duelo',
    'permiso_personal',
  ]
  const SOLICITUD_TO_REGISTRO: Partial<Record<SolicitudTipo, import('@/types').RegistroNovedadCategoria>> = {
    ausencia: 'ausencia', llegada_tarde: 'llegada_tarde', salida_anticipada: 'salida_anticipada',
    licencia_medica: 'licencia_medica', licencia_estudio: 'licencia_estudio',
    licencia_maternidad_paternidad: 'licencia_maternidad_paternidad', licencia_duelo: 'licencia_duelo',
    permiso_personal: 'permiso_sin_goce',
    horas_extra: 'horas_extra', cambio_turno: 'cambio_turno',
    guardia_turno_especial: 'guardia_turno_especial', tarea_fuera_area: 'tarea_fuera_area',
    capacitacion: 'capacitacion', accidente_laboral: 'accidente_laboral',
    suspension: 'suspension', observacion_comportamiento: 'observacion_comportamiento',
    conflicto_interpersonal: 'conflicto_interpersonal', entrega_documentacion: 'entrega_documentacion',
    reconocimiento: 'reconocimiento',
  }

  function handleApprove(id: string) {
    const sol = solicitudes.find(s => s.id === id)
    const emp = sol ? empleados.find(e => e.id === sol.empleadoId) : undefined
    if (emp?.estado === 'inactivo') {
      alert('No se puede aprobar: el empleado está dado de baja.')
      return
    }
    approveSolicitud(id, comments[id] ?? '')
    setComments(prev => { const n = { ...prev }; delete n[id]; return n })
    setExpandedId(null)
    // Auto-crear registro de novedad para ausencias y licencias
    if (sol && emp && AUSENCIA_TIPOS.includes(sol.tipo)) {
      const cat = SOLICITUD_TO_REGISTRO[sol.tipo] ?? 'otro'
      addRegistroNovedad({
        empleadoId: emp.id,
        empleadoNombre: `${emp.nombre} ${emp.apellido}`,
        sector: emp.sector,
        cargo: emp.cargo,
        fecha: sol.fechaInicio,
        horaTipo: sol.horarioDesde ? 'exacta' : 'sin_hora',
        hora: sol.horarioDesde || undefined,
        descripcion: `${SOLICITUD_TIPO_LABEL[sol.tipo]}${sol.descripcion ? ` — ${sol.descripcion}` : ''}`,
        categoria: cat,
      })
    }
  }

  function handleReject(id: string) {
    rejectSolicitud(id, comments[id] ?? '')
    setComments(prev => { const n = { ...prev }; delete n[id]; return n })
    setExpandedId(null)
  }

  function handleEdit(id: string) {
    editSolicitud(id, editEstado, editComment)
    setEditingId(null)
    setEditComment('')
  }

  async function handleEnviarMensaje() {
    if (!mensajeForm.empleadoId || !mensajeForm.asunto.trim() || !mensajeForm.mensaje.trim()) return
    setEnviandoMensaje(true)
    const emp = empleados.find(e => e.id === mensajeForm.empleadoId)
    // Notificación en la app
    addNotification({ texto: `📋 RRHH: ${mensajeForm.asunto}`, tipo: 'sistema', empleadoId: mensajeForm.empleadoId })
    // Email al empleado
    if (emp?.email) {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mensaje_rrhh', data: { email: emp.email, nombre: emp.nombre, asunto: mensajeForm.asunto, mensaje: mensajeForm.mensaje } }),
      }).catch(() => {})
    }
    setEnviandoMensaje(false)
    if (emp) setLastMensajeSnap({ emp, asunto: mensajeForm.asunto, mensaje: mensajeForm.mensaje })
    setMensajeOk(true)
  }

  function startEdit(sol: { id: string; estado: string; comentarioAdmin?: string }) {
    setEditingId(sol.id)
    setEditEstado(sol.estado as 'aprobado' | 'rechazado')
    setEditComment(sol.comentarioAdmin ?? '')
  }

  function handleSubmitNueva() {
    setNewError('')
    if (!newForm.fechaInicio) { setNewError('Indicá la fecha de inicio.'); return }
    if (!newForm.descripcion.trim()) { setNewError('Completá la descripción.'); return }
    if (!user?.empleadoId) return
    addSolicitud({
      empleadoId: user.empleadoId,
      tipo: newForm.tipo,
      fechaInicio: newForm.fechaInicio,
      fechaFin: newForm.fechaFin || undefined,
      horarioDesde: newForm.horarioDesde || undefined,
      horarioHasta: newForm.horarioHasta || undefined,
      descripcion: newForm.descripcion,
    })
    setShowNueva(false)
    setNewForm({ tipo: 'permiso_personal', fechaInicio: '', fechaFin: '', horarioDesde: '', horarioHasta: '', descripcion: '' })
    setSubmitToast(true)
    setTimeout(() => setSubmitToast(false), 3500)
  }

  return (
    <div className="page-container">
      {/* Toast confirmación nueva solicitud */}
      {submitToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-scale-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">Solicitud enviada correctamente. RRHH la revisará pronto.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isAdmin ? 'Gestión de Solicitudes y Pedidos' : 'Mis Solicitudes y Pedidos'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {activeTab === 'solicitudes'
              ? `${filtered.length} solicitudes · ${pendientes} pendientes`
              : `${filteredTickets.length} pedidos · ${ticketsActivos} activos`}
          </p>
        </div>
        {isAdmin && activeTab === 'solicitudes' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportarSolicitudesExcel(filtered, empleados)}
              disabled={filtered.length === 0}
              className="btn-secondary disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Exportar Excel
            </button>
            <button onClick={() => setShowMensaje(true)} className="btn-secondary">
              <Bell className="w-4 h-4" /> Enviar mensaje a empleado
            </button>
          </div>
        )}
        {!isAdmin && activeTab === 'solicitudes' && (
          <button onClick={() => setShowNueva(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nueva solicitud
          </button>
        )}
        {!isAdmin && activeTab === 'pedidos' && (
          <button onClick={() => setShowNuevoTicket(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo pedido
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('solicitudes')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'solicitudes'
              ? 'border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Solicitudes
          {pendientes > 0 && <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendientes}</span>}
        </button>
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'pedidos'
              ? 'border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <HeadphonesIcon className="w-4 h-4" />
          Pedidos a RRHH
          {ticketsActivos > 0 && <span className="bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">{ticketsActivos}</span>}
        </button>
      </div>

      {activeTab === 'pedidos' && (
        <PedidosRRHH
          isAdmin={isAdmin} user={user}
          filteredTickets={filteredTickets} baseTickets={baseTickets}
          ticketsActivos={ticketsActivos} ticketEstadoFilter={ticketEstadoFilter}
          setTicketEstadoFilter={setTicketEstadoFilter}
          empleados={empleados} expandedTicketId={expandedTicketId}
          setExpandedTicketId={setExpandedTicketId}
          respuesta={respuesta} setRespuesta={setRespuesta}
          estadoResp={estadoResp} setEstadoResp={setEstadoResp}
          handleResponderTicket={handleResponderTicket}
          showNuevoTicket={showNuevoTicket} setShowNuevoTicket={setShowNuevoTicket}
          ticketForm={ticketForm} setTicketForm={setTicketForm}
          ticketError={ticketError} handleNuevoTicket={handleNuevoTicket}
        />
      )}

      {activeTab === 'solicitudes' && (<>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Pendientes', count: base.filter(s => s.estado === 'pendiente').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: Clock },
          { label: 'Aprobadas', count: base.filter(s => s.estado === 'aprobado').length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
          { label: 'Rechazadas', count: base.filter(s => s.estado === 'rechazado').length, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', icon: XCircle },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="card p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${color} shrink-0`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar empleado..."
              className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none w-full"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button onClick={() => setQuery('')}><X className="w-3.5 h-3.5 text-slate-400" /></button>}
          </div>
        )}
        <select className="form-select w-auto text-sm" value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
        <select className="form-select w-auto text-sm" value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPO_GRUPOS.map(grupo => (
            <optgroup key={grupo.label} label={`── ${grupo.label}`}>
              {grupo.tipos.map(t => (
                <option key={t} value={t}>{SOLICITUD_TIPO_LABEL[t as SolicitudTipo]}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {isAdmin && (
          <>
            <input
              type="date"
              className="form-input w-auto text-sm"
              value={fechaDesdeFilter}
              onChange={e => setFechaDesdeFilter(e.target.value)}
              title="Desde"
            />
            <span className="text-slate-400 text-sm self-center">—</span>
            <input
              type="date"
              className="form-input w-auto text-sm"
              value={fechaHastaFilter}
              onChange={e => setFechaHastaFilter(e.target.value)}
              title="Hasta"
            />
          </>
        )}
        {(query || estadoFilter || tipoFilter || fechaDesdeFilter || fechaHastaFilter) && (
          <button onClick={() => { setQuery(''); setEstadoFilter(''); setTipoFilter(''); setFechaDesdeFilter(''); setFechaHastaFilter('') }} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Solicitudes list */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay solicitudes</p>
          {!isAdmin && (
            <button onClick={() => setShowNueva(true)} className="btn-primary mt-3">
              <Plus className="w-4 h-4" /> Nueva solicitud
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sol => {
            const emp = empleados.find(e => e.id === sol.empleadoId)
            const isOpen = expandedId === sol.id
            return (
              <div key={sol.id} className="card overflow-hidden">
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : sol.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    sol.estado === 'aprobado' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    sol.estado === 'rechazado' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                    'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                  }`}>
                    {sol.estado === 'aprobado' ? <CheckCircle2 className="w-5 h-5" /> :
                     sol.estado === 'rechazado' ? <XCircle className="w-5 h-5" /> :
                     <Clock className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        {SOLICITUD_TIPO_LABEL[sol.tipo]}
                      </p>
                      <span className={`badge ${SOLICITUD_ESTADO_COLOR[sol.estado]}`}>
                        {SOLICITUD_ESTADO_LABEL[sol.estado]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAdmin && emp ? `${emp.nombre} ${emp.apellido} · ` : ''}
                      {formatFecha(sol.fechaInicio)}{sol.fechaFin ? ` al ${formatFecha(sol.fechaFin)}` : ''}
                      {sol.horarioDesde ? ` · ${sol.horarioDesde}${sol.horarioHasta ? ` a ${sol.horarioHasta} hs` : ' hs'}` : ''}
                      {' · '}Creada el {formatFecha(sol.fechaCreacion)}
                    </p>
                  </div>

                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30 animate-fade-in">
                    {isAdmin && emp && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                          {emp.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emp.nombre} {emp.apellido}</p>
                          <p className="text-xs text-slate-400">{emp.cargo} · {emp.sector}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descripción</p>
                      {sol.descripcion}
                    </div>

                    {/* Línea de tiempo del estado */}
                    <SolicitudTimeline sol={sol} />

                    {sol.comentarioAdmin && (
                      <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 border border-brand-100 dark:border-brand-800">
                        <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 mb-1">
                          Respuesta de RRHH {sol.estado === 'aprobado' ? '✅' : '❌'}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{sol.comentarioAdmin}</p>
                        {sol.fechaResolucion && (
                          <p className="text-xs text-slate-400 mt-1">{formatFecha(sol.fechaResolucion)}</p>
                        )}
                      </div>
                    )}

                    {/* Admin actions — pendiente */}
                    {isAdmin && sol.estado === 'pendiente' && (
                      <div className="space-y-2">
                        <textarea
                          className="form-input text-sm resize-none"
                          rows={2}
                          placeholder="Comentario para el empleado (opcional)"
                          value={comments[sol.id] ?? ''}
                          onChange={e => setComments(prev => ({ ...prev, [sol.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(sol.id)} className="btn-success flex-1 justify-center">
                            <CheckCircle2 className="w-4 h-4" /> Aprobar
                          </button>
                          <button onClick={() => handleReject(sol.id)} className="btn-danger flex-1 justify-center">
                            <XCircle className="w-4 h-4" /> Rechazar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Admin actions — editar resolución ya tomada */}
                    {isAdmin && (sol.estado === 'aprobado' || sol.estado === 'rechazado') && (
                      editingId === sol.id ? (
                        <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Editar resolución</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditEstado('aprobado')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium border transition-colors ${editEstado === 'aprobado' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                              ✅ Aprobada
                            </button>
                            <button
                              onClick={() => setEditEstado('rechazado')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium border transition-colors ${editEstado === 'rechazado' ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                              ❌ Rechazada
                            </button>
                          </div>
                          <textarea
                            className="form-input text-sm resize-none"
                            rows={2}
                            placeholder="Comentario para el empleado (opcional)"
                            value={editComment}
                            onChange={e => setEditComment(e.target.value)}
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="btn-secondary text-sm">Cancelar</button>
                            <button onClick={() => handleEdit(sol.id)} className="btn-primary text-sm">
                              <Save className="w-4 h-4" /> Guardar cambios
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            onClick={() => startEdit(sol)}
                            className="text-sm text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar resolución
                          </button>
                        </div>
                      )
                    )}

                    {/* Employee cancel */}
                    {!isAdmin && sol.estado === 'pendiente' && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setConfirmCancel(sol.id)}
                          className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar solicitud
                        </button>
                      </div>
                    )}

                    {/* PDF download — siempre visible */}
                    <div className="flex justify-start pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => descargarSolicitudPDF(sol, emp)}
                        className="text-sm text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> Descargar constancia PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — Enviar mensaje a empleado */}
      {showMensaje && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center sm:p-4" onClick={() => { if (!enviandoMensaje) setShowMensaje(false) }}>
          <div className="card w-full sm:max-w-lg animate-scale-in rounded-t-2xl rounded-b-none sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title flex items-center gap-2"><Bell className="w-4 h-4" /> Enviar mensaje a empleado</p>
              <button onClick={() => setShowMensaje(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {mensajeOk ? (
                <div className="py-6 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">¡Mensaje enviado!</p>
                    <p className="text-sm text-slate-500 mt-1">El empleado recibió la notificación y el email.</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {lastMensajeSnap && (
                      <button
                        onClick={() => descargarMensajePDF(lastMensajeSnap.emp, lastMensajeSnap.asunto, lastMensajeSnap.mensaje)}
                        className="btn-secondary text-sm"
                      >
                        <FileText className="w-4 h-4" /> Descargar constancia PDF
                      </button>
                    )}
                    <button
                      onClick={() => { setMensajeOk(false); setShowMensaje(false); setMensajeForm({ empleadoId: '', asunto: '', mensaje: '' }) }}
                      className="btn-primary text-sm"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <label className="form-label">Empleado *</label>
                    {mensajeForm.empleadoId ? (
                      <div className="form-input flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {(() => { const e = empleados.find(x => x.id === mensajeForm.empleadoId); return e ? `${e.apellido}, ${e.nombre} — ${e.cargo}` : '' })()}
                        </span>
                        <button type="button" onClick={() => { setMensajeForm(f => ({ ...f, empleadoId: '' })); setMensajeQuery('') }} className="ml-2 text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            className="form-input pl-9"
                            placeholder="Buscar por nombre o cargo..."
                            value={mensajeQuery}
                            onChange={e => { setMensajeQuery(e.target.value); setMensajeDropOpen(true) }}
                            onFocus={() => setMensajeDropOpen(true)}
                            onBlur={() => setTimeout(() => setMensajeDropOpen(false), 150)}
                          />
                        </div>
                        {mensajeDropOpen && (
                          <div className="absolute z-20 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                            {empleados
                              .filter(e => e.estado === 'activo' && (!mensajeQuery || `${e.nombre} ${e.apellido} ${e.cargo}`.toLowerCase().includes(mensajeQuery.toLowerCase())))
                              .sort((a, b) => a.apellido.localeCompare(b.apellido))
                              .slice(0, 20)
                              .map(e => (
                                <button
                                  key={e.id}
                                  type="button"
                                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                                  onMouseDown={() => { setMensajeForm(f => ({ ...f, empleadoId: e.id })); setMensajeQuery(''); setMensajeDropOpen(false) }}
                                >
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{e.apellido}, {e.nombre}</span>
                                  <span className="text-slate-400 ml-1.5">— {e.cargo}</span>
                                </button>
                              ))}
                            {empleados.filter(e => e.estado === 'activo' && (!mensajeQuery || `${e.nombre} ${e.apellido} ${e.cargo}`.toLowerCase().includes(mensajeQuery.toLowerCase()))).length === 0 && (
                              <p className="px-4 py-3 text-sm text-slate-400">Sin resultados</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Asunto *</label>
                    <input className="form-input" placeholder="Ej: Presentar certificado médico el lunes"
                      value={mensajeForm.asunto} onChange={e => setMensajeForm(f => ({ ...f, asunto: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Mensaje *</label>
                    <textarea className="form-input resize-none" rows={4}
                      placeholder="Describí el mensaje o instrucción para el empleado..."
                      value={mensajeForm.mensaje} onChange={e => setMensajeForm(f => ({ ...f, mensaje: e.target.value }))} />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-brand-700 dark:text-brand-400">
                    📧 El empleado recibirá una notificación en la app y un email con este mensaje.
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button onClick={() => setShowMensaje(false)} className="btn-secondary" disabled={enviandoMensaje}>Cancelar</button>
                    <button
                      onClick={handleEnviarMensaje}
                      disabled={!mensajeForm.empleadoId || !mensajeForm.asunto.trim() || !mensajeForm.mensaje.trim() || enviandoMensaje}
                      className="btn-primary disabled:opacity-50"
                    >
                      {enviandoMensaje ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar mensaje</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmar cancelación */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center sm:p-4" onClick={() => setConfirmCancel(null)}>
          <div className="card w-full sm:max-w-sm animate-scale-in rounded-t-2xl rounded-b-none sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Cancelar solicitud?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Esta acción eliminará la solicitud. No se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmCancel(null)}
                  className="btn-secondary flex-1 justify-center"
                >
                  Volver
                </button>
                <button
                  onClick={() => { cancelSolicitud(confirmCancel); setConfirmCancel(null); setExpandedId(null) }}
                  className="btn-danger flex-1 justify-center"
                >
                  Sí, cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* (timeline component definido abajo) */}

      {/* Nueva solicitud modal — bottom sheet en mobile, centrado en desktop */}
      {showNueva && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center sm:p-4" onClick={() => setShowNueva(false)}>
          <div className="card w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-scale-in rounded-t-2xl rounded-b-none sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Nueva Solicitud</p>
              <button onClick={() => setShowNueva(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {newError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-2.5 text-sm">
                  {newError}
                </div>
              )}
              <div>
                <label className="form-label">Tipo de solicitud *</label>
                <select className="form-select" value={newForm.tipo} onChange={e => setNewForm(f => ({ ...f, tipo: e.target.value as SolicitudTipo }))}>
                  {TIPO_GRUPOS.map(grupo => (
                    <optgroup key={grupo.label} label={`── ${grupo.label}`}>
                      {grupo.tipos.map(t => (
                        <option key={t} value={t}>{SOLICITUD_TIPO_LABEL[t as SolicitudTipo]}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Fecha inicio *</label>
                  <input className="form-input" type="date" value={newForm.fechaInicio} onChange={e => setNewForm(f => ({ ...f, fechaInicio: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Fecha fin</label>
                  <input className="form-input" type="date" value={newForm.fechaFin} onChange={e => setNewForm(f => ({ ...f, fechaFin: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Horario <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">Desde</span>
                    <input
                      className="form-input pl-14 text-sm"
                      type="time"
                      value={newForm.horarioDesde}
                      onChange={e => setNewForm(f => ({ ...f, horarioDesde: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">Hasta</span>
                    <input
                      className="form-input pl-14 text-sm"
                      type="time"
                      value={newForm.horarioHasta}
                      onChange={e => setNewForm(f => ({ ...f, horarioHasta: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label">Descripción / Motivo *</label>
                <textarea
                  className="form-input resize-none"
                  rows={3}
                  placeholder="Describí brevemente el motivo..."
                  value={newForm.descripcion}
                  onChange={e => setNewForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowNueva(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleSubmitNueva} className="btn-primary">Enviar solicitud</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}

// ── Componente Pedidos a RRHH (tickets) ───────────────────────────────────────
function PedidosRRHH({ isAdmin, user, filteredTickets, baseTickets, ticketsActivos, ticketEstadoFilter, setTicketEstadoFilter, empleados, expandedTicketId, setExpandedTicketId, respuesta, setRespuesta, estadoResp, setEstadoResp, handleResponderTicket, showNuevoTicket, setShowNuevoTicket, ticketForm, setTicketForm, ticketError, handleNuevoTicket }: {
  isAdmin: boolean, user: { empleadoId?: string } | null,
  filteredTickets: import('@/types').Ticket[], baseTickets: import('@/types').Ticket[],
  ticketsActivos: number, ticketEstadoFilter: string,
  setTicketEstadoFilter: (v: string) => void,
  empleados: import('@/types').Empleado[],
  expandedTicketId: string | null, setExpandedTicketId: (v: string | null) => void,
  respuesta: Record<string, string>, setRespuesta: (fn: (p: Record<string, string>) => Record<string, string>) => void,
  estadoResp: Record<string, TicketEstado>, setEstadoResp: (fn: (p: Record<string, TicketEstado>) => Record<string, TicketEstado>) => void,
  handleResponderTicket: (id: string) => void,
  showNuevoTicket: boolean, setShowNuevoTicket: (v: boolean) => void,
  ticketForm: { tipo: TicketTipo; asunto: string; descripcion: string },
  setTicketForm: (fn: (f: { tipo: TicketTipo; asunto: string; descripcion: string }) => { tipo: TicketTipo; asunto: string; descripcion: string }) => void,
  ticketError: string, handleNuevoTicket: () => void,
}) {
  return (
    <>
      {/* Info cards empleado */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Certificado laboral', desc: 'Para bancos, alquileres, etc.', icon: FileCheck, color: 'text-brand-700 bg-blue-50 dark:bg-blue-900/20', tipo: 'certificado_laboral' as TicketTipo },
            { label: 'Consultas generales', desc: 'Dudas sobre liquidación, contratos, etc.', icon: HelpCircle, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', tipo: 'consulta' as TicketTipo },
            { label: 'Actualización de datos', desc: 'Cambio de datos personales o bancarios', icon: RefreshCw, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', tipo: 'actualizacion_datos' as TicketTipo },
          ].map(({ label, desc, icon: Icon, color, tipo }) => (
            <div key={label} className="card-hover p-4 flex items-start gap-3 cursor-pointer"
              onClick={() => { setTicketForm(f => ({ ...f, tipo })); setShowNuevoTicket(true) }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats admin */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Abiertos', count: baseTickets.filter(t => t.estado === 'abierto').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: Circle },
            { label: 'En proceso', count: baseTickets.filter(t => t.estado === 'en_proceso').length, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', icon: Clock },
            { label: 'Resueltos', count: baseTickets.filter(t => t.estado === 'resuelto').length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
            { label: 'Cerrados', count: baseTickets.filter(t => t.estado === 'cerrado').length, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', icon: X },
          ].map(({ label, count, color, icon: Icon }) => (
            <div key={label} className="card p-4 flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon className="w-4 h-4" /></div>
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'abierto', 'en_proceso', 'resuelto', 'cerrado'] as const).map(estado => (
          <button key={estado} onClick={() => setTicketEstadoFilter(estado)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${ticketEstadoFilter === estado ? 'bg-brand-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            {!estado ? 'Todos' : TICKET_ESTADO_LABEL[estado]}
          </button>
        ))}
      </div>

      {/* Lista de tickets */}
      {filteredTickets.length === 0 ? (
        <div className="card p-12 text-center">
          <HeadphonesIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay pedidos registrados</p>
          {!isAdmin && <button onClick={() => setShowNuevoTicket(true)} className="btn-primary mt-3"><Plus className="w-4 h-4" /> Crear primer pedido</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map(ticket => {
            const emp = empleados.find(e => e.id === ticket.empleadoId)
            const isOpen = expandedTicketId === ticket.id
            const Icon = TICKET_TIPO_ICONS[ticket.tipo]
            return (
              <div key={ticket.id} className="card overflow-hidden">
                <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedTicketId(isOpen ? null : ticket.id)}>
                  <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-brand-700 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{ticket.asunto}</p>
                      <span className={`badge ${TICKET_ESTADO_COLOR[ticket.estado]}`}>{TICKET_ESTADO_LABEL[ticket.estado]}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {TICKET_TIPO_LABEL[ticket.tipo]}{isAdmin && emp ? ` · ${emp.nombre} ${emp.apellido}` : ''} · {formatFecha(ticket.fechaCreacion)}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30 animate-fade-in">
                    {isAdmin && emp && (
                      <div className="flex items-center gap-2.5 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                          {emp.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emp.nombre} {emp.apellido}</p>
                          <p className="text-xs text-slate-400">{emp.cargo} · {emp.sector}</p>
                        </div>
                      </div>
                    )}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Descripción del pedido</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{ticket.descripcion}</p>
                    </div>
                    {ticket.respuesta && (
                      <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 border border-brand-100 dark:border-brand-800">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                          <p className="text-xs font-semibold text-brand-700 dark:text-brand-400">Respuesta de RRHH</p>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.respuesta}</p>
                        <p className="text-xs text-slate-400 mt-1.5">{formatFecha(ticket.fechaActualizacion)}</p>
                      </div>
                    )}
                    {isAdmin && (ticket.estado === 'abierto' || ticket.estado === 'en_proceso') && (
                      <div className="space-y-2">
                        <label className="form-label">Responder al empleado</label>
                        <textarea className="form-input resize-none" rows={3} placeholder="Escribí tu respuesta..."
                          value={respuesta[ticket.id] ?? ''}
                          onChange={e => setRespuesta(prev => ({ ...prev, [ticket.id]: e.target.value }))} />
                        <div className="flex gap-2">
                          <select className="form-select w-auto text-sm"
                            value={estadoResp[ticket.id] ?? 'en_proceso'}
                            onChange={e => setEstadoResp(prev => ({ ...prev, [ticket.id]: e.target.value as TicketEstado }))}>
                            <option value="en_proceso">Marcar En proceso</option>
                            <option value="resuelto">Marcar Resuelto</option>
                            <option value="cerrado">Cerrar ticket</option>
                          </select>
                          <button onClick={() => handleResponderTicket(ticket.id)}
                            disabled={!respuesta[ticket.id]?.trim()} className="btn-primary disabled:opacity-50">
                            <Send className="w-4 h-4" /> Responder
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PDF download */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => descargarTicketPDF(ticket, emp)}
                        className="text-sm text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> Descargar constancia PDF
                      </button>
                      {isAdmin && ticket.tipo === 'certificado_laboral' && emp && (
                        <button
                          onClick={() => generarCertificadoLaboralPDF(ticket, emp)}
                          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" /> Generar certificado laboral PDF
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo pedido */}
      {showNuevoTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center sm:p-4" onClick={() => setShowNuevoTicket(false)}>
          <div className="card w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-scale-in rounded-t-2xl rounded-b-none sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Nuevo Pedido a RRHH</p>
              <button onClick={() => setShowNuevoTicket(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {ticketError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-2.5 text-sm">{ticketError}</div>}
              <div>
                <label className="form-label">Tipo de pedido *</label>
                <select className="form-select" value={ticketForm.tipo} onChange={e => setTicketForm(f => ({ ...f, tipo: e.target.value as TicketTipo }))}>
                  {TICKET_TIPOS.map(t => <option key={t} value={t}>{TICKET_TIPO_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Asunto *</label>
                <input className="form-input" placeholder="Ej: Necesito un certificado de trabajo"
                  value={ticketForm.asunto} onChange={e => setTicketForm(f => ({ ...f, asunto: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Descripción *</label>
                <textarea className="form-input resize-none" rows={4}
                  placeholder="Describí en detalle tu pedido o consulta..."
                  value={ticketForm.descripcion} onChange={e => setTicketForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
                <p className="text-xs text-brand-700 dark:text-brand-400 font-medium mb-0.5">Tiempo de respuesta estimado</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">RRHH responde en un plazo de 24-48 horas hábiles.</p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowNuevoTicket(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleNuevoTicket} className="btn-primary"><Send className="w-4 h-4" /> Enviar pedido</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Línea de tiempo del estado de una solicitud ──────────────────────────────
function SolicitudTimeline({ sol }: { sol: { estado: string; fechaCreacion: string; fechaResolucion?: string } }) {
  const resuelto = sol.estado === 'aprobado' || sol.estado === 'rechazado'
  const aprobado = sol.estado === 'aprobado'
  const rechazado = sol.estado === 'rechazado'

  const steps = [
    {
      label: 'Solicitud enviada',
      fecha: sol.fechaCreacion,
      icon: Send,
      state: 'done' as const,
      color: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40',
      line: 'bg-brand-300 dark:bg-brand-700',
    },
    {
      label: resuelto ? 'Revisada por RRHH' : 'En revisión por RRHH',
      fecha: resuelto ? sol.fechaResolucion : undefined,
      sub: resuelto ? undefined : 'Esperando respuesta del administrador',
      icon: resuelto ? CheckCircle2 : Hourglass,
      state: resuelto ? ('done' as const) : ('active' as const),
      color: resuelto
        ? 'text-brand-600 bg-brand-100 dark:bg-brand-900/40'
        : 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 animate-pulse',
      line: resuelto ? 'bg-brand-300 dark:bg-brand-700' : 'bg-slate-200 dark:bg-slate-700',
    },
    {
      label: aprobado ? 'Solicitud aprobada' : rechazado ? 'Solicitud rechazada' : 'Resolución',
      fecha: resuelto ? sol.fechaResolucion : undefined,
      icon: aprobado ? CheckCircle2 : rechazado ? XCircle : Clock,
      state: resuelto ? ('done' as const) : ('pending' as const),
      color: aprobado
        ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40'
        : rechazado
          ? 'text-red-600 bg-red-100 dark:bg-red-900/40'
          : 'text-slate-400 bg-slate-100 dark:bg-slate-800',
      line: '',
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Seguimiento</p>
      <div className="space-y-0">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isLast = i === steps.length - 1
          return (
            <div key={i} className="flex gap-3">
              {/* Columna del ícono + línea */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {!isLast && <div className={`w-0.5 flex-1 min-h-[20px] my-1 ${step.line || 'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
              {/* Contenido */}
              <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm font-medium ${
                  step.state === 'pending' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {step.label}
                </p>
                {step.fecha && (
                  <p className="text-xs text-slate-400 mt-0.5">{formatFecha(step.fecha)}</p>
                )}
                {step.sub && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{step.sub}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
