'use server'

import { createClient } from '@/lib/supabase/server'
import { registrarAccion } from '@/lib/auditoria'
import { revalidatePath } from 'next/cache'

interface FiltrosSolicitudes {
  empresaId?: string
  tipo?: 'emitidas' | 'recibidas'
  estatus?: string
  mesPeriodo?: string
}

export async function obtenerSolicitudes(filtros?: FiltrosSolicitudes) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('sat_solicitudes')
    .select(`
      *,
      empresas:empresa_id(codigo, nombre),
      perfiles:solicitado_por_id(nombre)
    `)
    .order('created_at', { ascending: false })

  if (filtros?.empresaId) {
    query = query.eq('empresa_id', filtros.empresaId)
  }

  if (filtros?.tipo) {
    query = query.eq('tipo', filtros.tipo)
  }

  if (filtros?.estatus) {
    query = query.eq('estatus', filtros.estatus)
  }

  if (filtros?.mesPeriodo) {
    const [mes, anioStr] = filtros.mesPeriodo.split('-')
    const anio = parseInt(anioStr, 10)
    query = query.eq('mes_periodo', mes).eq('anio_periodo', anio)
  }

  const { data, error } = await query

  if (error) {
    console.error('[SAT] Error al obtener solicitudes:', error)
    return []
  }

  return data
}

export async function obtenerSolicitudesActivas(empresaId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('sat_solicitudes')
    .select(`
      *,
      empresas:empresa_id(codigo, nombre),
      perfiles:solicitado_por_id(nombre)
    `)
    .in('estatus', ['pendiente', 'verificando', 'lista', 'descargando'])
    .order('created_at', { ascending: false })

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[SAT] Error al obtener solicitudes activas:', error)
    return []
  }

  return data
}

export async function reintentarSolicitud(solicitudId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que la solicitud existe y esta en error
  const { data: solicitud, error: fetchError } = await supabase
    .from('sat_solicitudes')
    .select('id, estatus, id_solicitud_sat, tipo, mes_periodo, anio_periodo')
    .eq('id', solicitudId)
    .single()

  if (fetchError || !solicitud) {
    return { error: 'Solicitud no encontrada' }
  }

  if (solicitud.estatus !== 'error') {
    return { error: 'Solo se pueden reintentar solicitudes con estatus de error' }
  }

  const { error: updateError } = await supabase
    .from('sat_solicitudes')
    .update({
      estatus: 'pendiente',
      mensaje_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitudId)

  if (updateError) {
    return { error: 'Error al actualizar la solicitud' }
  }

  await registrarAccion({
    accion: 'reintentar_solicitud_sat',
    modulo: 'sat',
    descripcion: `Reintento de solicitud SAT: ${solicitud.id_solicitud_sat || solicitudId}`,
    entidadTipo: 'sat_solicitud',
    entidadId: solicitudId,
    entidadDescripcion: solicitud.id_solicitud_sat,
    datosNuevos: {
      tipo: solicitud.tipo,
      mesPeriodo: solicitud.mes_periodo ? `${solicitud.mes_periodo}-${solicitud.anio_periodo}` : null,
    },
  })

  revalidatePath('/conciliacion/sat')
  return { success: true }
}
