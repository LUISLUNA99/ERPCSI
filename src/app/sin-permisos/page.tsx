'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShieldX } from 'lucide-react'

export default function SinPermisosPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <ShieldX className="w-10 h-10 text-danger" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary-500">
            Sin permisos
          </h1>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta seccion. Si crees que es un
            error, contacta al administrador del sistema.
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard')}
          className="bg-primary-500 hover:bg-primary-600 text-white"
        >
          Volver al inicio
        </Button>
      </div>
    </div>
  )
}
