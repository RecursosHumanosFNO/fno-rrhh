// Destinos válidos para una notificación push.
//
// Antes el formulario pedía la URL escrita a mano y era muy fácil errarle: si
// alguien ponía "/comunicaciones" en vez de "/dashboard/comunicaciones", la push
// abría un 404 del que encima no se podía volver atrás (la abre el service
// worker en una pestaña nueva, sin historial). Ahora se elige de una lista, y la
// ruta valida contra esta misma lista para que no entre nada raro.
export const DESTINOS_PUSH = [
  { url: '/dashboard', label: 'Inicio' },
  { url: '/dashboard/art', label: 'ART · Emergencias' },
  { url: '/dashboard/comunicaciones', label: 'Comunicaciones' },
  { url: '/dashboard/eventos', label: 'Calendario' },
  { url: '/dashboard/recibos', label: 'Recibos de sueldo' },
  { url: '/dashboard/solicitudes', label: 'Solicitudes y pedidos' },
  { url: '/dashboard/portal-rrhh', label: 'Portal RRHH' },
  { url: '/dashboard/fundacion', label: 'La Fundación' },
  { url: '/dashboard/perfil', label: 'Mi perfil' },
  { url: '/dashboard/instructivo', label: 'Instructivo' },
] as const

export const DESTINO_PUSH_POR_DEFECTO = '/dashboard'

// Un evento del calendario se puede linkear directo: /dashboard/eventos?ev=<id>.
// El id se limita a letras, números, guiones y guiones bajos — es lo que genera
// uid() — para que por acá no entre nada más que eso.
const DEEP_LINK = /^(\/dashboard\/[a-z-]+)\?ev=[A-Za-z0-9_-]{1,64}$/

export function esDestinoPushValido(url: unknown): url is string {
  if (typeof url !== 'string') return false
  if (DESTINOS_PUSH.some(d => d.url === url)) return true
  const m = DEEP_LINK.exec(url)
  return !!m && DESTINOS_PUSH.some(d => d.url === m[1])
}
