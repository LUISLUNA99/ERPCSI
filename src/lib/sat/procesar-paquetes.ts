'use server'

import { createClient } from '@/lib/supabase/server'
import { obtenerCredencialesSAT, crearServicioSAT } from './descarga-masiva'
import { registrarAccion } from '@/lib/auditoria'
import { XMLParser } from 'fast-xml-parser'

interface ProcesarResult {
  success: boolean
  cfdisProcesados: number
  paquetesDescargados: number
  error?: string
}

function parsearCFDI(xmlContent: string, empresaId: string): Record<string, unknown> | null {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: () => false,
    })

    const parsed = parser.parse(xmlContent)

    // Navigate to Comprobante node (handles different namespaces)
    const comprobante = parsed['cfdi:Comprobante'] || parsed['Comprobante'] || parsed['cfdi:comprobante']
    if (!comprobante) return null

    const emisor = comprobante['cfdi:Emisor'] || comprobante['Emisor'] || {}
    const receptor = comprobante['cfdi:Receptor'] || comprobante['Receptor'] || {}
    const complemento = comprobante['cfdi:Complemento'] || comprobante['Complemento'] || {}
    const timbreFiscal = complemento['tfd:TimbreFiscalDigital'] || complemento['TimbreFiscalDigital'] || {}

    const uuid = timbreFiscal['@_UUID'] || timbreFiscal['@_uuid'] || ''
    if (!uuid) return null

    // Extract IVA from Traslados
    let iva = 0
    const impuestos = comprobante['cfdi:Impuestos'] || comprobante['Impuestos']
    if (impuestos) {
      const traslados = impuestos['cfdi:Traslados'] || impuestos['Traslados']
      if (traslados) {
        const traslado = traslados['cfdi:Traslado'] || traslados['Traslado']
        if (traslado) {
          const trasladoArr = Array.isArray(traslado) ? traslado : [traslado]
          for (const t of trasladoArr) {
            if (t['@_Impuesto'] === '002') {
              iva += parseFloat(t['@_Importe'] || '0')
            }
          }
        }
      }
    }

    return {
      empresa_id: empresaId,
      tipo: 'RECIBIDA', // Will be overridden based on request type
      uuid,
      fecha_emision: comprobante['@_Fecha'] || null,
      rfc_emisor: emisor['@_Rfc'] || emisor['@_rfc'] || null,
      nombre_emisor: emisor['@_Nombre'] || emisor['@_nombre'] || null,
      rfc_receptor: receptor['@_Rfc'] || receptor['@_rfc'] || null,
      nombre_receptor: receptor['@_Nombre'] || receptor['@_nombre'] || null,
      subtotal: parseFloat(comprobante['@_SubTotal'] || '0'),
      iva,
      total: parseFloat(comprobante['@_Total'] || '0'),
      estatus_sat: 'Vigente',
    }
  } catch {
    return null
  }
}

export async function procesarPaquetes(solicitudId: string): Promise<ProcesarResult> {
  const supabase = await createClient()

  const { data: solicitud, error: fetchErr } = await supabase
    .from('sat_solicitudes')
    .select('*')
    .eq('id', solicitudId)
    .single()

  if (fetchErr || !solicitud) {
    return { success: false, cfdisProcesados: 0, paquetesDescargados: 0, error: 'Solicitud no encontrada' }
  }

  if (solicitud.estatus !== 'lista') {
    return { success: false, cfdisProcesados: 0, paquetesDescargados: 0, error: 'La solicitud no esta lista para descargar' }
  }

  const startTime = Date.now()

  // Mark as downloading
  await supabase
    .from('sat_solicitudes')
    .update({ estatus: 'descargando', updated_at: new Date().toISOString() })
    .eq('id', solicitudId)

  let cfdisProcesados = 0
  let paquetesDescargados = 0

  try {
    const { certContents, keyContents, password } = await obtenerCredencialesSAT(solicitud.empresa_id)
    const service = crearServicioSAT(certContents, keyContents, password, solicitud.tipo)

    await service.authenticate()

    // We need to verify again to get package IDs
    const verifyResult = await service.verify(solicitud.id_solicitud_sat)
    const packagesIds = verifyResult.getPackageIds()

    const tipoCfdi = solicitud.tipo === 'emitidas' ? 'EMITIDA' : 'RECIBIDA'

    for (const packageId of packagesIds) {
      // Retry download up to 3 times
      let downloadResult = null
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          downloadResult = await service.download(packageId)
          break
        } catch (err) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 5000))
          }
        }
      }

      if (!downloadResult) {
        console.error(`[SAT] Error al descargar paquete ${packageId} despues de 3 intentos`)
        continue
      }

      const packageContent = downloadResult.getPackageContent()
      if (!packageContent) continue

      // Decode base64 package content and process ZIP
      try {
        const JSZip = (await import('jszip')).default
        const zipBuffer = Buffer.from(packageContent, 'base64')
        const zip = await JSZip.loadAsync(zipBuffer)

        const xmlFiles = Object.keys(zip.files).filter((name) => name.endsWith('.xml'))

        for (const fileName of xmlFiles) {
          try {
            const xmlContent = await zip.files[fileName].async('string')
            const cfdiData = parsearCFDI(xmlContent, solicitud.empresa_id)

            if (!cfdiData) continue
            cfdiData.tipo = tipoCfdi

            // Upsert by UUID
            const { error: upsertErr } = await supabase
              .from('cfdi_sat')
              .upsert(cfdiData, { onConflict: 'uuid' })

            if (!upsertErr) {
              cfdisProcesados++
            }
          } catch (xmlErr) {
            console.error(`[SAT] Error procesando XML ${fileName}:`, xmlErr)
          }
        }
      } catch (zipErr) {
        console.error(`[SAT] Error procesando ZIP del paquete ${packageId}:`, zipErr)
        continue
      }

      paquetesDescargados++

      // Update progress
      await supabase
        .from('sat_solicitudes')
        .update({ paquetes_descargados: paquetesDescargados, updated_at: new Date().toISOString() })
        .eq('id', solicitudId)
    }

    // Mark as completed
    await supabase
      .from('sat_solicitudes')
      .update({
        estatus: 'completada',
        total_cfdi: cfdisProcesados,
        paquetes_descargados: paquetesDescargados,
        fecha_completada: new Date().toISOString(),
        duracion_segundos: Math.round((Date.now() - startTime) / 1000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', solicitudId)

    await registrarAccion({
      accion: 'procesar_paquetes_sat',
      modulo: 'sat',
      descripcion: `Descarga SAT completada: ${cfdisProcesados} CFDIs procesados de ${paquetesDescargados} paquetes`,
      entidadTipo: 'sat_solicitud',
      entidadId: solicitudId,
      datosNuevos: { cfdisProcesados, paquetesDescargados },
    })

    // Create notification for the requester
    if (solicitud.solicitado_por_id) {
      await supabase.from('notificaciones').insert({
        usuario_id: solicitud.solicitado_por_id,
        tipo: 'descarga_sat',
        titulo: `Descarga SAT completada`,
        mensaje: `Se descargaron ${cfdisProcesados} CFDIs de ${solicitud.mes_periodo || ''} para conciliar.`,
        leida: false,
      })
    }

    return { success: true, cfdisProcesados, paquetesDescargados }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'

    await supabase
      .from('sat_solicitudes')
      .update({
        estatus: 'error',
        mensaje_error: errorMsg,
        paquetes_descargados: paquetesDescargados,
        updated_at: new Date().toISOString(),
      })
      .eq('id', solicitudId)

    await registrarAccion({
      accion: 'procesar_paquetes_sat',
      modulo: 'sat',
      descripcion: `Error procesando paquetes SAT: ${errorMsg}`,
      entidadTipo: 'sat_solicitud',
      entidadId: solicitudId,
      resultado: 'fallido',
      metadata: { error: errorMsg, cfdisProcesados, paquetesDescargados },
    })

    // Notify admins of error
    const { data: admins } = await supabase
      .from('perfiles')
      .select('id')
      .eq('rol', 'admin')
      .eq('activo', true)

    if (admins) {
      const notifs = admins.map(a => ({
        usuario_id: a.id,
        tipo: 'error_sat',
        titulo: 'Error en descarga SAT',
        mensaje: `Error procesando ${solicitud.mes_periodo || ''}: ${errorMsg}`,
        leida: false,
      }))
      await supabase.from('notificaciones').insert(notifs)
    }

    return { success: false, cfdisProcesados, paquetesDescargados, error: errorMsg }
  }
}
