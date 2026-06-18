'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const errorParam = searchParams.get('error')
  const redirect = searchParams.get('redirect')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Correo o contrasena incorrectos. Verifica tus datos.')
        } else {
          setError('Ocurrio un error al iniciar sesion. Intenta de nuevo.')
        }
        return
      }

      // Verificar que el usuario tiene perfil activo
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol, activo, nombre')
        .single()

      if (!perfil || !perfil.activo) {
        await supabase.auth.signOut()
        setError('Tu cuenta esta desactivada. Contacta al administrador.')
        return
      }

      // Redirigir al dashboard o a la ruta solicitada
      router.push(redirect || '/dashboard')
      router.refresh()
    } catch {
      setError('Error de conexion. Verifica tu internet e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 px-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-accent-500/10" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent-500/5" />
      </div>

      <Card className="relative w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-6 pb-2 pt-8">
          {/* Logo / Icono institucional */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-primary-500">
                ERP CSI
              </h1>
              <p className="text-sm text-muted-foreground">
                Sistema de Cuentas por Pagar
              </p>
              <p className="text-xs text-muted-foreground">
                Grupo CSI
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-8 px-8">
          {/* Mensajes de error del sistema */}
          {errorParam === 'sin_acceso' && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              Tu cuenta no tiene acceso al sistema. Contacta al administrador.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electronico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@grupocsi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contrasena
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contrasena"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando sesion...
                </>
              ) : (
                'Iniciar sesion'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-accent-500 hover:text-accent-600 hover:underline transition-colors"
              onClick={() => {
                // TODO: Implementar recuperación de contraseña
                alert('Contacta al administrador para recuperar tu acceso.')
              }}
            >
              Olvide mi contrasena
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-white/60 text-xs">
        <p>Grupo CSI &copy; {new Date().getFullYear()}</p>
        <p className="mt-1 text-white/30">v1.0.0</p>
      </div>
    </div>
  )
}
