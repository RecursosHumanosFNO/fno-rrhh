// Dónde guarda Supabase la sesión, según "Recordar sesión".
//
// Antes la sesión SIEMPRE iba a localStorage y el "no recordar" se emulaba
// después: al arrancar, AuthContext miraba dos flags (uno en localStorage y otro
// en sessionStorage) y, si no cuadraban, llamaba a signOut(). Cualquier cosa que
// borrara el flag —storage bloqueado, una carrera al iniciar sesión, abrir el
// portal desde otra superficie— terminaba en un signOut() silencioso: la sesión
// seguía siendo válida, pero la app te mandaba de vuelta al login.
//
// Ahora la decisión se toma una sola vez, cuando se guarda el token:
//   - con "recordar"  → localStorage, sobrevive a cerrar el navegador
//   - sin "recordar"  → sessionStorage, se muere al cerrar la pestaña
// y nadie necesita desloguear a nadie para que se cumpla.

export const RECORDAR_KEY = 'fno_remember'

function quiereRecordar(): boolean {
  try {
    return localStorage.getItem(RECORDAR_KEY) === '1'
  } catch {
    return false
  }
}

export function marcarRecordar(recordar: boolean) {
  try {
    if (recordar) localStorage.setItem(RECORDAR_KEY, '1')
    else localStorage.removeItem(RECORDAR_KEY)
  } catch { /* storage bloqueado: la sesión durará lo que dure la pestaña */ }
}

// Adaptador de storage para supabase-js. Guarda con la misma clave de siempre,
// así que a quien ya está adentro con "recordar" no lo desloguea el cambio.
export const authStorage = {
  getItem(key: string): string | null {
    try {
      const deSesion = sessionStorage.getItem(key)
      if (deSesion !== null) return deSesion
      if (quiereRecordar()) return localStorage.getItem(key)
      // Sin "recordar" no debería quedar nada en localStorage: si quedó de antes
      // del cambio, se limpia una vez y la sesión no continúa.
      localStorage.removeItem(key)
      return null
    } catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    try {
      if (quiereRecordar()) {
        localStorage.setItem(key, value)
        sessionStorage.removeItem(key)
      } else {
        sessionStorage.setItem(key, value)
        localStorage.removeItem(key)
      }
    } catch { /* ignorar */ }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch { /* ignorar */ }
  },
}
