import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://qgjvstwrannpyefxiatk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnanZzdHdyYW5ucHllZnhpYXRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgwNjI2MCwiZXhwIjoyMDk1MzgyMjYwfQ._zrtTtjttMWhtAMx2irb8OLDX7ABegar2GpZ28Ua1GU',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Registros del PDF — Novedades Junio 2026
const registrosPDF = [
  { nombre: 'Fabiola', apellido: 'Rojas',    categoria: 'horas_extra',        fecha: '2026-06-16', hora: '19:00', descripcion: 'Realizó 2hs extra por la Tecnicatura',              sector: 'Espacio Cultural',    cargo: 'Auxiliar de Servicio' },
  { nombre: 'Luciana', apellido: 'Miranda',  categoria: 'horas_extra',        fecha: '2026-06-13', hora: '08:00', descripcion: 'Realizó 5hs Extra para la Tecnicatura',             sector: 'Espacio Cultural',    cargo: 'Auxiliar de Servicio' },
  { nombre: 'Tamara',  apellido: 'Cariman',  categoria: 'permiso_sin_goce',   fecha: '2026-06-12', hora: '08:00', descripcion: 'Se ausentó para buscar su auto nuevo en otra provincia, por lo tanto tenía que viajar.', sector: 'Secundario Adultos', cargo: 'Auxiliar de Servicio' },
  { nombre: 'Fabiola', apellido: 'Rojas',    categoria: 'horas_extra',        fecha: '2026-06-12', hora: '11:00', descripcion: 'Cubrió a Tamara en el Colegio de Adultos',          sector: 'Secundario Adultos',  cargo: 'Auxiliar de Servicio' },
  { nombre: 'Bautista',apellido: 'Cejas',    categoria: 'salida_anticipada',  fecha: '2026-06-04', hora: '09:18', descripcion: 'Se retiró de urgencia porque el padre se descompensó y tuvo que llevarlo al hospital.', sector: 'Mantenimiento', cargo: 'Personal de Mantenimiento' },
  { nombre: 'Adriana', apellido: 'Brizuela', categoria: 'licencia_medica',    fecha: '2026-06-01', hora: '07:00', descripcion: 'Faltó el día 29 de Mayo porque se sentía muy mal físicamente.', sector: 'Auxiliar de Servicio', cargo: 'Auxiliar de Servicio' },
  { nombre: 'Fabiola', apellido: 'Rojas',    categoria: 'horas_extra',        fecha: '2026-06-01', hora: '19:00', descripcion: 'Cubrió horas de tecnicatura el día Martes de 19 a 21:30. (2.30hs)', sector: 'Auxiliar de Servicio', cargo: 'Auxiliar de Servicio' },
]

async function main() {
  console.log('🔍 Buscando empleados...')
  const { data: empleados, error: errEmp } = await sb
    .from('fno_empleados')
    .select('id, nombre, apellido')
    .in('apellido', ['Rojas', 'Miranda', 'Cariman', 'Cejas', 'Brizuela'])

  if (errEmp) { console.error('Error buscando empleados:', errEmp); process.exit(1) }

  const findId = (nombre, apellido) => {
    const e = empleados.find(x => x.apellido === apellido && x.nombre === nombre)
    return e?.id ?? null
  }

  console.log('🔍 Revisando registros ya existentes en junio 2026...')
  const { data: existentes } = await sb
    .from('fno_registros_novedad')
    .select('empleado_nombre, fecha, categoria, hora')
    .gte('fecha', '2026-06-01')
    .lte('fecha', '2026-06-30')

  const yaExiste = (r) => (existentes ?? []).some(e =>
    e.empleado_nombre === `${r.nombre} ${r.apellido}` &&
    e.fecha === r.fecha &&
    e.categoria === r.categoria &&
    e.hora === r.hora
  )

  let insertados = 0
  let salteados = 0

  for (const r of registrosPDF) {
    if (yaExiste(r)) {
      console.log(`⏭  Ya existe: ${r.nombre} ${r.apellido} — ${r.categoria} — ${r.fecha}`)
      salteados++
      continue
    }

    const { error } = await sb.from('fno_registros_novedad').insert({
      id: crypto.randomUUID(),
      empleado_id: findId(r.nombre, r.apellido),
      empleado_nombre: `${r.nombre} ${r.apellido}`,
      sector: r.sector,
      cargo: r.cargo,
      fecha: r.fecha,
      hora_tipo: 'exacta',
      hora: r.hora,
      descripcion: r.descripcion,
      categoria: r.categoria,
      creado_en: new Date().toISOString(),
    })

    if (error) {
      console.error(`❌ Error insertando ${r.nombre} ${r.apellido}:`, error.message)
    } else {
      console.log(`✅ Insertado: ${r.nombre} ${r.apellido} — ${r.categoria} — ${r.fecha}`)
      insertados++
    }
  }

  console.log(`\n📊 Resultado: ${insertados} insertados, ${salteados} ya existían.`)
}

main()
