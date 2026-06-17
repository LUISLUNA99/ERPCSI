'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getNotificaciones() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const hace30dias = new Date()
  hace30dias.setDate(hace30dias.getDate() - 30)

  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', user.id)
    .gte('created_at', hace30dias.toISOString())
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function marcarLeida(id: string) {
  const supabase = await createClient()
  await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
  revalidatePath('/notificaciones')
}

export async function marcarTodasLeidas() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', user.id)
    .eq('leida', false)

  revalidatePath('/notificaciones')
}
