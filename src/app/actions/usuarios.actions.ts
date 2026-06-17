'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  rol: z.enum(['admin', 'director', 'tesorero', 'operario', 'visualizador']),
  empresa_id: z.string().optional(),
})

const updateUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  rol: z.enum(['admin', 'director', 'tesorero', 'operario', 'visualizador']),
  empresa_id: z.string().optional(),
})

export async function getUsuarios() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, empresas(nombre, codigo)')
    .order('nombre')
  if (error) throw error
  return data
}

export async function createUsuario(formData: FormData) {
  const parsed = createUserSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    nombre: formData.get('nombre'),
    rol: formData.get('rol'),
    empresa_id: formData.get('empresa_id') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const serviceClient = await createServiceClient()

    // Crear usuario en auth
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { nombre: parsed.data.nombre },
    })

    if (authError) {
      if (authError.message.includes('already')) return { error: 'Ya existe un usuario con ese email' }
      return { error: 'Error al crear el usuario: ' + authError.message }
    }

    // Crear perfil
    const { error: perfilError } = await serviceClient
      .from('perfiles')
      .insert({
        id: authData.user.id,
        email: parsed.data.email,
        nombre: parsed.data.nombre,
        rol: parsed.data.rol,
        empresa_id: parsed.data.empresa_id || null,
        activo: true,
      })

    if (perfilError) return { error: 'Usuario creado pero error al crear perfil: ' + perfilError.message }

    revalidatePath('/admin/usuarios')
    return { success: true }
  } catch {
    return { error: 'Error de conexion al crear usuario' }
  }
}

export async function updateUsuario(id: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = updateUserSchema.safeParse({
    nombre: formData.get('nombre'),
    rol: formData.get('rol'),
    empresa_id: formData.get('empresa_id') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('perfiles')
    .update({
      nombre: parsed.data.nombre,
      rol: parsed.data.rol,
      empresa_id: parsed.data.empresa_id || null,
    })
    .eq('id', id)

  if (error) return { error: 'Error al actualizar el usuario' }

  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function toggleUsuario(id: string, activo: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('perfiles').update({ activo }).eq('id', id)
  if (error) return { error: 'Error al actualizar el estatus' }

  revalidatePath('/admin/usuarios')
  return { success: true }
}
