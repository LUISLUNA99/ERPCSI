'use server'

import { createClient } from '@/lib/supabase/server'

export async function obtenerHistorial(filtros?: {
  empresaId?: string
  año?: number
  mesPeriodo?: string
  tipo?: string
  estatus?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('sat_solicitudes')
    .select('*, empresas(codigo, nombre), perfiles!sat_solicitudes_solicitado_por_id_fkey(nombre)')
    .order('created_at', { ascending: false })

  if (filtros?.empresaId) query = query.eq('empresa_id', filtros.empresaId)
  if (filtros?.tipo) query = query.eq('tipo', filtros.tipo)
  if (filtros?.estatus) query = query.eq('estatus', filtros.estatus)
  if (filtros?.mesPeriodo) query = query.eq('mes_periodo', filtros.mesPeriodo)
  if (filtros?.año) query = query.eq('anio_periodo', filtros.año)

  const { data, error } = await query
  if (error) return []
  return data || []
}

export async function obtenerKPIsHistorial() {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()

  // Total solicitudes this year
  const { count: totalSolicitudes } = await supabase
    .from('sat_solicitudes')
    .select('*', { count: 'exact', head: true })
    .eq('anio_periodo', currentYear)

  // Total CFDIs downloaded
  const { count: totalCFDIs } = await supabase
    .from('cfdi_sat')
    .select('*', { count: 'exact', head: true })

  // Last completed download
  const { data: ultimaDescarga } = await supabase
    .from('sat_solicitudes')
    .select('*, empresas(codigo, nombre)')
    .eq('estatus', 'completada')
    .order('fecha_completada', { ascending: false })
    .limit(1)
    .single()

  // Get all empresas for dropdown
  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, codigo, nombre, sat_configurado')
    .eq('activa', true)
    .order('codigo')

  return {
    totalSolicitudes: totalSolicitudes || 0,
    totalCFDIs: totalCFDIs || 0,
    ultimaDescarga: ultimaDescarga
      ? {
          empresa: (ultimaDescarga.empresas as Record<string, string>)?.nombre || '',
          fecha: ultimaDescarga.fecha_completada || ultimaDescarga.updated_at,
        }
      : null,
    empresas: empresas || [],
  }
}
