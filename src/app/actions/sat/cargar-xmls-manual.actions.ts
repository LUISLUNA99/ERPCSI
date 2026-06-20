'use server'

import { createClient } from '@/lib/supabase/server'
import { parsearCFDI } from '@/lib/sat/parsear-cfdi'
import { registrarAccion } from '@/lib/auditoria'
import { XMLParser } from 'fast-xml-parser'

interface CFDIPreview {
  uuid: string
  fecha_emision: string | null
  rfc_emisor: string | null
  nombre_emisor: string | null
  rfc_receptor: string | null
  nombre_receptor: string | null
  total: number
  moneda: string
  tipo_comprobante: string | null
}

export interface PreviewResult {
  totalCfdis: number
  emitidas: number
  recibidas: number
  montoTotal: number
  fechaMin: string | null
  fechaMax: string | null
  duplicados: number
  cfdis: CFDIPreview[]
  xmlContents: string[]
}

/**
 * Parsea XMLs en el servidor y devuelve preview sin guardar nada.
 */
export async function previsualizarXMLs(
  xmlStrings: string[],
  empresaId: string,
  tipo: 'EMITIDA' | 'RECIBIDA'
): Promise<{ data?: PreviewResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || !['admin', 'tesorero'].includes(perfil.rol)) {
    return { error: 'Sin permisos' }
  }

  const cfdis: CFDIPreview[] = []
  const fechas: string[] = []
  let montoTotal = 0
  const uuids: string[] = []

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: () => false,
  })

  for (const xml of xmlStrings) {
    try {
      const parsed = parser.parse(xml)
      const comprobante = parsed['cfdi:Comprobante'] || parsed['Comprobante'] || parsed['cfdi:comprobante']
      if (!comprobante) continue

      const complemento = comprobante['cfdi:Complemento'] || comprobante['Complemento'] || {}
      const timbre = complemento['tfd:TimbreFiscalDigital'] || complemento['TimbreFiscalDigital'] || {}
      const uuid = timbre['@_UUID'] || timbre['@_uuid'] || ''
      if (!uuid) continue

      const emisor = comprobante['cfdi:Emisor'] || comprobante['Emisor'] || {}
      const receptor = comprobante['cfdi:Receptor'] || comprobante['Receptor'] || {}
      const total = parseFloat(comprobante['@_Total'] || '0')
      const fecha = comprobante['@_Fecha'] || null

      uuids.push(uuid)
      montoTotal += total
      if (fecha) fechas.push(fecha)

      cfdis.push({
        uuid,
        fecha_emision: fecha,
        rfc_emisor: emisor['@_Rfc'] || null,
        nombre_emisor: emisor['@_Nombre'] || null,
        rfc_receptor: receptor['@_Rfc'] || null,
        nombre_receptor: receptor['@_Nombre'] || null,
        total,
        moneda: comprobante['@_Moneda'] || 'MXN',
        tipo_comprobante: comprobante['@_TipoDeComprobante'] || null,
      })
    } catch {
      // skip invalid XMLs
    }
  }

  if (cfdis.length === 0) {
    return { error: 'No se encontraron CFDIs validos en los archivos' }
  }

  // Check duplicates
  let duplicados = 0
  if (uuids.length > 0) {
    const { count } = await supabase
      .from('cfdi_sat')
      .select('*', { count: 'exact', head: true })
      .in('uuid', uuids)
    duplicados = count || 0
  }

  fechas.sort()

  return {
    data: {
      totalCfdis: cfdis.length,
      emitidas: tipo === 'EMITIDA' ? cfdis.length : 0,
      recibidas: tipo === 'RECIBIDA' ? cfdis.length : 0,
      montoTotal,
      fechaMin: fechas[0] || null,
      fechaMax: fechas[fechas.length - 1] || null,
      duplicados,
      cfdis,
      xmlContents: xmlStrings,
    },
  }
}

/**
 * Confirma la carga: upsert CFDIs en cfdi_sat + registro en sat_archivos_recibidos.
 */
export async function confirmarCargaManual(
  xmlStrings: string[],
  empresaId: string,
  tipo: 'EMITIDA' | 'RECIBIDA'
): Promise<{ success?: boolean; cfdisProcesados: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', cfdisProcesados: 0 }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || !['admin', 'tesorero'].includes(perfil.rol)) {
    return { error: 'Sin permisos', cfdisProcesados: 0 }
  }

  // Create archivo record
  const { data: archivo } = await supabase
    .from('sat_archivos_recibidos')
    .insert({
      empresa_id: empresaId,
      nombre_archivo: `carga_manual_${new Date().toISOString().slice(0, 10)}.xml`,
      storage_path: '',
      total_xmls: xmlStrings.length,
      procesado: false,
      origen: 'manual',
    })
    .select('id')
    .single()

  const archivoId = archivo?.id || null

  let cfdisProcesados = 0

  for (const xml of xmlStrings) {
    try {
      const cfdiData = parsearCFDI(xml, empresaId, '', archivoId, tipo, null, null)
      if (!cfdiData) continue

      // Remove solicitud_id since manual uploads don't have one
      cfdiData.solicitud_id = null

      const { error: upsertErr } = await supabase
        .from('cfdi_sat')
        .upsert(cfdiData as Record<string, unknown>, { onConflict: 'uuid' })

      if (!upsertErr) cfdisProcesados++
    } catch {
      // skip individual errors
    }
  }

  // Update archivo record
  if (archivoId) {
    await supabase
      .from('sat_archivos_recibidos')
      .update({
        procesado: true,
        total_cfdis_procesados: cfdisProcesados,
      })
      .eq('id', archivoId)
  }

  await registrarAccion({
    accion: 'carga_manual_sat',
    modulo: 'sat',
    descripcion: `Carga manual de ${cfdisProcesados} CFDIs (${tipo.toLowerCase()}) para empresa ${empresaId}`,
    entidadTipo: 'sat_archivo',
    entidadId: archivoId || undefined,
    datosNuevos: { cfdisProcesados, tipo, totalXMLs: xmlStrings.length },
  })

  return { success: true, cfdisProcesados }
}
