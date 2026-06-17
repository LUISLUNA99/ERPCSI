import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRequisicionById } from '@/app/actions/requisiciones.actions'
import { DetalleRequisicionClient } from './DetalleRequisicionClient'

export default async function DetalleRequisicionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const requisicion = await getRequisicionById(params.id)
  if (!requisicion) redirect('/requisiciones')

  const isOwner = requisicion.solicitante_id === user.id

  return (
    <DetalleRequisicionClient
      requisicion={requisicion}
      rol={perfil.rol}
      isOwner={isOwner}
      userId={user.id}
    />
  )
}
