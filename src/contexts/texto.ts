// Los sistemas de notificaciones cortan el texto por su cuenta y sin aviso;
// recortar acá deja el corte en un lugar prolijo en vez de a mitad de palabra.
const LARGO_PUSH = 140

export function recortar(texto: string, largo = LARGO_PUSH): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  if (limpio.length <= largo) return limpio
  const cortado = limpio.slice(0, largo)
  const ultimoEspacio = cortado.lastIndexOf(' ')
  return (ultimoEspacio > largo * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado) + '…'
}
