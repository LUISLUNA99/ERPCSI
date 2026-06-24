'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShieldX, Ban, Building2 } from 'lucide-react'
import { Suspense } from 'react'

const RAZONES: Record<string, { titulo: string; mensaje: string; icono: 'dominio' | 'inactivo' }> = {
  dominio: {
    titulo: 'Dominio no autorizado',
    mensaje: 'Tu cuenta de Microsoft no pertenece a Grupo CSI. Solo usuarios de buzzword.com.mx e inovitz.com pueden acceder.',
    icono: 'dominio',
  },
  inactivo: {
    titulo: 'Cuenta desactivada',
    mensaje: 'Tu cuenta esta desactivada. Contacta al administrador del sistema.',
    icono: 'inactivo',
  },
}

function SinPermisosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const razon = searchParams.get('razon')
  const info = razon ? RAZONES[razon] : null

  const titulo = info?.titulo || 'Sin permisos'
  const mensaje = info?.mensaje || 'No tienes permisos para acceder a esta seccion. Si crees que es un error, contacta al administrador del sistema.'

  const Icono = info?.icono === 'dominio' ? Building2 : info?.icono === 'inactivo' ? Ban : ShieldX
  const iconBg = info?.icono === 'dominio' ? 'bg-blue-100' : info?.icono === 'inactivo' ? 'bg-orange-100' : 'bg-red-100'
  const iconColor = info?.icono === 'dominio' ? 'text-blue-600' : info?.icono === 'inactivo' ? 'text-orange-600' : 'text-danger'

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className={`w-20 h-20 rounded-full ${iconBg} flex items-center justify-center mx-auto`}>
          <Icono className={`w-10 h-10 ${iconColor}`} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary-500">
            {titulo}
          </h1>
          <p className="text-muted-foreground">
            {mensaje}
          </p>
        </div>
        <Button
          onClick={() => router.push(razon ? '/login' : '/dashboard')}
          className="bg-primary-500 hover:bg-primary-600 text-white"
        >
          {razon ? 'Volver al login' : 'Volver al inicio'}
        </Button>
      </div>
    </div>
  )
}

export default function SinPermisosPage() {
  return (
    <Suspense>
      <SinPermisosContent />
    </Suspense>
  )
}
