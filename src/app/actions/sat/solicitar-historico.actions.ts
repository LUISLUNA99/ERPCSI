'use server'

import { createClient } from '@/lib/supabase/server'
import { registrarAccion } from '@/lib/auditoria'
import { solicitarDescarga } from '@/lib/sat/descarga-masiva'

const NOMBRES_MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

interface ResultadoHistorico {
  total: number
  enviadas: number
  errores: string[]
}

export async function solicitarDescargaHistorica(
  empresaId: string,
  formato: 'xml' | 'metadata'
): Promise<ResultadoHistorico | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const ahora = new Date()
    const anioActual = ahora.getFullYear() // 2026
    const mesActual = ahora.getMonth() // 0-indexed, junio = 5

    // Generar meses desde ENE hasta el mes actual
    const meses: string[] = []
    for (let i = 0; i <= mesActual; i++) {
      meses.push(`${NOMBRES_MESES[i]}-${anioActual}`)
    }

    const tipos: Array<'emitidas' | 'recibidas'> = ['emitidas', 'recibidas']
    let total = 0
    let enviadas = 0
    const errores: string[] = []

    for (const mesPeriodo of meses) {
      for (const tipo of tipos) {
        total++

        const [mes, anioStr] = mesPeriodo.split('-')
        const anio = parseInt(anioStr, 10)

        // Verificar si ya existe una solicitud completada
        const { data: existente } = await supabase
          .from('sat_solicitudes')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('mes_periodo', mes)
          .eq('anio_periodo', anio)
          .eq('tipo', tipo)
          .eq('estatus', 'completada')
          .limit(1)
          .maybeSingle()

        if (existente) {
          // Ya completada, saltar
          continue
        }

        // Calcular fechas del periodo
        const mesIndex = NOMBRES_MESES.indexOf(mes)
        const fechaInicio = new Date(anio, mesIndex, 1)
        const fechaFin = new Date(anio, mesIndex + 1, 0, 23, 59, 59)

        const resultado = await solicitarDescarga({
          empresaId,
          fechaInicio,
          fechaFin,
          tipo,
          formato,
        })

        if ('error' in resultado) {
          errores.push(`${tipo} ${mesPeriodo}: ${resultado.error}`)
        } else {
          // Actualizar mes_periodo y anio_periodo
          await supabase
            .from('sat_solicitudes')
            .update({ mes_periodo: mes, anio_periodo: anio })
            .eq('id', resultado.id)

          enviadas++
        }
      }
    }

    await registrarAccion({
      accion: 'descarga_historica_sat',
      modulo: 'sat',
      descripcion: `Descarga historica SAT: ${enviadas}/${total} solicitudes enviadas (${formato})`,
      entidadTipo: 'empresa',
      entidadId: empresaId,
      datosNuevos: {
        formato,
        total,
        enviadas,
        errores: errores.length,
        meses,
      },
    })

    return { total, enviadas, errores }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'

    await registrarAccion({
      accion: 'descarga_historica_sat',
      modulo: 'sat',
      descripcion: `Error en descarga historica SAT: ${errorMsg}`,
      entidadTipo: 'empresa',
      entidadId: empresaId,
      resultado: 'fallido',
      metadata: { error: errorMsg },
    })

    return { error: errorMsg }
  }
}
