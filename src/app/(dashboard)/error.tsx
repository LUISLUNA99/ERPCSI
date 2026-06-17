'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <AlertTriangle className="w-12 h-12 text-warning mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Algo salio mal</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        {error.message || 'Ocurrio un error inesperado. Por favor intenta de nuevo.'}
      </p>
      <Button onClick={() => reset()} className="bg-accent-500 hover:bg-accent-600 text-white">
        Intentar de nuevo
      </Button>
    </div>
  )
}
