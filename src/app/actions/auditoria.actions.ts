'use server'

import { createClient } from '@/lib/supabase/server'

export async function getBitacora(filtros?: {
  fechaDesde?: string
  fechaHasta?: string
  usuarioId?: string
  modulo?: string
  accion?: string
  resultado?: string
  busqueda?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('bitacora')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (filtros?.fechaDesde) {
    query = query.gte('created_at', `${filtros.fechaDesde}T00:00:00`)
  }
  if (filtros?.fechaHasta) {
    query = query.lte('created_at', `${filtros.fechaHasta}T23:59:59`)
  }
  if (filtros?.usuarioId) {
    query = query.eq('usuario_id', filtros.usuarioId)
  }
  if (filtros?.modulo) {
    query = query.eq('modulo', filtros.modulo)
  }
  if (filtros?.accion) {
    query = query.eq('accion', filtros.accion)
  }
  if (filtros?.resultado) {
    query = query.eq('resultado', filtros.resultado)
  }
  if (filtros?.busqueda) {
    query = query.or(`descripcion.ilike.%${filtros.busqueda}%,entidad_descripcion.ilike.%${filtros.busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getUsuariosParaFiltro() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfiles')
    .select('id, nombre, email')
    .order('nombre')
  return data || []
}
