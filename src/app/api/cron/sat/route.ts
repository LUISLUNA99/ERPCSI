import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verificarSolicitud } from '@/lib/sat/verificar-solicitud'
import { procesarPaquetes } from '@/lib/sat/procesar-paquetes'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Fetch solicitudes that need processing
  const { data: solicitudes, error } = await supabase
    .from('sat_solicitudes')
    .select('id, estatus, id_solicitud_sat')
    .in('estatus', ['pendiente', 'verificando', 'lista'])
    .order('created_at', { ascending: true })

  if (error || !solicitudes) {
    return NextResponse.json({ error: 'Error fetching solicitudes' }, { status: 500 })
  }

  const resultados: { id: string; accion: string; resultado: string }[] = []

  for (const sol of solicitudes) {
    try {
      if (sol.estatus === 'pendiente' || sol.estatus === 'verificando') {
        const verifyResult = await verificarSolicitud(sol.id)
        resultados.push({
          id: sol.id,
          accion: 'verificar',
          resultado: verifyResult.estatus,
        })

        // If now ready, process immediately
        if (verifyResult.estatus === 'lista') {
          const processResult = await procesarPaquetes(sol.id)
          resultados.push({
            id: sol.id,
            accion: 'procesar',
            resultado: processResult.success
              ? `${processResult.cfdisProcesados} CFDIs de ${processResult.paquetesDescargados} paquetes`
              : processResult.error || 'Error',
          })
        }
      } else if (sol.estatus === 'lista') {
        const processResult = await procesarPaquetes(sol.id)
        resultados.push({
          id: sol.id,
          accion: 'procesar',
          resultado: processResult.success
            ? `${processResult.cfdisProcesados} CFDIs de ${processResult.paquetesDescargados} paquetes`
            : processResult.error || 'Error',
        })
      }
    } catch (err) {
      resultados.push({
        id: sol.id,
        accion: sol.estatus === 'lista' ? 'procesar' : 'verificar',
        resultado: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
  }

  return NextResponse.json({
    message: `Procesadas ${solicitudes.length} solicitudes SAT`,
    resultados,
    timestamp: new Date().toISOString(),
  })
}
