// scripts/backup-db.js
// Exporta todas las tablas de Supabase como archivos JSON.
// Lo ejecuta el GitHub Action diariamente.

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno.')
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅ presente' : '❌ FALTA')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? '✅ presente' : '❌ FALTA')
  console.error('')
  console.error('   → Agregá los secrets en GitHub:')
  console.error('     Settings → Secrets and variables → Actions → New repository secret')
  console.error('     NEXT_PUBLIC_SUPABASE_URL  y  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const fecha = new Date().toISOString().slice(0, 10)
const dir = path.join('backup', fecha)
fs.mkdirSync(dir, { recursive: true })

// Tablas a respaldar
const TABLAS = [
  { tabla: 'fno_empleados',  excluir: [] },
  { tabla: 'fno_users',      excluir: ['password'] },  // nunca exportar contraseñas
  { tabla: 'fno_solicitudes', excluir: [] },
  { tabla: 'fno_recibos',    excluir: [] },
  { tabla: 'fno_novedades',  excluir: [] },
  { tabla: 'fno_tickets',    excluir: [] },
  { tabla: 'fno_pending',    excluir: ['password'] },  // contraseñas de registros pendientes
  { tabla: 'fno_eventos',    excluir: [] },
]

async function exportarTabla({ tabla, excluir }) {
  const { data, error } = await sb.from(tabla).select('*')

  if (error) {
    console.error(`  ⚠️  ${tabla}: ${error.message}`)
    return 0
  }

  // Eliminar campos sensibles
  const limpio = data.map(row => {
    const r = { ...row }
    excluir.forEach(campo => delete r[campo])
    return r
  })

  fs.writeFileSync(
    path.join(dir, `${tabla}.json`),
    JSON.stringify(limpio, null, 2),
    'utf8'
  )
  return limpio.length
}

async function main() {
  console.log(`\n🗄️  Backup Fundación Neuquén Oeste — ${fecha}\n`)

  const resumen = { fecha, tablas: {} }
  let totalRegistros = 0

  for (const config of TABLAS) {
    process.stdout.write(`  → ${config.tabla.padEnd(22)}`)
    const n = await exportarTabla(config)
    console.log(`${n} registros`)
    resumen.tablas[config.tabla] = n
    totalRegistros += n
  }

  resumen.totalRegistros = totalRegistros
  resumen.generadoEn = new Date().toISOString()

  fs.writeFileSync(
    path.join(dir, '_resumen.json'),
    JSON.stringify(resumen, null, 2),
    'utf8'
  )

  console.log(`\n✅  Backup completo: ${totalRegistros} registros en ${TABLAS.length} tablas`)
  console.log(`📁  Guardado en: ${dir}/\n`)
}

main().catch(err => {
  console.error('❌ Error en el backup:', err.message)
  process.exit(1)
})
