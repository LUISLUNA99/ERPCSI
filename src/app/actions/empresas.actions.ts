'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const empresaSchema = z.object({
  codigo: z.string().min(1, 'El codigo es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  rfc: z.string().optional(),
})

export async function getEmpresas() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('codigo')
  if (error) throw error
  return data
}

export async function createEmpresa(formData: FormData) {
  const supabase = await createClient()
  const parsed = empresaSchema.safeParse({
    codigo: formData.get('codigo'),
    nombre: formData.get('nombre'),
    rfc: formData.get('rfc') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('empresas').insert(parsed.data)
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una empresa con ese codigo' }
    return { error: 'Error al crear la empresa' }
  }

  revalidatePath('/admin/catalogos/empresas')
  return { success: true }
}

export async function updateEmpresa(id: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = empresaSchema.safeParse({
    codigo: formData.get('codigo'),
    nombre: formData.get('nombre'),
    rfc: formData.get('rfc') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('empresas')
    .update(parsed.data)
    .eq('id', id)
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una empresa con ese codigo' }
    return { error: 'Error al actualizar la empresa' }
  }

  revalidatePath('/admin/catalogos/empresas')
  return { success: true }
}

export async function toggleEmpresa(id: string, activa: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({ activa })
    .eq('id', id)
  if (error) return { error: 'Error al actualizar el estatus' }

  revalidatePath('/admin/catalogos/empresas')
  return { success: true }
}
