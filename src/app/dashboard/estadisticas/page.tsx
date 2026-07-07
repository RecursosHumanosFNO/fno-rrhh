'use client'

import { useMemo, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { useRouter } from 'next/navigation'
import { SOLICITUD_TIPO_LABEL, REGISTRO_NOVEDAD_CATEGORIA_LABEL } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { TrendingUp, Users, ClipboardList, CalendarCheck, Download, BarChart3, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'

const COLORS = ['#23597e', '#3078ac', '#5193bd', '#82afcf', '#49d8b7', '#28c4a0', '#f59e0b', '#ef4444']

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_COMPLETOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function EstadisticasPage() {
  const { user } = useAuth()
  const { empleados, solicitudes, recibos, registrosNovedad } = useData()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'rrhh') router.replace('/dashboard')
  }, [user, router])

  if (!user || (user.role !== 'admin' && user.role !== 'rrhh')) return null

  const totalEmpleados = empleados.length
  const activos = empleados.filter(e => e.estado === 'activo').length
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobado').length
  const sectoresActivos = new Set(empleados.map(e => e.sector).filter(Boolean)).size

  // ── Estadísticas de Registros de Novedad ──────────────────────────────────
  const currentYear = new Date().getFullYear()
  const registrosAnio = registrosNovedad.filter(r => r.fecha.startsWith(String(currentYear)))

  const registrosPorCategoria = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of registrosAnio) {
      const label = REGISTRO_NOVEDAD_CATEGORIA_LABEL[r.categoria] ?? r.categoria
      map.set(label, (map.get(label) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
  }, [registrosAnio])

  const horasExtra = registrosAnio.filter(r => r.categoria === 'horas_extra').length
  const ausencias = registrosAnio.filter(r => r.categoria === 'ausencia').length
  const licencias = registrosAnio.filter(r =>
    ['licencia_medica', 'licencia_estudio', 'licencia_maternidad_paternidad', 'licencia_duelo'].includes(r.categoria)
  ).length
  const salidasAnticipadas = registrosAnio.filter(r => r.categoria === 'salida_anticipada').length

  // Registros de novedad por mes (año actual)
  const registrosMensuales = useMemo(() => {
    return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((mes, idx) => {
      const m = idx + 1
      const del = (cat: string[]) => registrosAnio.filter(r => {
        const rm = parseInt(r.fecha.split('-')[1])
        return rm === m && cat.includes(r.categoria)
      }).length
      return {
        mes,
        horasExtra: del(['horas_extra']),
        ausencias: del(['ausencia', 'llegada_tarde', 'salida_anticipada']),
        licencias: del(['licencia_medica', 'licencia_estudio', 'licencia_maternidad_paternidad', 'licencia_duelo']),
      }
    })
  }, [registrosAnio])

  // ── Item 16: Sector labels sin truncar ─────────────────────────────────────
  const empleadosPorSector = Array.from(
    empleados.reduce((map, e) => {
      if (!e.sector) return map
      // Usar nombre completo del sector (ya no ".split(' ')[0]")
      map.set(e.sector, (map.get(e.sector) || 0) + 1)
      return map
    }, new Map<string, number>())
  ).map(([sector, cantidad]) => ({ sector, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)

  const solicitudesPorTipo = Object.entries(
    solicitudes.reduce((acc, s) => {
      acc[s.tipo] = (acc[s.tipo] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([tipo, cantidad]) => ({
    tipo: SOLICITUD_TIPO_LABEL[tipo as keyof typeof SOLICITUD_TIPO_LABEL] ?? tipo,
    cantidad,
  })).sort((a, b) => b.cantidad - a.cantidad)

  const tasaAprobacion = solicitudes.length > 0
    ? Math.round(aprobadas / solicitudes.length * 100)
    : 0

  // ── Item 15: Evolución mensual con datos reales ─────────────────────────────
  const estadisticasMensuales = useMemo(() => {
    return MESES_CORTOS.map((mes, idx) => {
      const monthNum = idx + 1
      // Empleados activos al mes (empleados cuyo ingreso es <= ese mes)
      const empActivos = empleados.filter(e => {
        if (!e.fechaIngreso) return true
        const [y, m] = e.fechaIngreso.split('-').map(Number)
        return y < currentYear || (y === currentYear && m <= monthNum)
      }).length

      // Solicitudes creadas ese mes/año
      const solMes = solicitudes.filter(s => {
        const [y, m] = s.fechaCreacion.split('-').map(Number)
        return y === currentYear && m === monthNum
      }).length

      // Ausencias = solicitudes de tipo ausencia/licencia aprobadas ese mes
      const ausenciasMes = solicitudes.filter(s => {
        const [y, m] = s.fechaCreacion.split('-').map(Number)
        return y === currentYear && m === monthNum && s.estado === 'aprobado' &&
          ['ausencia', 'licencia_medica', 'licencia_duelo', 'licencia_estudio', 'licencia_maternidad_paternidad'].includes(s.tipo)
      }).length

      return { mes, empleados: empActivos, solicitudes: solMes, ausencias: ausenciasMes }
    })
  }, [empleados, solicitudes])

  // ── Helpers de estilo Excel ────────────────────────────────────────────────
  // ── Paleta FNO ────────────────────────────────────────────────────────────
  const FNO = {
    navy:    '23597E',  // azul institucional principal
    navyDk:  '0F3E56',  // azul muy oscuro (títulos de sección)
    teal:    '1B5E6A',  // teal oscuro (cabeceras de tabla)
    tealLt:  'E8F5F2',  // teal muy claro (stripes)
    accent:  '49D8B7',  // verde agua (acento)
    white:   'FFFFFF',
    gray:    'D1D5DB',
    text:    '0F2D3D',
    red:     'C0392B',
    amber:   'D97706',
    green:   '047857',
  }

  const BORDER = { top: { style: 'thin', color: { rgb: FNO.gray } }, bottom: { style: 'thin', color: { rgb: FNO.gray } }, left: { style: 'thin', color: { rgb: FNO.gray } }, right: { style: 'thin', color: { rgb: FNO.gray } } }

  function xlCell(v: string | number, bold = false, bgRgb?: string, fgRgb = 'FFFFFF', sz = 11) {
    const cell: XLSX.CellObject = { v, t: typeof v === 'number' ? 'n' : 's' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(cell as any).s = {
      font: { bold, color: { rgb: bgRgb ? fgRgb : FNO.text }, sz },
      fill: bgRgb ? { patternType: 'solid', fgColor: { rgb: bgRgb } } : undefined,
      alignment: { vertical: 'center', wrapText: false },
      border: BORDER,
    }
    return cell
  }

  function applyHeader(ws: XLSX.WorkSheet, headers: string[], colWidths: number[]) {
    headers.forEach((h, c) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      ws[addr] = xlCell(h, true, FNO.teal, FNO.white, 11)
    })
    ws['!cols'] = colWidths.map(w => ({ wch: w }))
    ws['!rows'] = [{ hpx: 24 }]
  }

  function applyRowStripes(ws: XLSX.WorkSheet, totalRows: number, totalCols: number) {
    for (let r = 1; r <= totalRows; r++) {
      const bg = r % 2 === 0 ? FNO.tealLt : undefined
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) ws[addr] = { v: '', t: 's' }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(ws[addr] as any).s = {
          font: { sz: 10, color: { rgb: FNO.text } },
          fill: bg ? { patternType: 'solid', fgColor: { rgb: bg } } : undefined,
          alignment: { vertical: 'center' },
          border: BORDER,
        }
      }
    }
  }

  // Fila de encabezado de la fundación (banner superior en cada hoja)
  function addFnoBanner(ws: XLSX.WorkSheet, ncols: number, year: number) {
    if (!ws['!merges']) ws['!merges'] = []
    // Fila 0: nombre institución
    ws[XLSX.utils.encode_cell({ r: 0, c: 0 })] = {
      v: 'FUNDACIÓN NEUQUÉN OESTE — Portal de RRHH', t: 's',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s: { font: { bold: true, sz: 14, color: { rgb: FNO.white } }, fill: { patternType: 'solid', fgColor: { rgb: FNO.navy } }, alignment: { horizontal: 'center', vertical: 'center' } },
    } as any
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } })
    // Fila 1: subtítulo
    ws[XLSX.utils.encode_cell({ r: 1, c: 0 })] = {
      v: `Informe Anual ${year}  ·  Generado el ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, t: 's',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s: { font: { italic: true, sz: 10, color: { rgb: FNO.white } }, fill: { patternType: 'solid', fgColor: { rgb: FNO.navyDk } }, alignment: { horizontal: 'center', vertical: 'center' } },
    } as any
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } })
    // Fila 2: línea separadora acento
    ws[XLSX.utils.encode_cell({ r: 2, c: 0 })] = {
      v: '', t: 's',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s: { fill: { patternType: 'solid', fgColor: { rgb: FNO.accent } } },
    } as any
    ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: ncols - 1 } })
    if (!ws['!rows']) ws['!rows'] = []
    ws['!rows'][0] = { hpx: 28 }
    ws['!rows'][1] = { hpx: 18 }
    ws['!rows'][2] = { hpx: 5 }
  }

  // ── Exportar informe Excel completo ───────────────────────────────────────
  function exportarInforme() {
    const wb = XLSX.utils.book_new()
    const fecha = new Date().toISOString().slice(0, 10)
    const MESES_LABEL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

    // ── Helpers de sección ────────────────────────────────────────────────
    function secTitle(ws: XLSX.WorkSheet, row: number, title: string, ncols: number) {
      const addr = XLSX.utils.encode_cell({ r: row, c: 0 })
      ws[addr] = {
        v: title, t: 's',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        s: { font: { bold: true, sz: 12, color: { rgb: FNO.white } }, fill: { patternType: 'solid', fgColor: { rgb: FNO.navy } }, alignment: { vertical: 'center', indent: 1 } },
      } as any
      if (!ws['!merges']) ws['!merges'] = []
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: ncols - 1 } })
      if (!ws['!rows']) ws['!rows'] = []
      ws['!rows'][row] = { hpx: 22 }
    }

    function kv(ws: XLSX.WorkSheet, row: number, label: string, value: string | number, type: 'normal'|'highlight'|'red'|'green' = 'normal') {
      const lAddr = XLSX.utils.encode_cell({ r: row, c: 0 })
      const vAddr = XLSX.utils.encode_cell({ r: row, c: 1 })
      const bgMap = { normal: row % 2 === 0 ? 'F1FAFA' : FNO.white, highlight: 'FFF3CD', red: 'FDECEA', green: 'E8F5F0' }
      const fgMap = { normal: FNO.text, highlight: 'C05600', red: FNO.red, green: FNO.green }
      const bg = bgMap[type]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseStyle: any = { fill: { patternType: 'solid', fgColor: { rgb: bg } }, border: BORDER, alignment: { vertical: 'center', indent: 1 } }
      ws[lAddr] = { v: label, t: 's', s: { ...baseStyle, font: { sz: 10, bold: true, color: { rgb: FNO.teal } } } } as any
      ws[vAddr] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: { ...baseStyle, font: { sz: 11, bold: type !== 'normal', color: { rgb: fgMap[type] } } } } as any
      if (!ws['!rows']) ws['!rows'] = []
      ws['!rows'][row] = { hpx: 20 }
    }

    // ── Hoja 1: Resumen ejecutivo ─────────────────────────────────────────
    const wsRes: XLSX.WorkSheet = { '!ref': 'A1:B60' }
    wsRes['!cols'] = [{ wch: 38 }, { wch: 22 }]
    addFnoBanner(wsRes, 2, currentYear)

    let r = 3
    r++ // espacio tras banner

    secTitle(wsRes, r++, 'PERSONAL', 2)
    kv(wsRes, r++, 'Total empleados', totalEmpleados)
    kv(wsRes, r++, 'Empleados activos', activos, 'green')
    kv(wsRes, r++, 'Empleados inactivos', totalEmpleados - activos)
    kv(wsRes, r++, 'Sectores / areas activas', sectoresActivos)
    r++

    secTitle(wsRes, r++, 'REGISTROS DE NOVEDAD — ' + currentYear, 2)
    kv(wsRes, r++, 'Total registros del anio', registrosAnio.length)
    kv(wsRes, r++, 'Horas extra', horasExtra, 'green')
    kv(wsRes, r++, 'Ausencias', ausencias, 'red')
    kv(wsRes, r++, 'Salidas anticipadas', salidasAnticipadas, 'red')
    kv(wsRes, r++, 'Llegadas tarde', registrosAnio.filter(x => x.categoria === 'llegada_tarde').length, 'red')
    kv(wsRes, r++, 'Licencias medicas', registrosAnio.filter(x => x.categoria === 'licencia_medica').length, 'highlight')
    kv(wsRes, r++, 'Licencias por estudio', registrosAnio.filter(x => x.categoria === 'licencia_estudio').length, 'highlight')
    kv(wsRes, r++, 'Licencias maternidad/paternidad', registrosAnio.filter(x => x.categoria === 'licencia_maternidad_paternidad').length, 'highlight')
    kv(wsRes, r++, 'Licencias por duelo', registrosAnio.filter(x => x.categoria === 'licencia_duelo').length, 'highlight')
    kv(wsRes, r++, 'Cambios de turno / coberturas', registrosAnio.filter(x => x.categoria === 'cambio_turno').length)
    kv(wsRes, r++, 'Guardias / turnos especiales', registrosAnio.filter(x => x.categoria === 'guardia_turno_especial').length)
    kv(wsRes, r++, 'Capacitaciones', registrosAnio.filter(x => x.categoria === 'capacitacion').length, 'green')
    kv(wsRes, r++, 'Reconocimientos / felicitaciones', registrosAnio.filter(x => x.categoria === 'reconocimiento').length, 'green')
    kv(wsRes, r++, 'Accidentes laborales', registrosAnio.filter(x => x.categoria === 'accidente_laboral').length,
      registrosAnio.filter(x => x.categoria === 'accidente_laboral').length > 0 ? 'red' : 'normal')
    kv(wsRes, r++, 'Suspensiones', registrosAnio.filter(x => x.categoria === 'suspension').length,
      registrosAnio.filter(x => x.categoria === 'suspension').length > 0 ? 'red' : 'normal')
    r++

    secTitle(wsRes, r++, 'SOLICITUDES Y PEDIDOS', 2)
    kv(wsRes, r++, 'Total solicitudes', solicitudes.length)
    kv(wsRes, r++, 'Pendientes', pendientes, pendientes > 0 ? 'highlight' : 'normal')
    kv(wsRes, r++, 'Aprobadas', aprobadas, 'green')
    kv(wsRes, r++, 'Tasa de aprobacion', `${tasaAprobacion}%`, 'highlight')
    wsRes['!ref'] = `A1:B${r}`
    XLSX.utils.book_append_sheet(wb, wsRes, '📋 Resumen')

    // ── Hoja 2: Novedades — detalle completo ──────────────────────────────
    const novHeaders = ['Fecha', 'Empleado', 'Sector', 'Cargo', 'Categoría', 'Descripción', 'Hora inicio', 'Hora fin', 'Edificio']
    // Color por categoría de novedad en la hoja de detalle
    const CAT_BG: Record<string, string> = {
      horas_extra: 'D1FAE5', ausencia: 'FEE2E2', llegada_tarde: 'FEE2E2',
      salida_anticipada: 'FFEDD5', licencia_medica: 'DBEAFE', licencia_estudio: 'EDE9FE',
      licencia_maternidad_paternidad: 'FCE7F3', licencia_duelo: 'F1F5F9',
      capacitacion: 'D1FAE5', reconocimiento: 'D1FAE5',
      accidente_laboral: 'FEE2E2', suspension: 'FEE2E2',
    }
    const novRows = registrosNovedad.map(reg => [
      reg.fecha, reg.empleadoNombre, reg.sector, reg.cargo,
      REGISTRO_NOVEDAD_CATEGORIA_LABEL[reg.categoria] ?? reg.categoria,
      reg.descripcion,
      reg.horaDesde ?? reg.hora ?? '',
      reg.horaHasta ?? '',
      reg.edificio ?? '',
    ])
    const wsNov = XLSX.utils.aoa_to_sheet([novHeaders, ...novRows])
    addFnoBanner(wsNov, novHeaders.length, currentYear)
    // Reconstruir con banner: los datos reales van desde fila 4 (índice 3)
    const wsNov2: XLSX.WorkSheet = { '!ref': `A1:I${novRows.length + 4}` }
    wsNov2['!cols'] = [14, 24, 20, 22, 26, 50, 12, 12, 18].map(w => ({ wch: w }))
    addFnoBanner(wsNov2, novHeaders.length, currentYear)
    novHeaders.forEach((h, c) => { wsNov2[XLSX.utils.encode_cell({ r: 3, c })] = xlCell(h, true, FNO.teal, FNO.white, 11) })
    if (!wsNov2['!rows']) wsNov2['!rows'] = []
    wsNov2['!rows'][3] = { hpx: 22 }
    registrosNovedad.forEach((reg, ri) => {
      const rIdx = ri + 4
      const bg = CAT_BG[reg.categoria] ?? (ri % 2 === 0 ? FNO.tealLt : FNO.white)
      const vals = [
        reg.fecha, reg.empleadoNombre, reg.sector, reg.cargo,
        REGISTRO_NOVEDAD_CATEGORIA_LABEL[reg.categoria] ?? reg.categoria,
        reg.descripcion,
        reg.horaDesde ?? reg.hora ?? '',
        reg.horaHasta ?? '',
        reg.edificio ?? '',
      ]
      vals.forEach((v, c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wsNov2[XLSX.utils.encode_cell({ r: rIdx, c })] = { v: v ?? '', t: 's', s: { font: { sz: 10, color: { rgb: FNO.text } }, fill: { patternType: 'solid', fgColor: { rgb: bg } }, border: BORDER, alignment: { vertical: 'center', wrapText: c === 5 } } } as any
      })
      wsNov2['!rows']![rIdx] = { hpx: 18 }
    })
    XLSX.utils.book_append_sheet(wb, wsNov2, 'Novedades Detalle')

    // ── Hoja 3: Novedades por categoría ───────────────────────────────────
    const catHeaders = ['Categoria', `Total ${currentYear}`, '% del total']
    const total = registrosAnio.length || 1
    const catRows = registrosPorCategoria.map(r2 => [r2.tipo, r2.cantidad, `${Math.round(r2.cantidad / total * 100)}%`])
    const wsCat: XLSX.WorkSheet = { '!ref': `A1:C${catRows.length + 4}` }
    wsCat['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 14 }]
    addFnoBanner(wsCat, 3, currentYear)
    catHeaders.forEach((h, c) => { wsCat[XLSX.utils.encode_cell({ r: 3, c })] = xlCell(h, true, FNO.teal, FNO.white, 11) })
    if (!wsCat['!rows']) wsCat['!rows'] = []
    wsCat['!rows'][3] = { hpx: 22 }
    catRows.forEach(([tipo, cant, pct], ri) => {
      const rIdx = ri + 4
      const bg = ri % 2 === 0 ? FNO.tealLt : FNO.white
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wsCat[XLSX.utils.encode_cell({ r: rIdx, c: 0 })] = { v: tipo, t: 's', s: { font: { sz: 10, bold: true, color: { rgb: FNO.teal } }, fill: { patternType: 'solid', fgColor: { rgb: bg } }, border: BORDER, alignment: { vertical: 'center', indent: 1 } } } as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wsCat[XLSX.utils.encode_cell({ r: rIdx, c: 1 })] = { v: cant, t: 'n', s: { font: { sz: 11, bold: true, color: { rgb: FNO.navy } }, fill: { patternType: 'solid', fgColor: { rgb: bg } }, border: BORDER, alignment: { vertical: 'center', horizontal: 'center' } } } as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wsCat[XLSX.utils.encode_cell({ r: rIdx, c: 2 })] = { v: pct, t: 's', s: { font: { sz: 10, color: { rgb: FNO.text } }, fill: { patternType: 'solid', fgColor: { rgb: bg } }, border: BORDER, alignment: { vertical: 'center', horizontal: 'center' } } } as any
      wsCat['!rows']![rIdx] = { hpx: 18 }
    })
    XLSX.utils.book_append_sheet(wb, wsCat, 'Nov. por Categoria')

    // ── Hoja 4: Novedades por empleado ────────────────────────────────────
    const novEmpHeaders = ['Apellido', 'Nombre', 'Sector', 'Total', 'Hs. Extra', 'Ausencias', 'Sal. Anticipadas', 'Licencias', 'Llegadas Tarde', 'Capacitaciones']
    const novEmpRows = empleados.filter(e => e.id !== '1').map(emp => {
      const regs = registrosNovedad.filter(r2 => r2.empleadoId === emp.id)
      return [
        emp.apellido, emp.nombre, emp.sector, regs.length,
        regs.filter(r2 => r2.categoria === 'horas_extra').length,
        regs.filter(r2 => r2.categoria === 'ausencia').length,
        regs.filter(r2 => r2.categoria === 'salida_anticipada').length,
        regs.filter(r2 => ['licencia_medica','licencia_estudio','licencia_maternidad_paternidad','licencia_duelo'].includes(r2.categoria)).length,
        regs.filter(r2 => r2.categoria === 'llegada_tarde').length,
        regs.filter(r2 => r2.categoria === 'capacitacion').length,
      ]
    }).sort((a, b) => (b[3] as number) - (a[3] as number))
    const wsNovEmp = XLSX.utils.aoa_to_sheet([novEmpHeaders, ...novEmpRows])
    addFnoBanner(wsNovEmp, novEmpHeaders.length, currentYear)
    applyHeader(wsNovEmp, novEmpHeaders, [18, 16, 20, 10, 12, 12, 16, 12, 16, 14])
    applyRowStripes(wsNovEmp, novEmpRows.length, novEmpHeaders.length)
    XLSX.utils.book_append_sheet(wb, wsNovEmp, 'Nov. por Empleado')

    // ── Hoja 5: Evolución mensual novedades ───────────────────────────────
    const evNovHeaders = ['Mes', 'Total Registros', 'Horas Extra', 'Ausencias / Tardanzas', 'Licencias', 'Otros']
    const evNovRows = registrosMensuales.map((m, idx) => {
      const total2 = m.horasExtra + m.ausencias + m.licencias
      const otros = registrosAnio.filter(r2 => {
        const rm = parseInt(r2.fecha.split('-')[1])
        return rm === idx + 1 && !['horas_extra','ausencia','llegada_tarde','salida_anticipada','licencia_medica','licencia_estudio','licencia_maternidad_paternidad','licencia_duelo'].includes(r2.categoria)
      }).length
      return [MESES_LABEL[idx], total2 + otros, m.horasExtra, m.ausencias, m.licencias, otros]
    })
    const wsEvNov = XLSX.utils.aoa_to_sheet([evNovHeaders, ...evNovRows])
    addFnoBanner(wsEvNov, evNovHeaders.length, currentYear)
    applyHeader(wsEvNov, evNovHeaders, [16, 16, 14, 22, 12, 10])
    applyRowStripes(wsEvNov, evNovRows.length, evNovHeaders.length)
    XLSX.utils.book_append_sheet(wb, wsEvNov, 'Nov. Mensual')

    // ── Hoja 6: Empleados por sector ──────────────────────────────────────
    const sectorHeaders = ['Sector', 'Empleados', '% del total', 'Novedades del anio']
    const sectorRows2 = empleadosPorSector.map(s => {
      const novSect = registrosAnio.filter(r2 => r2.sector === s.sector).length
      return [s.sector, s.cantidad, `${Math.round(s.cantidad / (totalEmpleados || 1) * 100)}%`, novSect]
    })
    const wsSect = XLSX.utils.aoa_to_sheet([sectorHeaders, ...sectorRows2])
    addFnoBanner(wsSect, sectorHeaders.length, currentYear)
    applyHeader(wsSect, sectorHeaders, [28, 14, 14, 20])
    applyRowStripes(wsSect, sectorRows2.length, sectorHeaders.length)
    XLSX.utils.book_append_sheet(wb, wsSect, 'Por Sector')

    // ── Hoja 7: Solicitudes por tipo ──────────────────────────────────────
    const tipoHeaders2 = ['Tipo de Solicitud', 'Total', 'Aprobadas', 'Pendientes', 'Rechazadas', '% Aprobacion']
    const tipoRows2 = solicitudesPorTipo.map(t => {
      const tipoKey = Object.keys(SOLICITUD_TIPO_LABEL).find(k => (SOLICITUD_TIPO_LABEL as Record<string,string>)[k] === t.tipo) ?? t.tipo
      const del = solicitudes.filter(s => s.tipo === tipoKey)
      const ap = del.filter(s => s.estado === 'aprobado').length
      const pe = del.filter(s => s.estado === 'pendiente').length
      const re = del.filter(s => s.estado === 'rechazado').length
      return [t.tipo, del.length, ap, pe, re, del.length > 0 ? `${Math.round(ap/del.length*100)}%` : '-']
    })
    const wsTipo2 = XLSX.utils.aoa_to_sheet([tipoHeaders2, ...tipoRows2])
    addFnoBanner(wsTipo2, tipoHeaders2.length, currentYear)
    applyHeader(wsTipo2, tipoHeaders2, [30, 10, 12, 12, 14, 14])
    applyRowStripes(wsTipo2, tipoRows2.length, tipoHeaders2.length)
    XLSX.utils.book_append_sheet(wb, wsTipo2, 'Solicitudes x Tipo')

    // ── Hoja 8: Detalle completo de empleados ─────────────────────────────
    const empHeaders2 = ['Apellido', 'Nombre', 'DNI', 'CUIL', 'Cargo', 'Sector', 'Estado', 'Fecha Ingreso', 'Email', 'Telefono', 'Solicitudes', 'Sol. Aprobadas', 'Novedades', 'Hs. Extra', 'Ausencias', 'Licencias']
    const empRows2 = empleados.filter(e => e.id !== '1').map(emp => {
      const mSol = solicitudes.filter(s => s.empleadoId === emp.id)
      const mReg = registrosNovedad.filter(r2 => r2.empleadoId === emp.id)
      return [
        emp.apellido, emp.nombre, emp.dni ?? '', emp.cuil ?? '',
        emp.cargo, emp.sector, emp.estado, emp.fechaIngreso ?? '',
        emp.email ?? '', emp.telefono ?? '',
        mSol.length, mSol.filter(s => s.estado === 'aprobado').length,
        mReg.length,
        mReg.filter(r2 => r2.categoria === 'horas_extra').length,
        mReg.filter(r2 => r2.categoria === 'ausencia').length,
        mReg.filter(r2 => ['licencia_medica','licencia_estudio','licencia_maternidad_paternidad','licencia_duelo'].includes(r2.categoria)).length,
      ]
    })
    const wsEmp2 = XLSX.utils.aoa_to_sheet([empHeaders2, ...empRows2])
    addFnoBanner(wsEmp2, empHeaders2.length, currentYear)
    applyHeader(wsEmp2, empHeaders2, [18, 16, 12, 16, 22, 20, 12, 14, 28, 16, 12, 14, 12, 10, 12, 12])
    applyRowStripes(wsEmp2, empRows2.length, empHeaders2.length)
    XLSX.utils.book_append_sheet(wb, wsEmp2, 'Detalle Empleados')

    XLSX.writeFile(wb, `informe_rrhh_${fecha}.xlsx`)
  }

  // ── Item 14: Exportar empleados como Excel con colores ─────────────────────
  function exportarCSV() {
    const headers = ['Apellido', 'Nombre', 'DNI', 'CUIL', 'Cargo', 'Sector', 'Estado', 'Fecha Ingreso', 'Email', 'Teléfono', 'Solicitudes', 'Sol. Aprobadas']
    const rows = empleados.filter(e => e.id !== '1').map(emp => {
      const mSol = solicitudes.filter(s => s.empleadoId === emp.id)
      return [
        emp.apellido, emp.nombre, emp.dni ?? '', emp.cuil ?? '',
        emp.cargo, emp.sector, emp.estado, emp.fechaIngreso ?? '',
        emp.email ?? '', emp.telefono ?? '',
        mSol.length, mSol.filter(s => s.estado === 'aprobado').length,
      ]
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    addFnoBanner(ws, headers.length, currentYear)
    applyHeader(ws, headers, [18, 16, 14, 16, 22, 20, 12, 14, 28, 16, 14, 14])
    applyRowStripes(ws, rows.length, headers.length)
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados')

    const fecha = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `empleados_${fecha}.xlsx`)
  }

  // Acortar label del sector para el eje X del chart (máx 12 chars)
  function shortSector(s: string) {
    return s.length > 12 ? s.slice(0, 11) + '…' : s
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Estadísticas e Indicadores</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Métricas clave de Recursos Humanos — {new Date().getFullYear()}
          </p>
        </div>
        <button onClick={exportarInforme} className="btn-primary">
          <Download className="w-4 h-4" /> Exportar informe (.xlsx)
        </button>
      </div>

      {/* KPI Cards — Novedades */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Registros de Novedad — {currentYear}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Registros', value: registrosAnio.length, sub: 'este año', icon: FileText,     bg: 'bg-[#23597e]',   text: 'text-white' },
            { label: 'Horas Extra',     value: horasExtra,           sub: 'registradas',                  icon: TrendingUp,     bg: 'bg-emerald-600', text: 'text-white' },
            { label: 'Ausencias',       value: ausencias,            sub: 'días sin presentarse',          icon: CalendarCheck,  bg: 'bg-red-600',     text: 'text-white' },
            { label: 'Licencias',       value: licencias,            sub: `+ ${salidasAnticipadas} salidas anticipadas`, icon: ClipboardList, bg: 'bg-amber-500', text: 'text-white' },
          ].map(({ label, value, sub, icon: Icon, bg, text }) => (
            <div key={label} className={`${bg} rounded-2xl p-5 flex items-start gap-3 shadow-md`}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-white/20">
                <Icon className={`w-5 h-5 ${text}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${text}`}>{value}</p>
                <p className={`text-xs font-medium ${text} opacity-90`}>{label}</p>
                <p className={`text-xs ${text} opacity-70 mt-0.5`}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row 1 — Novedades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Novedades por categoría */}
        <div className="card p-5">
          <div className="mb-5">
            <p className="section-title">Novedades por Categoría</p>
            <p className="section-subtitle">Distribución de registros — {currentYear}</p>
          </div>
          {registrosPorCategoria.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <div className="text-center">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin registros este año</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <ResponsiveContainer width="50%" height={240}>
                <PieChart>
                  <Pie
                    data={registrosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="cantidad"
                  >
                    {registrosPorCategoria.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1 overflow-hidden">
                {registrosPorCategoria.slice(0, 8).map((item, i) => (
                  <div key={item.tipo} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1" title={item.tipo}>{item.tipo}</p>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">{item.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empleados por sector */}
        <div className="card p-5">
          <div className="mb-5">
            <p className="section-title">Empleados por Sector</p>
            <p className="section-subtitle">Distribución del personal</p>
          </div>
          {empleadosPorSector.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin empleados cargados</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={empleadosPorSector.map(d => ({ ...d, sectorCorto: shortSector(d.sector) }))}
                margin={{ top: 4, right: 4, left: -20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="sectorCorto"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [v, 'Empleados']}
                  labelFormatter={(label) => {
                    const orig = empleadosPorSector.find(d => shortSector(d.sector) === label)
                    return orig?.sector ?? label
                  }}
                />
                <Bar dataKey="cantidad" fill="#23597e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Evolución mensual de novedades */}
      <div className="card p-5">
        <div className="mb-5">
          <p className="section-title">Evolución Mensual de Novedades — {currentYear}</p>
          <p className="section-subtitle">Horas extra, ausencias y licencias por mes</p>
        </div>
        {registrosAnio.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <div className="text-center">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin registros este año</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={registrosMensuales} margin={{ top: 4, right: 20, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Line type="monotone" dataKey="horasExtra" stroke="#28c4a0" strokeWidth={2.5} dot={{ r: 4 }} name="Horas Extra" />
              <Line type="monotone" dataKey="ausencias" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} name="Ausencias / Tardanzas" strokeDasharray="5 3" />
              <Line type="monotone" dataKey="licencias" stroke="#3078ac" strokeWidth={2.5} dot={{ r: 4 }} name="Licencias" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Separador — Solicitudes */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Solicitudes y Pedidos</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Empleados', value: totalEmpleados, sub: `${activos} activos`, icon: Users, color: 'text-brand-700 dark:text-brand-400 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Solicitudes Totales', value: solicitudes.length, sub: `${pendientes} pendientes`, icon: ClipboardList, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Tasa de Aprobación', value: `${tasaAprobacion}%`, sub: `${aprobadas} aprobadas`, icon: CalendarCheck, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Sectores Activos', value: sectoresActivos, sub: 'Unidades de trabajo', icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="card p-5 flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Solicitudes por tipo */}
      <div className="card p-5">
        <div className="mb-5">
          <p className="section-title">Solicitudes por Tipo</p>
          <p className="section-subtitle">Total registradas en el sistema</p>
        </div>
        {solicitudesPorTipo.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <div className="text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin solicitudes aún</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <ResponsiveContainer width="30%" height={240}>
              <PieChart>
                <Pie
                  data={solicitudesPorTipo}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="cantidad"
                >
                  {solicitudesPorTipo.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1 overflow-hidden">
              {solicitudesPorTipo.slice(0, 8).map((item, i) => (
                <div key={item.tipo} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1" title={item.tipo}>{item.tipo}</p>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">{item.cantidad}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evolución mensual solicitudes */}
      <div className="card p-5">
        <div className="mb-5">
          <p className="section-title">Evolución Mensual — {new Date().getFullYear()}</p>
          <p className="section-subtitle">Solicitudes y ausencias aprobadas por mes</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={estadisticasMensuales} margin={{ top: 4, right: 20, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Line type="monotone" dataKey="empleados" stroke="#23597e" strokeWidth={2.5} dot={{ r: 4 }} name="Empleados" />
            <Line type="monotone" dataKey="solicitudes" stroke="#3078ac" strokeWidth={2.5} dot={{ r: 4 }} name="Solicitudes" strokeDasharray="5 3" />
            <Line type="monotone" dataKey="ausencias" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Ausencias aprobadas" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      {empleados.filter(e => e.id !== '1').length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="section-title">Detalle por Empleado</p>
            <button onClick={exportarCSV} className="btn-secondary text-sm">
              <Download className="w-4 h-4" /> Exportar Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left">Empleado</th>
                  <th className="table-header text-left">Sector</th>
                  <th className="table-header text-center">Solicitudes</th>
                  <th className="table-header text-center">Aprobadas</th>
                  <th className="table-header text-center">Novedades</th>
                  <th className="table-header text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {empleados.filter(e => e.id !== '1').map(emp => {
                  const mSolicitudes = solicitudes.filter(s => s.empleadoId === emp.id)
                  const mAprobadas = mSolicitudes.filter(s => s.estado === 'aprobado').length
                  const mNovedades = registrosNovedad.filter(r => r.empleadoId === emp.id).length
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="table-cell max-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                            {emp.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{emp.apellido}, {emp.nombre}</span>
                        </div>
                      </td>
                      <td className="table-cell text-slate-600 dark:text-slate-400 text-sm max-w-[160px] truncate" title={emp.sector}>{emp.sector}</td>
                      <td className="table-cell text-center font-semibold text-slate-700 dark:text-slate-300">{mSolicitudes.length}</td>
                      <td className="table-cell text-center font-semibold text-emerald-600">{mAprobadas}</td>
                      <td className="table-cell text-center font-semibold text-[#23597e] dark:text-[#49d8b7]">{mNovedades}</td>
                      <td className="table-cell">
                        <span className={`badge text-xs ${
                          emp.estado === 'activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                          emp.estado === 'licencia' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          emp.estado === 'vacaciones' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {emp.estado.charAt(0).toUpperCase() + emp.estado.slice(1)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
