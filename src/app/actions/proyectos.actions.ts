'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const proyectoSchema = z.object({
  empresa_id: z.string().min(1, 'La empresa es obligatoria'),
  cliente_id: z.string().min(1, 'El cliente es obligatorio'),
  centro_de_costo: z
    .string()
    .min(1, 'El centro de costo es obligatorio')
    .regex(/^\w+-\w+-\w+$/, 'Formato invalido. Usa XX-XX-XX'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
})

export async function getProyectos() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proyectos')
    .select('*, empresas(nombre, codigo), clientes(nombre, codigo)')
    .order('centro_de_costo')
  if (error) throw error
  return data
}

export async function getClientes(empresaId?: string) {
  const supabase = await createClient()
  let query = supabase.from('clientes').select('*').order('codigo')
  if (empresaId) query = query.eq('empresa_id', empresaId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createCliente(formData: FormData) {
  const supabase = await createClient()
  const data = {
    empresa_id: formData.get('empresa_id') as string,
    codigo: formData.get('codigo') as string,
    nombre: formData.get('nombre') as string,
  }

  if (!data.empresa_id || !data.codigo || !data.nombre) {
    return { error: 'Todos los campos son obligatorios' }
  }

  const { error } = await supabase.from('clientes').insert(data)
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un cliente con ese codigo para esta empresa' }
    return { error: 'Error al crear el cliente' }
  }

  revalidatePath('/admin/catalogos/proyectos')
  return { success: true }
}

export async function createProyecto(formData: FormData) {
  const supabase = await createClient()
  const parsed = proyectoSchema.safeParse({
    empresa_id: formData.get('empresa_id'),
    cliente_id: formData.get('cliente_id'),
    centro_de_costo: formData.get('centro_de_costo'),
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('proyectos').insert(parsed.data)
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un proyecto con ese centro de costo' }
    return { error: 'Error al crear el proyecto' }
  }

  revalidatePath('/admin/catalogos/proyectos')
  return { success: true }
}

export async function updateProyecto(id: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = proyectoSchema.safeParse({
    empresa_id: formData.get('empresa_id'),
    cliente_id: formData.get('cliente_id'),
    centro_de_costo: formData.get('centro_de_costo'),
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('proyectos').update(parsed.data).eq('id', id)
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un proyecto con ese centro de costo' }
    return { error: 'Error al actualizar' }
  }

  revalidatePath('/admin/catalogos/proyectos')
  return { success: true }
}

export async function toggleProyecto(id: string, activo: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('proyectos').update({ activo }).eq('id', id)
  if (error) return { error: 'Error al actualizar el estatus' }

  revalidatePath('/admin/catalogos/proyectos')
  return { success: true }
}
