'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Building2, Clock, Loader2, LogOut, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

export default function AccesoPendientePage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')
      setNombre(
        user.user_metadata?.full_name
        || user.user_metadata?.name
        || user.email || ''
      )
    }
    loadUser()
  }, [router])

  async function handleRetry() {
    setChecking(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol, activo')
        .eq('id', user.id)
        .single()

      if (perfil && perfil.activo && perfil.rol !== 'pendiente') {
        router.push('/dashboard')
        router.refresh()
      } else {
        setMessage('Tu acceso aun esta en revision. Intenta mas tarde.')
      }
    } catch {
      setMessage('Error al verificar. Intenta de nuevo.')
    } finally {
      setChecking(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-accent-500/10" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent-500/5" />
      </div>

      <Card className="relative w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-6 pb-2 pt-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-primary-500">
                ERP CSI
              </h1>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-8 px-8">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Acceso en revision
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hola <span className="font-medium text-gray-700">{nombre || '...'}</span>, tu cuenta de Microsoft fue reconocida correctamente. Un administrador del sistema revisara tu solicitud y te asignara los permisos correspondientes.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Recibiras una notificacion cuando tu acceso este listo. Si tienes urgencia contacta a tu administrador.
              </p>
            </div>

            {email && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-muted-foreground">
                Conectado como <span className="font-medium text-gray-700">{email}</span>
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                {message}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                disabled={checking}
                className="w-full h-10 bg-accent-500 hover:bg-accent-600 text-white"
              >
                {checking ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Reintentar
              </Button>

              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full h-10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesion
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="absolute bottom-6 text-center text-white/60 text-xs">
        <p>Grupo CSI &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
