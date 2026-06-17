'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const bancoSchema = z.object({
  empresa_id: z.string().min(1, 'La empresa es obligatoria'),
  banco: z.string().min(1, 'El banco es obligatorio'),
  numero_cuenta: z.string().optional(),
  clabe: z.string().optional(),
  moneda: z.enum(['MXN', 'USD', 'EUR']).default('MXN'),
})

export async function getBancos() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bancos_empresa')
    .select('*, empresas(nombre, codigo)')
    .order('banco')
  if (error) throw error
  return data
}

export async function createBanco(formData: FormData) {
  const supabase = await createClient()
  const parsed = bancoSchema.safeParse({
    empresa_id: formData.get('empresa_id'),
    banco: formData.get('banco'),
    numero_cuenta: formData.get('numero_cuenta') || undefined,
    clabe: formData.get('clabe') || undefined,
    moneda: formData.get('moneda') || 'MXN',
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('bancos_empresa').insert(parsed.data)
  if (error) return { error: 'Error al crear la cuenta bancaria' }

  revalidatePath('/admin/catalogos/bancos')
  return { success: true }
}

export async function updateBanco(id: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = bancoSchema.safeParse({
    empresa_id: formData.get('empresa_id'),
    banco: formData.get('banco'),
    numero_cuenta: formData.get('numero_cuenta') || undefined,
    clabe: formData.get('clabe') || undefined,
    moneda: formData.get('moneda') || 'MXN',
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('bancos_empresa').update(parsed.data).eq('id', id)
  if (error) return { error: 'Error al actualizar' }

  revalidatePath('/admin/catalogos/bancos')
  return { success: true }
}

export async function toggleBanco(id: string, activo: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('bancos_empresa').update({ activo }).eq('id', id)
  if (error) return { error: 'Error al actualizar el estatus' }

  revalidatePath('/admin/catalogos/bancos')
  return { success: true }
}
