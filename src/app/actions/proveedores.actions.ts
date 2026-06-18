'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { registrarAccion } from '@/lib/auditoria'

const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  rfc: z.string().optional(),
  banco: z.string().optional(),
  clabe: z.string().optional(),
  cuenta: z.string().optional(),
  contacto_nombre: z.string().optional(),
  contacto_email: z.string().optional(),
})

export async function getProveedores() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data
}

export async function createProveedor(formData: FormData) {
  const supabase = await createClient()
  const parsed = proveedorSchema.safeParse({
    nombre: formData.get('nombre'),
    rfc: formData.get('rfc') || undefined,
    banco: formData.get('banco') || undefined,
    clabe: formData.get('clabe') || undefined,
    cuenta: formData.get('cuenta') || undefined,
    contacto_nombre: formData.get('contacto_nombre') || undefined,
    contacto_email: formData.get('contacto_email') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('proveedores').insert(parsed.data)
  if (error) return { error: 'Error al crear el proveedor' }

  revalidatePath('/admin/catalogos/proveedores')
  await registrarAccion({ accion: 'crear', modulo: 'catalogos', descripcion: `Proveedor ${parsed.data.nombre} creado`, entidadTipo: 'proveedor', entidadDescripcion: parsed.data.nombre })
  return { success: true }
}

export async function updateProveedor(id: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = proveedorSchema.safeParse({
    nombre: formData.get('nombre'),
    rfc: formData.get('rfc') || undefined,
    banco: formData.get('banco') || undefined,
    clabe: formData.get('clabe') || undefined,
    cuenta: formData.get('cuenta') || undefined,
    contacto_nombre: formData.get('contacto_nombre') || undefined,
    contacto_email: formData.get('contacto_email') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('proveedores')
    .update(parsed.data)
    .eq('id', id)
  if (error) return { error: 'Error al actualizar el proveedor' }

  revalidatePath('/admin/catalogos/proveedores')
  await registrarAccion({ accion: 'editar', modulo: 'catalogos', descripcion: `Proveedor ${parsed.data.nombre} actualizado`, entidadTipo: 'proveedor', entidadId: id, entidadDescripcion: parsed.data.nombre })
  return { success: true }
}

export async function toggleProveedor(id: string, activo: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('proveedores').update({ activo }).eq('id', id)
  if (error) return { error: 'Error al actualizar el estatus' }

  revalidatePath('/admin/catalogos/proveedores')
  await registrarAccion({ accion: activo ? 'activar' : 'desactivar', modulo: 'catalogos', descripcion: `Proveedor ${activo ? 'activado' : 'desactivado'}`, entidadTipo: 'proveedor', entidadId: id })
  return { success: true }
}
