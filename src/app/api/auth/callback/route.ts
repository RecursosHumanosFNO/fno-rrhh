import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth/callback?code=xxx&next=/reset-password
// Supabase redirige aquí luego de enviar un email (reset de contraseña, etc.)
// Pasamos el code al cliente para que lo intercambie por sesión
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = req.nextUrl.searchParams.get('next') ?? '/dashboard'
  const origin = req.nextUrl.origin

  if (code) {
    return NextResponse.redirect(`${origin}${next}?code=${encodeURIComponent(code)}`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
