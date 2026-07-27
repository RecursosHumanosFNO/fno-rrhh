import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth/callback?code=xxx&next=/reset-password
// Supabase redirige aquí luego de enviar un email (reset de contraseña, etc.)
// Pasamos el code al cliente para que lo intercambie por sesión
// Solo aceptamos rutas internas. Un `next` que empiece con `//` o `/\` lo
// interpretan los navegadores como host externo, así que sería un redirect
// abierto: el atacante manda el link con el dominio del portal y termina
// llevando al usuario (y al code) a un sitio suyo.
function rutaInternaSegura(next: string | null): string {
  if (!next || !next.startsWith('/')) return '/dashboard'
  if (next.startsWith('//') || next.startsWith('/\\')) return '/dashboard'
  return next
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = rutaInternaSegura(req.nextUrl.searchParams.get('next'))
  const origin = req.nextUrl.origin

  if (code) {
    return NextResponse.redirect(`${origin}${next}?code=${encodeURIComponent(code)}`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
