'use server'

import { verificarSolicitud } from '@/lib/sat/verificar-solicitud'
import { procesarPaquetes } from '@/lib/sat/procesar-paquetes'

interface VerificarYProcesarResult {
  estatus: string
  totalCfdi?: number
  totalPaquetes?: number
  cfdisProcesados?: number
  error?: string
}

export async function verificarYProcesarSolicitud(solicitudId: string): Promise<VerificarYProcesarResult> {
  // Step 1: Verify with SAT
  const verifyResult = await verificarSolicitud(solicitudId)

  if (verifyResult.estatus === 'error') {
    return { estatus: 'error', error: verifyResult.error }
  }

  if (verifyResult.estatus === 'verificando') {
    return { estatus: 'verificando' }
  }

  if (verifyResult.estatus === 'completada') {
    return { estatus: 'completada', totalCfdi: verifyResult.totalCfdi }
  }

  // Step 2: If lista, process packages
  if (verifyResult.estatus === 'lista') {
    const processResult = await procesarPaquetes(solicitudId)

    if (processResult.success) {
      return {
        estatus: 'completada',
        totalCfdi: verifyResult.totalCfdi,
        totalPaquetes: verifyResult.totalPaquetes,
        cfdisProcesados: processResult.cfdisProcesados,
      }
    } else {
      return {
        estatus: 'error',
        error: processResult.error,
        cfdisProcesados: processResult.cfdisProcesados,
      }
    }
  }

  // pendiente or other — just return the status
  return { estatus: verifyResult.estatus, totalCfdi: verifyResult.totalCfdi, totalPaquetes: verifyResult.totalPaquetes }
}
