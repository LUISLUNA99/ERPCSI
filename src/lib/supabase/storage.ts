import { SupabaseClient } from '@supabase/supabase-js'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'text/xml', 'application/xml']
const ALLOWED_EXTENSIONS = ['.pdf', '.xml']

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'El archivo no puede superar 10MB'
  }

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Solo se permiten archivos PDF y XML'
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.xml') && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Tipo de archivo no permitido'
  }

  return null
}

export async function uploadFactura(
  supabase: SupabaseClient,
  file: File,
  requisicionId: string,
  empresaId?: string
): Promise<{ url: string; nombre: string } | { error: string }> {
  const validationError = validateFile(file)
  if (validationError) return { error: validationError }

  const ext = file.name.split('.').pop()?.toLowerCase()
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = empresaId ? `${empresaId}/${year}/${month}` : 'general'
  const fileName = `${prefix}/${requisicionId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('facturas')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) return { error: 'Error al subir el archivo: ' + error.message }

  const { data: urlData } = await supabase.storage
    .from('facturas')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 year

  if (!urlData?.signedUrl) {
    // Fallback to public URL if signed URL fails
    const { data: publicData } = supabase.storage.from('facturas').getPublicUrl(fileName)
    return { url: publicData.publicUrl, nombre: file.name }
  }

  return { url: urlData.signedUrl, nombre: file.name }
}

export async function uploadComprobante(
  supabase: SupabaseClient,
  file: File,
  requisicionId: string,
  empresaId?: string
): Promise<{ url: string; nombre: string } | { error: string }> {
  const validationError = validateFile(file)
  if (validationError) return { error: validationError }

  const ext = file.name.split('.').pop()?.toLowerCase()
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = empresaId ? `${empresaId}/${year}/${month}` : 'general'
  const fileName = `${prefix}/${requisicionId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('comprobantes')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) return { error: 'Error al subir el archivo: ' + error.message }

  const { data: urlData } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 year

  if (!urlData?.signedUrl) {
    const { data: publicData } = supabase.storage.from('comprobantes').getPublicUrl(fileName)
    return { url: publicData.publicUrl, nombre: file.name }
  }

  return { url: urlData.signedUrl, nombre: file.name }
}
