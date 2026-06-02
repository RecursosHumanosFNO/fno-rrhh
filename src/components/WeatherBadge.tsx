'use client'

import { useEffect, useState } from 'react'
import {
  Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain,
  CloudDrizzle, CloudSnow, CloudLightning, CloudFog,
} from 'lucide-react'

// Neuquén Capital (aprox. barrio Unión de Mayo)
const LAT = -38.9516
const LON = -68.0591

// Mapea el código WMO + día/noche a un ícono y su color real
function weatherFor(code: number, isDay: boolean): { Icon: React.ElementType; color: string } {
  if (code === 0) return { Icon: isDay ? Sun : Moon, color: isDay ? 'text-yellow-400' : 'text-indigo-200' }
  if (code === 1 || code === 2) return { Icon: isDay ? CloudSun : CloudMoon, color: isDay ? 'text-amber-300' : 'text-slate-300' }
  if (code === 3) return { Icon: Cloud, color: 'text-gray-300' }
  if (code === 45 || code === 48) return { Icon: CloudFog, color: 'text-gray-400' }
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, color: 'text-sky-300' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, color: 'text-blue-400' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: CloudSnow, color: 'text-cyan-200' }
  if (code >= 95) return { Icon: CloudLightning, color: 'text-yellow-300' }
  return { Icon: Cloud, color: 'text-gray-300' }
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
  const { Icon, color } = weatherFor(data.code, data.isDay)

  return (
    <div className={className} title="Clima actual en Neuquén">
      <div className="flex items-center gap-2.5">
        <Icon className={`w-11 h-11 ${color} drop-shadow`} />
        <span className="text-4xl font-bold text-white leading-none">{data.temp}°</span>
      </div>
      <p className="text-xs text-white/75 mt-1.5">📍 Neuquén, Argentina</p>
    </div>
  )
}
