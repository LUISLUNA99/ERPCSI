import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SATClient } from './SATClient'

export default async function SATPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || !['admin', 'tesorero'].includes(perfil.rol)) redirect('/sin-permisos')

  // Get empresas with SAT configured
  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, codigo, nombre, sat_configurado')
    .eq('activa', true)
    .order('codigo')

  return <SATClient empresas={empresas || []} />
}
