import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRequisiciones } from '@/app/actions/requisiciones.actions'
import { RequisicionesClient } from './RequisicionesClient'

export default async function RequisicionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // Operario solo ve las suyas, los demas ven todas
  const filters = perfil.rol === 'operario'
    ? { solicitante_id: user.id }
    : undefined

  const requisiciones = await getRequisiciones(filters)

  const canCreate = ['admin', 'director', 'tesorero', 'operario'].includes(perfil.rol)

  return (
    <RequisicionesClient
      requisiciones={requisiciones}
      rol={perfil.rol}
      canCreate={canCreate}
    />
  )
}
