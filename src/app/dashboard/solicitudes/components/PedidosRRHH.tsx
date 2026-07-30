import React from 'react'
import Link from 'next/link'
import {
  CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, FileCheck, FileText,
  HeadphonesIcon, HelpCircle, MessageSquare, Plus, RefreshCw, Send, X,
  AlertCircle, MoreHorizontal,
} from 'lucide-react'
import {
  TICKET_ESTADO_COLOR, TICKET_ESTADO_LABEL, TICKET_TIPO_LABEL, formatFecha,
} from '@/lib/utils'
import type { Empleado, Ticket, TicketTipo, TicketEstado } from '@/types'
import {
  BRAND_C, DARK_C, GRAY_C, LIGHT_C, _pdfHeader, _pdfFooter, _pdfField, _pdfDivider,
  _pdfEmpCard, _pdfBadge, _pdfRespuesta,
} from '../pdfHelpers'

const TICKET_TIPOS: TicketTipo[] = ['certificado_laboral', 'consulta', 'actualizacion_datos', 'reclamo', 'otro']
const TICKET_TIPO_ICONS: Record<TicketTipo, React.ElementType> = {
  certificado_laboral: FileCheck, consulta: HelpCircle,
  actualizacion_datos: RefreshCw, reclamo: AlertCircle, otro: MoreHorizontal,
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

export function PedidosRRHH({ isAdmin, user, filteredTickets, baseTickets, ticketsActivos, ticketEstadoFilter, setTicketEstadoFilter, empleados, expandedTicketId, setExpandedTicketId, respuesta, setRespuesta, estadoResp, setEstadoResp, handleResponderTicket, showNuevoTicket, setShowNuevoTicket, ticketForm, setTicketForm, ticketError, handleNuevoTicket }: {
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
                      {TICKET_TIPO_LABEL[ticket.tipo]}{isAdmin && emp ? <>{' · '}<Link href={`/dashboard/empleados/${emp.id}`} className="relative inline-block font-medium hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 hover:after:w-full after:bg-brand-600 dark:after:bg-brand-400 after:transition-all after:duration-200" onClick={e => e.stopPropagation()}>{emp.nombre} {emp.apellido}</Link></> : ''}{' · '}{formatFecha(ticket.fechaCreacion)}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30 animate-fade-in">
                    {isAdmin && emp && (
                      <div className="flex items-center gap-2.5 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <Link href={`/dashboard/empleados/${emp.id}`} className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-0 hover:ring-2 hover:ring-brand-400 hover:scale-110 transition-all duration-200 shrink-0">
                          {emp.foto ? <img loading="lazy" width={32} height={32} src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                        </Link>
                        <div>
                          <Link href={`/dashboard/empleados/${emp.id}`} className="text-sm font-medium text-slate-700 dark:text-slate-200 relative inline-block font-medium hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 hover:after:w-full after:bg-brand-600 dark:after:bg-brand-400 after:transition-all after:duration-200">{emp.nombre} {emp.apellido}</Link>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
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

