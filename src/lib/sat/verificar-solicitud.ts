'use server'

import { createClient } from '@/lib/supabase/server'
import { obtenerCredencialesSAT, crearServicioSAT } from './descarga-masiva'
import { registrarAccion } from '@/lib/auditoria'

interface VerifyResponse {
  estatus: string
  totalCfdi?: number
  totalPaquetes?: number
  paquetesIds?: string[]
  error?: string
}

export async function verificarSolicitud(solicitudId: string): Promise<VerifyResponse> {
  const supabase = await createClient()

  const { data: solicitud, error: fetchErr } = await supabase
    .from('sat_solicitudes')
    .select('*, empresas(codigo, nombre)')
    .eq('id', solicitudId)
    .single()

  if (fetchErr || !solicitud) {
    return { estatus: 'error', error: 'Solicitud no encontrada' }
  }

  if (solicitud.estatus === 'completada' || solicitud.estatus === 'error') {
    return { estatus: solicitud.estatus }
  }

  try {
    const { certContents, keyContents, password } = await obtenerCredencialesSAT(solicitud.empresa_id)
    const service = crearServicioSAT(certContents, keyContents, password, solicitud.tipo)

    await service.authenticate()

    // Retry up to 3 times
    let verifyResult = null
    let lastError = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        verifyResult = await service.verify(solicitud.id_solicitud_sat)
        break
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Error de conexion'
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 5000))
        }
      }
    }

    if (!verifyResult) {
      await supabase
        .from('sat_solicitudes')
        .update({ estatus: 'error', mensaje_error: `Error al verificar despues de 3 intentos: ${lastError}`, updated_at: new Date().toISOString() })
        .eq('id', solicitudId)

      return { estatus: 'error', error: lastError }
    }

    const statusRequest = verifyResult.getStatusRequest()
    const statusName = statusRequest.toJSON?.() || String(statusRequest)

    // Map SAT status to our status
    let nuevoEstatus = solicitud.estatus
    const totalCfdi = verifyResult.getNumberCfdis()
    const packagesIds = verifyResult.getPackageIds()
    const totalPaquetes = packagesIds.length

    if (typeof statusName === 'string' || typeof statusName === 'object') {
      const name = typeof statusName === 'object' ? (statusName as { name?: string }).name || '' : statusName
      if (name === 'Finished' || name.includes('Finished')) {
        nuevoEstatus = totalPaquetes > 0 ? 'lista' : 'completada'
      } else if (name === 'InProgress' || name === 'Accepted' || name.includes('Progress') || name.includes('Accepted')) {
        nuevoEstatus = 'verificando'
      } else if (name === 'Failure' || name === 'Rejected' || name === 'Expired') {
        nuevoEstatus = 'error'
      }
    }

    const updateData: Record<string, unknown> = {
      estatus: nuevoEstatus,
      updated_at: new Date().toISOString(),
    }

    if (totalCfdi > 0) updateData.total_cfdi = totalCfdi
    if (totalPaquetes > 0) updateData.total_paquetes = totalPaquetes

    if (nuevoEstatus === 'error') {
      updateData.mensaje_error = `SAT respondio con estatus: ${JSON.stringify(statusName)}`
    }

    await supabase
      .from('sat_solicitudes')
      .update(updateData)
      .eq('id', solicitudId)

    await registrarAccion({
      accion: 'verificar_solicitud_sat',
      modulo: 'sat',
      descripcion: `Solicitud SAT ${solicitud.id_solicitud_sat} verificada: ${nuevoEstatus}. ${totalCfdi} CFDIs, ${totalPaquetes} paquetes`,
      entidadTipo: 'sat_solicitud',
      entidadId: solicitudId,
      datosNuevos: { estatus: nuevoEstatus, totalCfdi, totalPaquetes },
    })

    return {
      estatus: nuevoEstatus,
      totalCfdi,
      totalPaquetes,
      paquetesIds: packagesIds,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'

    await supabase
      .from('sat_solicitudes')
      .update({ estatus: 'error', mensaje_error: errorMsg, updated_at: new Date().toISOString() })
      .eq('id', solicitudId)

    return { estatus: 'error', error: errorMsg }
  }
}
