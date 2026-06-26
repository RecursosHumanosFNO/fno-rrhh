'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 72   // px needed to trigger refresh
const MAX_PULL  = 100  // px max visual pull distance

export default function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Solo activar cuando la página está en el tope
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) { setPullDistance(0); return }
      // Resistencia: cuanto más se tira, más cuesta
      const resistance = Math.min(delta * 0.5, MAX_PULL)
      setPullDistance(resistance)
    }

    const onTouchEnd = () => {
      if (!pulling.current) return
      pulling.current = false
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true)
        setTimeout(() => window.location.reload(), 300)
      } else {
        setPullDistance(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDistance])

  if (pullDistance === 0 && !refreshing) return null

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const ready = pullDistance >= THRESHOLD

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-center pointer-events-none transition-transform"
      style={{ transform: `translateY(${refreshing ? 56 : pullDistance - 8}px)` }}
    >
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-colors ${
        ready || refreshing
          ? 'bg-brand-700 text-white'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
      }`}>
        <RefreshCw
          className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
        />
        <span>{refreshing ? 'Actualizando...' : ready ? 'Soltar para actualizar' : 'Deslizá para actualizar'}</span>
      </div>
    </div>
  )
}
