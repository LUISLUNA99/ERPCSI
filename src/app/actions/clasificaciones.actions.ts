'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
})

export async function getClasificaciones() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clasificaciones_gasto')
    .select('*')
    .order('orden')
  if (error) throw error
  return data
}

export async function createClasificacion(formData: FormData) {
  const supabase = await createClient()
  const parsed = schema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('clasificaciones_gasto').insert(parsed.data)
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una clasificacion con ese nombre' }
    return { error: 'Error al crear la clasificacion' }
  }

  revalidatePath('/admin/catalogos/clasificaciones')
  return { success: true }
}

export async function updateClasificacion(id: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = schema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('clasificaciones_gasto').update(parsed.data).eq('id', id)
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una clasificacion con ese nombre' }
    return { error: 'Error al actualizar' }
  }

  revalidatePath('/admin/catalogos/clasificaciones')
  return { success: true }
}

export async function toggleClasificacion(id: string, activa: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('clasificaciones_gasto').update({ activa }).eq('id', id)
  if (error) return { error: 'Error al actualizar el estatus' }

  revalidatePath('/admin/catalogos/clasificaciones')
  return { success: true }
}
