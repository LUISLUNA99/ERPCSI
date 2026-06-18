import { getBitacora, getUsuariosParaFiltro } from '@/app/actions/auditoria.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuditoriaClient } from './AuditoriaClient'

export default async function AuditoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'admin') redirect('/sin-permisos')

  const [bitacora, usuarios] = await Promise.all([
    getBitacora(),
    getUsuariosParaFiltro(),
  ])

  return <AuditoriaClient bitacora={bitacora as any} usuarios={usuarios} />
}
