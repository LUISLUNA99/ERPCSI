'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { obtenerCredencialesSAT, crearServicioSAT } from './descarga-masiva'
import { registrarAccion } from '@/lib/auditoria'
import { parsearCFDI } from './parsear-cfdi'

interface ProcesarResult {
  success: boolean
  cfdisProcesados: number
  paquetesDescargados: number
  error?: string
}

export async function procesarPaquetes(solicitudId: string): Promise<ProcesarResult> {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

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

    const verifyResult = await service.verify(solicitud.id_solicitud_sat)
    const packagesIds = verifyResult.getPackageIds()

    const tipoCfdi = solicitud.tipo === 'emitidas' ? 'EMITIDA' : 'RECIBIDA'
    const JSZip = (await import('jszip')).default

    for (let pkgIdx = 0; pkgIdx < packagesIds.length; pkgIdx++) {
      const packageId = packagesIds[pkgIdx]

      // Retry download up to 3 times
      let downloadResult = null
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          downloadResult = await service.download(packageId)
          break
        } catch {
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

      const zipBuffer = Buffer.from(packageContent, 'base64')

      // Save ZIP to Supabase Storage
      const now = new Date()
      const storagePath = `${solicitud.empresa_id}/${solicitud.anio_periodo || now.getFullYear()}/${solicitud.mes_periodo || 'ALL'}/${solicitud.tipo}/${solicitudId}/paquete_${pkgIdx + 1}.zip`

      const { error: uploadErr } = await serviceClient.storage
        .from('sat-descargas')
        .upload(storagePath, zipBuffer, {
          contentType: 'application/zip',
          upsert: true,
        })

      if (uploadErr) {
        console.error(`[SAT] Error subiendo ZIP a Storage: ${uploadErr.message}`)
      }

      // Register in sat_archivos_recibidos
      let archivoId: string | null = null
      const { data: archivoData } = await supabase
        .from('sat_archivos_recibidos')
        .insert({
          solicitud_id: solicitudId,
          empresa_id: solicitud.empresa_id,
          nombre_archivo: `paquete_${pkgIdx + 1}.zip`,
          numero_paquete: pkgIdx + 1,
          total_paquetes: packagesIds.length,
          tamaño_bytes: zipBuffer.length,
          archivo_url: storagePath,
          procesado: false,
          fecha_descarga: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (archivoData) {
        archivoId = archivoData.id
      }

      // Process ZIP
      try {
        const zip = await JSZip.loadAsync(zipBuffer)
        const xmlFiles = Object.keys(zip.files).filter((name) => name.endsWith('.xml'))
        let cfdiEnPaquete = 0

        for (const fileName of xmlFiles) {
          try {
            const xmlContent = await zip.files[fileName].async('string')
            const cfdiData = parsearCFDI(
              xmlContent,
              solicitud.empresa_id,
              solicitudId,
              archivoId,
              tipoCfdi,
              solicitud.mes_periodo,
              solicitud.anio_periodo
            )

            if (!cfdiData) continue

            const { error: upsertErr } = await supabase
              .from('cfdi_sat')
              .upsert(cfdiData, { onConflict: 'uuid' })

            if (!upsertErr) {
              cfdisProcesados++
              cfdiEnPaquete++
            }
          } catch (xmlErr) {
            console.error(`[SAT] Error procesando XML ${fileName}:`, xmlErr)
          }
        }

        // Mark archivo as procesado
        if (archivoId) {
          await supabase
            .from('sat_archivos_recibidos')
            .update({ procesado: true, cfdi_en_paquete: cfdiEnPaquete })
            .eq('id', archivoId)
        }
      } catch (zipErr) {
        console.error(`[SAT] Error procesando ZIP del paquete ${packageId}:`, zipErr)
        continue
      }

      paquetesDescargados++

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

/**
 * Reprocesa un ZIP ya almacenado en Storage.
 * Recibe el id de sat_archivos_recibidos.
 */
export async function reprocesarZIP(archivoId: string): Promise<{ success: boolean; cfdisProcesados: number; error?: string }> {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: archivo, error: fetchErr } = await supabase
    .from('sat_archivos_recibidos')
    .select('*, sat_solicitudes(empresa_id, tipo, mes_periodo, anio_periodo)')
    .eq('id', archivoId)
    .single()

  if (fetchErr || !archivo) {
    return { success: false, cfdisProcesados: 0, error: 'Archivo no encontrado' }
  }

  const solicitud = archivo.sat_solicitudes as { empresa_id: string; tipo: string; mes_periodo: string; anio_periodo: number } | null
  if (!solicitud) {
    return { success: false, cfdisProcesados: 0, error: 'Solicitud asociada no encontrada' }
  }

  // Download ZIP from Storage
  const { data: fileData, error: dlErr } = await serviceClient.storage
    .from('sat-descargas')
    .download(archivo.archivo_url)

  if (dlErr || !fileData) {
    return { success: false, cfdisProcesados: 0, error: `Error descargando ZIP: ${dlErr?.message}` }
  }

  const JSZip = (await import('jszip')).default
  const zipBuffer = Buffer.from(await fileData.arrayBuffer())
  const zip = await JSZip.loadAsync(zipBuffer)
  const xmlFiles = Object.keys(zip.files).filter((name) => name.endsWith('.xml'))

  const tipoCfdi = solicitud.tipo === 'emitidas' ? 'EMITIDA' : 'RECIBIDA'
  let cfdisProcesados = 0

  for (const fileName of xmlFiles) {
    try {
      const xmlContent = await zip.files[fileName].async('string')
      const cfdiData = parsearCFDI(
        xmlContent,
        solicitud.empresa_id,
        archivo.solicitud_id,
        archivoId,
        tipoCfdi,
        solicitud.mes_periodo,
        solicitud.anio_periodo
      )

      if (!cfdiData) continue

      const { error: upsertErr } = await supabase
        .from('cfdi_sat')
        .upsert(cfdiData, { onConflict: 'uuid' })

      if (!upsertErr) cfdisProcesados++
    } catch {
      // skip individual XML errors
    }
  }

  // Mark as procesado
  await supabase
    .from('sat_archivos_recibidos')
    .update({ procesado: true, cfdi_en_paquete: cfdisProcesados })
    .eq('id', archivoId)

  await registrarAccion({
    accion: 'reprocesar_zip_sat',
    modulo: 'sat',
    descripcion: `ZIP reprocesado: ${cfdisProcesados} CFDIs de ${archivo.nombre_archivo}`,
    entidadTipo: 'sat_archivo',
    entidadId: archivoId,
    datosNuevos: { cfdisProcesados },
  })

  return { success: true, cfdisProcesados }
}
