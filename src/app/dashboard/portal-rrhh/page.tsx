'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PortalRRHHRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/solicitudes?tab=pedidos')
  }, [router])
  return null
}
