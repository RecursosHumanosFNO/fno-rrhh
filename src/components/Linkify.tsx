import React from 'react'

// Detecta URLs (http/https o www.) dentro de un texto
const URL_REGEX = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g

// Renderiza texto plano convirtiendo las URLs en links clickeables.
//
// El textarea donde se escribe la descripción guarda los saltos de línea tal
// cual ('\n'), pero HTML los ignora salvo que el contenedor tenga
// white-space: pre-wrap — algo que no todos los lugares donde se usa este
// componente pueden garantizar. Por eso los saltos se resuelven acá adentro,
// como <br />, en vez de depender de una clase en cada lugar que lo use.
export default function Linkify({ text }: { text: string }) {
  const lineas = text.split('\n')
  return (
    <>
      {lineas.map((linea, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {linea.split(URL_REGEX).map((part, j) => {
            if (!part) return null
            if (part.match(URL_REGEX)) {
              const href = part.startsWith('http') ? part : `https://${part}`
              return (
                <a
                  key={j}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-brand-600 dark:text-brand-400 underline underline-offset-2 hover:text-brand-800 dark:hover:text-brand-300 break-all font-medium"
                >
                  {part}
                </a>
              )
            }
            return <React.Fragment key={j}>{part}</React.Fragment>
          })}
        </React.Fragment>
      ))}
    </>
  )
}
