import Link from 'next/link'

// Una push (o cualquier link viejo) se abre en una pestaña nueva del service
// worker: no hay historial, así que si la ruta no existe el 404 queda sin
// salida. Esta pantalla siempre ofrece la vuelta al inicio.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <div className="text-center max-w-sm">
        <p className="text-5xl font-bold text-slate-300 dark:text-slate-700">404</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-800 dark:text-slate-100">
          No encontramos esa página
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Puede que el enlace esté mal escrito o que la sección haya cambiado de lugar.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-6 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
