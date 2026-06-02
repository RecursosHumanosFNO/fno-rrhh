'use client'

import { useEffect, useState } from 'react'
import {
  Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain,
  CloudDrizzle, CloudSnow, CloudLightning, CloudFog,
} from 'lucide-react'

// Neuquén Capital (aprox. barrio Unión de Mayo)
const LAT = -38.9516
const LON = -68.0591

// Mapea el código WMO de Open-Meteo + día/noche a un ícono de lucide
function iconFor(code: number, isDay: boolean) {
  if (code === 0) return isDay ? Sun : Moon                         // despejado
  if (code === 1 || code === 2) return isDay ? CloudSun : CloudMoon // parcialmente nublado
  if (code === 3) return Cloud                                      // nublado
  if (code === 45 || code === 48) return CloudFog                   // niebla
  if (code >= 51 && code <= 57) return CloudDrizzle                 // llovizna
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain   // lluvia
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow   // nieve
  if (code >= 95) return CloudLightning                             // tormenta
  return Cloud
}

interface WeatherData { temp: number; code: number; isDay: boolean }

export default function WeatherBadge({ className }: { className?: string }) {
  const [data, setData] = useState<WeatherData | null>(null)

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,is_day&timezone=auto`
    let cancelled = false
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d?.current) return
        setData({
          temp: Math.round(d.current.temperature_2m),
          code: d.current.weather_code,
          isDay: d.current.is_day === 1,
        })
      })
      .catch(() => { /* clima no disponible — no rompe nada */ })
    return () => { cancelled = true }
  }, [])

  if (!data) return null
  const Icon = iconFor(data.code, data.isDay)

  return (
    <span className={className} title="Clima actual en Neuquén">
      <Icon className="w-5 h-5" />
      <span>{data.temp}°</span>
    </span>
  )
}
