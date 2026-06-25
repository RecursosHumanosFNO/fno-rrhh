import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/recibo-firmar-pdf
// Descarga el PDF original, superpone la firma visual en todas las páginas (pie de página),
// y sube el PDF firmado reemplazando el original en Storage.
export async function POST(req: NextRequest) {
  try {
    const { reciboId, empleadoId, authId } = await req.json()
    if (!reciboId || !empleadoId || !authId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = getSupabase()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    // Verificar que el empleado es el dueño del recibo o es admin
    const { data: user } = await sb.from('fno_users').select('role, empleado_id').eq('auth_id', authId).maybeSingle()
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })
    const esAdmin = user.role === 'admin'
    if (!esAdmin && user.empleado_id !== empleadoId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Traer datos del recibo y del empleado
    const [{ data: recibo }, { data: empleado }, { data: firma }] = await Promise.all([
      sb.from('fno_recibos').select('id, archivo, mes, anio').eq('id', reciboId).maybeSingle(),
      sb.from('fno_empleados').select('nombre, apellido, dni, cuil').eq('id', empleadoId).maybeSingle(),
      sb.from('fno_recibo_firmas').select('firmado_en').eq('recibo_id', reciboId).eq('empleado_id', empleadoId).maybeSingle(),
    ])

    if (!recibo?.archivo) return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 })
    if (!empleado) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    if (!firma) return NextResponse.json({ error: 'Firma no registrada aún' }, { status: 400 })

    // Descargar PDF original de Storage
    const { data: fileData, error: downloadErr } = await sb.storage.from('fno-recibos').download(recibo.archivo)
    if (downloadErr || !fileData) {
      return NextResponse.json({ error: 'No se pudo descargar el PDF' }, { status: 500 })
    }

    const pdfBytes = await fileData.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Fecha/hora de firma en Argentina (UTC-3)
    const fechaFirma = new Date(firma.firmado_en as string)
    const fechaAR = new Date(fechaFirma.getTime() - 3 * 60 * 60 * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const fechaStr = `${pad(fechaAR.getUTCDate())}/${pad(fechaAR.getUTCMonth() + 1)}/${fechaAR.getUTCFullYear()}`
    const horaStr = `${pad(fechaAR.getUTCHours())}:${pad(fechaAR.getUTCMinutes())}`
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const periodoStr = `${meses[(recibo.mes as number) - 1]} ${recibo.anio}`

    // Superponer firma en todas las páginas
    const pages = pdfDoc.getPages()
    for (const page of pages) {
      const { width } = page.getSize()
      const bannerH = 52
      const y = 0

      // Fondo de la franja
      page.drawRectangle({
        x: 0, y, width, height: bannerH,
        color: rgb(0.137, 0.349, 0.494), // #23597e institucional
      })

      // Línea superior de la franja
      page.drawRectangle({
        x: 0, y: bannerH - 1, width, height: 1,
        color: rgb(0.58, 0.78, 0.91),
      })

      // Icono de escudo (unicode no disponible en Helvetica — usamos texto)
      page.drawText('✓ RECIBO FIRMADO DIGITALMENTE', {
        x: 12, y: bannerH - 16,
        size: 8, font: fontBold,
        color: rgb(1, 1, 1),
      })

      page.drawText(`Período: ${periodoStr}`, {
        x: 12, y: bannerH - 28,
        size: 7, font,
        color: rgb(0.8, 0.9, 1),
      })

      page.drawText(`Firmante: ${empleado.nombre} ${empleado.apellido}  |  DNI: ${empleado.dni}  |  CUIL: ${empleado.cuil || '—'}`, {
        x: 12, y: bannerH - 40,
        size: 7, font,
        color: rgb(0.8, 0.9, 1),
      })

      page.drawText(`Fecha: ${fechaStr}  |  Hora: ${horaStr} (ARG)  |  Firma electrónica — Ley 25.506`, {
        x: width / 2, y: bannerH - 28,
        size: 7, font,
        color: rgb(0.8, 0.9, 1),
      })
    }

    // Guardar PDF modificado
    const signedPdfBytes = await pdfDoc.save()

    // Subir reemplazando el archivo original en Storage
    const { error: uploadErr } = await sb.storage
      .from('fno-recibos')
      .upload(recibo.archivo, signedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadErr) {
      return NextResponse.json({ error: 'No se pudo guardar el PDF firmado' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[recibo-firmar-pdf]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
