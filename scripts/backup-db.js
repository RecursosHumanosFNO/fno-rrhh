// scripts/backup-db.js
// Exporta todas las tablas de Supabase como archivos JSON.
// Usa fetch directo a la REST API — sin cliente JS, sin WebSockets, sin dependencias.
// Compatible con Node.js 18+.

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

const fecha = new Date().toISOString().slice(0, 10)
const dir = path.join('backup', fecha)
fs.mkdirSync(dir, { recursive: true })

// Tablas a respaldar (campos a excluir por privacidad)
//
// fno_recibo_firmas y fno_registros_novedad faltaban. Las firmas son
// justamente la constancia de que el empleado recibió y conformó su recibo:
// es lo último que debería faltar en un backup de RRHH.
const TABLAS = [
  { tabla: 'fno_empleados',         excluir: [] },
  { tabla: 'fno_users',             excluir: ['password'] },
  { tabla: 'fno_solicitudes',       excluir: [] },
  { tabla: 'fno_recibos',           excluir: [] },
  { tabla: 'fno_recibo_firmas',     excluir: [] },
  { tabla: 'fno_novedades',         excluir: [] },
  { tabla: 'fno_tickets',           excluir: [] },
  { tabla: 'fno_pending',           excluir: [] },
  { tabla: 'fno_notifs',            excluir: [] },
  { tabla: 'fno_eventos',           excluir: [] },
  { tabla: 'fno_registros_novedad', excluir: [] },
]

// Llama directamente a la REST API de Supabase (PostgREST).
//
// Pagina de a 1000. Antes pedía limit=10000 de una: hoy sobra, pero el día que
// una tabla pase ese número el backup se cortaría sin decir nada y el recorte
// se descubriría reciendo al intentar restaurar.
const PAGINA = 1000

async function fetchTabla(tabla) {
  const filas = []
  for (let desde = 0; ; desde += PAGINA) {
    const url = `${SUPABASE_URL}/rest/v1/${tabla}?select=*`
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json',
        'Range-Unit': 'items',
        'Range': `${desde}-${desde + PAGINA - 1}`,
      },
    })
    if (!res.ok) {
      const texto = await res.text()
      throw new Error(`HTTP ${res.status}: ${texto}`)
    }
    const pagina = await res.json()
    filas.push(...pagina)
    if (pagina.length < PAGINA) return filas
  }
}

async function exportarTabla({ tabla, excluir }) {
  try {
    const data = await fetchTabla(tabla)
    const limpio = data.map(row => {
      const r = { ...row }
      excluir.forEach(campo => delete r[campo])
      return r
    })
    fs.writeFileSync(path.join(dir, `${tabla}.json`), JSON.stringify(limpio, null, 2), 'utf8')
    return limpio.length
  } catch (err) {
    console.error(`  ⚠️  ${tabla}: ${err.message}`)
    return -1
  }
}

async function main() {
  console.log(`\n🗄️  Backup Fundación Neuquén Oeste — ${fecha}`)
  // Mostrar a qué proyecto apunta (la URL no es secreta, es pública/NEXT_PUBLIC).
  // Sirve para verificar que los secrets de GitHub apunten al proyecto correcto.
  console.log(`🔗  Proyecto: ${SUPABASE_URL}\n`)

  const resumen = { fecha, tablas: {}, totalRegistros: 0, generadoEn: new Date().toISOString() }
  let errores = 0

  for (const config of TABLAS) {
    process.stdout.write(`  → ${config.tabla.padEnd(22)}`)
    const n = await exportarTabla(config)
    if (n >= 0) {
      console.log(`${n} registros`)
      resumen.tablas[config.tabla] = n
      resumen.totalRegistros += n
    } else {
      console.log('⚠️  error (ver arriba)')
      resumen.tablas[config.tabla] = 'error'
      errores++
    }
  }

  fs.writeFileSync(path.join(dir, '_resumen.json'), JSON.stringify(resumen, null, 2), 'utf8')

  console.log(`\n${errores === 0 ? '✅' : '⚠️ '} Backup completo: ${resumen.totalRegistros} registros`)
  console.log(`📁  Guardado en: ${dir}/\n`)

  if (errores > 0) process.exit(1)
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message)
  process.exit(1)
})
