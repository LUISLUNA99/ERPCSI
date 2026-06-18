'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { registrarAccion } from '@/lib/auditoria'

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
  await registrarAccion({ accion: 'crear', modulo: 'catalogos', descripcion: `Empresa ${parsed.data.codigo} - ${parsed.data.nombre} creada`, entidadTipo: 'empresa', entidadDescripcion: parsed.data.codigo })
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
  await registrarAccion({ accion: 'editar', modulo: 'catalogos', descripcion: `Empresa ${parsed.data.codigo} actualizada`, entidadTipo: 'empresa', entidadId: id, entidadDescripcion: parsed.data.codigo })
  return { success: true }
}

// ─── SAT CONFIG ──────────────────────────────────────────

const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/

export async function guardarConfigSAT(empresaId: string, formData: FormData) {
  const supabase = await createClient()

  const rfc = (formData.get('rfc') as string)?.trim().toUpperCase()
  const satPassword = formData.get('sat_password') as string
  const certFile = formData.get('cert_file') as File | null
  const keyFile = formData.get('key_file') as File | null

  if (!rfc) return { error: 'El RFC es obligatorio' }
  if (!RFC_REGEX.test(rfc)) return { error: 'Formato de RFC invalido' }
  if (!satPassword) return { error: 'La contrasena de la clave privada es obligatoria' }

  // Get current state for audit
  const { data: empresa } = await supabase
    .from('empresas')
    .select('codigo, nombre, sat_configurado')
    .eq('id', empresaId)
    .single()
  if (!empresa) return { error: 'Empresa no encontrada' }

  const updateData: Record<string, unknown> = { rfc, sat_configurado: true }

  // Encrypt password
  const { encrypt } = await import('@/lib/crypto')
  updateData.sat_password_encrypted = encrypt(satPassword)

  // Upload .cer file
  if (certFile && certFile.size > 0) {
    if (!certFile.name.endsWith('.cer')) return { error: 'El archivo de certificado debe ser .cer' }
    if (certFile.size > 5 * 1024 * 1024) return { error: 'El archivo .cer no debe superar 5MB' }

    const certPath = `${empresaId}/cert_${Date.now()}.cer`
    const { error: uploadErr } = await supabase.storage
      .from('sat-certs')
      .upload(certPath, certFile, { upsert: true })
    if (uploadErr) return { error: 'Error al subir certificado: ' + uploadErr.message }
    updateData.sat_cert_url = certPath
  }

  // Upload .key file
  if (keyFile && keyFile.size > 0) {
    if (!keyFile.name.endsWith('.key')) return { error: 'El archivo de clave privada debe ser .key' }
    if (keyFile.size > 5 * 1024 * 1024) return { error: 'El archivo .key no debe superar 5MB' }

    const keyPath = `${empresaId}/key_${Date.now()}.key`
    const { error: uploadErr } = await supabase.storage
      .from('sat-certs')
      .upload(keyPath, keyFile, { upsert: true })
    if (uploadErr) return { error: 'Error al subir clave privada: ' + uploadErr.message }
    updateData.sat_key_url = keyPath
  }

  // For first-time setup, both files are required
  const { data: current } = await supabase
    .from('empresas')
    .select('sat_cert_url, sat_key_url')
    .eq('id', empresaId)
    .single()

  if (!current?.sat_cert_url && !updateData.sat_cert_url) {
    return { error: 'El archivo de certificado (.cer) es obligatorio' }
  }
  if (!current?.sat_key_url && !updateData.sat_key_url) {
    return { error: 'El archivo de clave privada (.key) es obligatorio' }
  }

  const { error } = await supabase
    .from('empresas')
    .update(updateData)
    .eq('id', empresaId)
  if (error) return { error: 'Error al guardar configuracion SAT' }

  revalidatePath('/admin/catalogos/empresas')
  await registrarAccion({
    accion: empresa.sat_configurado ? 'actualizar_sat' : 'configurar_sat',
    modulo: 'catalogos',
    descripcion: `e.firma SAT ${empresa.sat_configurado ? 'actualizada' : 'configurada'} para ${empresa.codigo} - ${empresa.nombre}`,
    entidadTipo: 'empresa',
    entidadId: empresaId,
    entidadDescripcion: empresa.codigo,
    datosNuevos: { rfc, certActualizado: !!certFile?.size, keyActualizado: !!keyFile?.size },
  })
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
  await registrarAccion({ accion: activa ? 'activar' : 'desactivar', modulo: 'catalogos', descripcion: `Empresa ${activa ? 'activada' : 'desactivada'}`, entidadTipo: 'empresa', entidadId: id })
  return { success: true }
}
