'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

interface RegistrarAccionParams {
  usuarioId?: string
  accion: string
  modulo: string
  descripcion: string
  entidadTipo?: string
  entidadId?: string
  entidadDescripcion?: string
  datosAnteriores?: Record<string, unknown>
  datosNuevos?: Record<string, unknown>
  resultado?: 'exitoso' | 'fallido' | 'parcial'
  metadata?: Record<string, unknown>
}

export async function registrarAccion(params: RegistrarAccionParams) {
  try {
    const supabase = await createClient()

    // Obtener info del usuario si no se proporciona
    let usuarioId = params.usuarioId
    let usuarioNombre = ''
    let usuarioEmail = ''
    let usuarioRol = ''

    if (!usuarioId) {
      const { data: { user } } = await supabase.auth.getUser()
      usuarioId = user?.id
    }

    if (usuarioId) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre, email, rol')
        .eq('id', usuarioId)
        .single()
      if (perfil) {
        usuarioNombre = perfil.nombre
        usuarioEmail = perfil.email
        usuarioRol = perfil.rol
      }
    }

    // Obtener IP y User-Agent de los headers
    let ipAddress = ''
    let userAgent = ''
    try {
      const hdrs = await headers()
      ipAddress = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || ''
      userAgent = hdrs.get('user-agent') || ''
    } catch {
      // headers() puede fallar en ciertos contextos
    }

    await supabase.from('bitacora').insert({
      usuario_id: usuarioId || null,
      usuario_nombre: usuarioNombre,
      usuario_email: usuarioEmail,
      usuario_rol: usuarioRol,
      accion: params.accion,
      modulo: params.modulo,
      descripcion: params.descripcion,
      entidad_tipo: params.entidadTipo || null,
      entidad_id: params.entidadId || null,
      entidad_descripcion: params.entidadDescripcion || null,
      datos_anteriores: params.datosAnteriores || null,
      datos_nuevos: params.datosNuevos || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      resultado: params.resultado || 'exitoso',
      metadata: params.metadata || null,
    })
  } catch (err) {
    // Nunca debe fallar la accion principal por un error de auditoria
    console.error('[AUDITORIA ERROR]', err)
  }
}
