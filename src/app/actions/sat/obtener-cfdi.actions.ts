'use server'

import { createClient } from '@/lib/supabase/server'
import { registrarAccion } from '@/lib/auditoria'

const MESES: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
  JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
}

function parsearMesPeriodo(mesPeriodo: string): { start: Date; end: Date } {
  const [mes, anioStr] = mesPeriodo.split('-')
  const anio = parseInt(anioStr, 10)
  const mesIndex = MESES[mes]

  if (mesIndex === undefined || isNaN(anio)) {
    throw new Error(`Periodo invalido: ${mesPeriodo}`)
  }

  const start = new Date(anio, mesIndex, 1)
  const end = new Date(anio, mesIndex + 1, 0, 23, 59, 59)

  return { start, end }
}

interface FiltrosCFDI {
  empresaId?: string
  tipo?: 'EMITIDA' | 'RECIBIDA'
  mesPeriodo?: string
  rfcEmisor?: string
  rfcReceptor?: string
  estatusSat?: string
  conciliado?: boolean
  page?: number
  pageSize?: number
}

interface ResultadoCFDI {
  data: unknown[]
  total: number
  page: number
  pageSize: number
}

export async function obtenerCFDIs(filtros: FiltrosCFDI): Promise<ResultadoCFDI> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], total: 0, page: 1, pageSize: 50 }

  const page = filtros.page || 1
  const pageSize = filtros.pageSize || 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('cfdi_sat')
    .select('*', { count: 'exact' })
    .order('fecha_emision', { ascending: false })
    .range(from, to)

  if (filtros.empresaId) {
    query = query.eq('empresa_id', filtros.empresaId)
  }

  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo)
  }

  if (filtros.mesPeriodo) {
    try {
      const { start, end } = parsearMesPeriodo(filtros.mesPeriodo)
      query = query
        .gte('fecha_emision', start.toISOString())
        .lte('fecha_emision', end.toISOString())
    } catch {
      // Periodo invalido, ignorar filtro
    }
  }

  if (filtros.rfcEmisor) {
    query = query.ilike('rfc_emisor', `%${filtros.rfcEmisor}%`)
  }

  if (filtros.rfcReceptor) {
    query = query.ilike('rfc_receptor', `%${filtros.rfcReceptor}%`)
  }

  if (filtros.estatusSat) {
    query = query.eq('estatus_sat', filtros.estatusSat)
  }

  if (filtros.conciliado !== undefined) {
    query = query.eq('conciliado', filtros.conciliado)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[SAT] Error al obtener CFDIs:', error)
    return { data: [], total: 0, page, pageSize }
  }

  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  }
}

interface KPIsCFDI {
  totalEmitidos: number
  totalRecibidos: number
  sumaEmitidos: number
  sumaRecibidos: number
  pendientesConciliar: number
  cancelados: number
}

export async function obtenerKPIsCFDI(
  empresaId: string,
  mesPeriodo: string
): Promise<KPIsCFDI> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      totalEmitidos: 0,
      totalRecibidos: 0,
      sumaEmitidos: 0,
      sumaRecibidos: 0,
      pendientesConciliar: 0,
      cancelados: 0,
    }
  }

  let fechaFilter: { start: string; end: string } | null = null
  try {
    const { start, end } = parsearMesPeriodo(mesPeriodo)
    fechaFilter = { start: start.toISOString(), end: end.toISOString() }
  } catch {
    return {
      totalEmitidos: 0,
      totalRecibidos: 0,
      sumaEmitidos: 0,
      sumaRecibidos: 0,
      pendientesConciliar: 0,
      cancelados: 0,
    }
  }

  // Emitidos
  const { data: emitidos } = await supabase
    .from('cfdi_sat')
    .select('total')
    .eq('empresa_id', empresaId)
    .eq('tipo', 'EMITIDA')
    .gte('fecha_emision', fechaFilter.start)
    .lte('fecha_emision', fechaFilter.end)

  // Recibidos
  const { data: recibidos } = await supabase
    .from('cfdi_sat')
    .select('total')
    .eq('empresa_id', empresaId)
    .eq('tipo', 'RECIBIDA')
    .gte('fecha_emision', fechaFilter.start)
    .lte('fecha_emision', fechaFilter.end)

  // Pendientes de conciliar
  const { count: pendientesConciliar } = await supabase
    .from('cfdi_sat')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('conciliado', false)
    .gte('fecha_emision', fechaFilter.start)
    .lte('fecha_emision', fechaFilter.end)

  // Cancelados
  const { count: cancelados } = await supabase
    .from('cfdi_sat')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('estatus_sat', 'Cancelado')
    .gte('fecha_emision', fechaFilter.start)
    .lte('fecha_emision', fechaFilter.end)

  const totalEmitidos = emitidos?.length || 0
  const totalRecibidos = recibidos?.length || 0
  const sumaEmitidos = emitidos?.reduce((acc, row) => acc + (Number(row.total) || 0), 0) || 0
  const sumaRecibidos = recibidos?.reduce((acc, row) => acc + (Number(row.total) || 0), 0) || 0

  return {
    totalEmitidos,
    totalRecibidos,
    sumaEmitidos,
    sumaRecibidos,
    pendientesConciliar: pendientesConciliar || 0,
    cancelados: cancelados || 0,
  }
}
