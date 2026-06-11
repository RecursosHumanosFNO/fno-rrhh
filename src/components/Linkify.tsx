import React from 'react'

// Detecta URLs (http/https o www.) dentro de un texto
const URL_REGEX = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g

// Renderiza texto plano convirtiendo las URLs en links clickeables
export default function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_REGEX)
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null
        if (part.match(URL_REGEX)) {
          const href = part.startsWith('http') ? part : `https://${part}`
          return (
            <a
              key={i}
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
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}
