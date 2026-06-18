'use server'

import { createClient } from '@/lib/supabase/server'
import { registrarAccion } from '@/lib/auditoria'
import { solicitarDescarga } from '@/lib/sat/descarga-masiva'
import { revalidatePath } from 'next/cache'

const MESES: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
  JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
}

function convertirMesPeriodo(mesPeriodo: string): { fechaInicio: Date; fechaFin: Date; mes: string; anio: number } {
  const [mes, anioStr] = mesPeriodo.split('-')
  const anio = parseInt(anioStr, 10)
  const mesIndex = MESES[mes]

  if (mesIndex === undefined || isNaN(anio)) {
    throw new Error(`Periodo invalido: ${mesPeriodo}`)
  }

  const fechaInicio = new Date(anio, mesIndex, 1)
  const fechaFin = new Date(anio, mesIndex + 1, 0, 23, 59, 59) // ultimo dia del mes

  return { fechaInicio, fechaFin, mes, anio }
}

interface SolicitarDescargaParams {
  empresaId: string
  tipo: 'emitidas' | 'recibidas'
  mesPeriodo: string // e.g. 'ENE-2026'
  formato: 'xml' | 'metadata'
  forzar?: boolean
}

export async function solicitarDescargaSAT(params: SolicitarDescargaParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const { fechaInicio, fechaFin, mes, anio } = convertirMesPeriodo(params.mesPeriodo)

    if (!params.forzar) {
      const duplicado = await verificarDuplicado(params.empresaId, params.mesPeriodo, params.tipo)
      if (duplicado.existe) {
        return { error: `Ya existe una solicitud completada para ${params.tipo} de ${params.mesPeriodo} (${duplicado.fecha})` }
      }
    }

    // Llamar al servicio de descarga masiva
    const resultado = await solicitarDescarga({
      empresaId: params.empresaId,
      fechaInicio,
      fechaFin,
      tipo: params.tipo,
      formato: params.formato,
    })

    if ('error' in resultado) {
      return { error: resultado.error }
    }

    // Actualizar la solicitud con mes_periodo y año_periodo
    const { error: updateError } = await supabase
      .from('sat_solicitudes')
      .update({
        mes_periodo: mes,
        anio_periodo: anio,
      })
      .eq('id', resultado.id)

    if (updateError) {
      console.error('[SAT] Error al actualizar mes/anio periodo:', updateError)
    }

    await registrarAccion({
      accion: 'solicitar_descarga_sat_ui',
      modulo: 'sat',
      descripcion: `Solicitud de descarga SAT: ${params.tipo} ${params.mesPeriodo} (${params.formato})`,
      entidadTipo: 'sat_solicitud',
      entidadId: resultado.id,
      entidadDescripcion: resultado.idSolicitudSat,
      datosNuevos: {
        mesPeriodo: params.mesPeriodo,
        tipo: params.tipo,
        formato: params.formato,
        empresaId: params.empresaId,
      },
    })

    revalidatePath('/conciliacion/sat')
    return { success: true, id: resultado.id, idSolicitudSat: resultado.idSolicitudSat }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
    return { error: errorMsg }
  }
}

export async function verificarDuplicado(
  empresaId: string,
  mesPeriodo: string,
  tipo: 'emitidas' | 'recibidas'
): Promise<{ existe: boolean; fecha?: string }> {
  const supabase = await createClient()

  const [mes, anioStr] = mesPeriodo.split('-')
  const anio = parseInt(anioStr, 10)

  const { data, error } = await supabase
    .from('sat_solicitudes')
    .select('created_at')
    .eq('empresa_id', empresaId)
    .eq('mes_periodo', mes)
    .eq('anio_periodo', anio)
    .eq('tipo', tipo)
    .eq('estatus', 'completada')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return { existe: false }
  }

  return {
    existe: true,
    fecha: new Date(data.created_at).toLocaleDateString('es-MX'),
  }
}
