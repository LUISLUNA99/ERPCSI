import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { obtenerHistorial, obtenerKPIsHistorial } from '@/app/actions/sat/obtener-historial.actions'
import { HistorialSATClient } from './HistorialSATClient'

export default async function HistorialSATPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || !['admin', 'tesorero'].includes(perfil.rol)) redirect('/sin-permisos')

  const [historial, kpis] = await Promise.all([
    obtenerHistorial(),
    obtenerKPIsHistorial(),
  ])

  return <HistorialSATClient historial={historial as any} kpis={kpis as any} />
}
