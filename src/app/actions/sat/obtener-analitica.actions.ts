'use server'

import { createClient } from '@/lib/supabase/server'

const MESES: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
  JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
}

function parsearMesPeriodo(mesPeriodo: string): { start: string; end: string } {
  const [mes, anioStr] = mesPeriodo.split('-')
  const anio = parseInt(anioStr, 10)
  const mesIndex = MESES[mes]
  const start = new Date(anio, mesIndex, 1)
  const end = new Date(anio, mesIndex + 1, 0, 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}

export interface ResumenFormaPago {
  forma_pago: string
  count: number
  total_mxn: number
}

export interface ResumenTipoComprobante {
  tipo_comprobante: string
  count: number
  total_mxn: number
}

export interface ResumenRFC {
  rfc: string
  nombre: string
  count: number
  total_mxn: number
}

export interface AnaliticaSAT {
  porFormaPago: ResumenFormaPago[]
  porTipoComprobante: ResumenTipoComprobante[]
  topProveedores: ResumenRFC[]
  topClientes: ResumenRFC[]
}

export async function obtenerAnaliticaSAT(
  empresaId: string,
  mesPeriodo: string
): Promise<AnaliticaSAT> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { porFormaPago: [], porTipoComprobante: [], topProveedores: [], topClientes: [] }

  let fechaFilter: { start: string; end: string }
  try {
    fechaFilter = parsearMesPeriodo(mesPeriodo)
  } catch {
    return { porFormaPago: [], porTipoComprobante: [], topProveedores: [], topClientes: [] }
  }

  // Fetch all CFDIs for this empresa + period
  const { data: cfdis } = await supabase
    .from('cfdi_sat')
    .select('tipo, forma_pago, tipo_comprobante, rfc_emisor, nombre_emisor, rfc_receptor, nombre_receptor, total_mxn, total')
    .eq('empresa_id', empresaId)
    .gte('fecha_emision', fechaFilter.start)
    .lte('fecha_emision', fechaFilter.end)

  if (!cfdis || cfdis.length === 0) {
    return { porFormaPago: [], porTipoComprobante: [], topProveedores: [], topClientes: [] }
  }

  // Group by forma_pago
  const fpMap = new Map<string, { count: number; total: number }>()
  for (const c of cfdis) {
    const fp = c.forma_pago || 'Sin especificar'
    const entry = fpMap.get(fp) || { count: 0, total: 0 }
    entry.count++
    entry.total += Number(c.total_mxn || c.total || 0)
    fpMap.set(fp, entry)
  }
  const porFormaPago = Array.from(fpMap.entries())
    .map(([forma_pago, v]) => ({ forma_pago, count: v.count, total_mxn: v.total }))
    .sort((a, b) => b.total_mxn - a.total_mxn)

  // Group by tipo_comprobante
  const tcMap = new Map<string, { count: number; total: number }>()
  for (const c of cfdis) {
    const tc = c.tipo_comprobante || 'Sin especificar'
    const entry = tcMap.get(tc) || { count: 0, total: 0 }
    entry.count++
    entry.total += Number(c.total_mxn || c.total || 0)
    tcMap.set(tc, entry)
  }
  const porTipoComprobante = Array.from(tcMap.entries())
    .map(([tipo_comprobante, v]) => ({ tipo_comprobante, count: v.count, total_mxn: v.total }))
    .sort((a, b) => b.total_mxn - a.total_mxn)

  // Top 10 proveedores (recibidas - agrupado por rfc_emisor)
  const provMap = new Map<string, { nombre: string; count: number; total: number }>()
  for (const c of cfdis) {
    if (c.tipo !== 'RECIBIDA' || !c.rfc_emisor) continue
    const entry = provMap.get(c.rfc_emisor) || { nombre: c.nombre_emisor || '', count: 0, total: 0 }
    entry.count++
    entry.total += Number(c.total_mxn || c.total || 0)
    if (!entry.nombre && c.nombre_emisor) entry.nombre = c.nombre_emisor
    provMap.set(c.rfc_emisor, entry)
  }
  const topProveedores = Array.from(provMap.entries())
    .map(([rfc, v]) => ({ rfc, nombre: v.nombre, count: v.count, total_mxn: v.total }))
    .sort((a, b) => b.total_mxn - a.total_mxn)
    .slice(0, 10)

  // Top 10 clientes (emitidas - agrupado por rfc_receptor)
  const cliMap = new Map<string, { nombre: string; count: number; total: number }>()
  for (const c of cfdis) {
    if (c.tipo !== 'EMITIDA' || !c.rfc_receptor) continue
    const entry = cliMap.get(c.rfc_receptor) || { nombre: c.nombre_receptor || '', count: 0, total: 0 }
    entry.count++
    entry.total += Number(c.total_mxn || c.total || 0)
    if (!entry.nombre && c.nombre_receptor) entry.nombre = c.nombre_receptor
    cliMap.set(c.rfc_receptor, entry)
  }
  const topClientes = Array.from(cliMap.entries())
    .map(([rfc, v]) => ({ rfc, nombre: v.nombre, count: v.count, total_mxn: v.total }))
    .sort((a, b) => b.total_mxn - a.total_mxn)
    .slice(0, 10)

  return { porFormaPago, porTipoComprobante, topProveedores, topClientes }
}
