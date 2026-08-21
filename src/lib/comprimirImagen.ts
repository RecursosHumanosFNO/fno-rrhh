// Comprime y redimensiona una imagen en el navegador antes de subirla, con
// <canvas>: mismo mecanismo que ya usa la foto de perfil. Sirve para las
// fotos que salen directo de la cámara del celular (varios MB, resolución de
// sobra para una miniatura) — sin esto, una foto de un certificado podía
// superar el límite de tamaño del bucket y la subida fallaba sin mayor
// explicación que "no se pudo subir la imagen".
//
// Devuelve un Blob JPEG. El GIF queda afuera a propósito: pasarlo por canvas
// lo aplana a un solo frame y le rompe la animación.
export function comprimirImagen(file: File, maxLado: number, calidad = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = e => {
      const img = new Image()
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const w = Math.round(img.width * escala)
        const h = Math.round(img.height * escala)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas no disponible')); return }
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen')), 'image/jpeg', calidad)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}
