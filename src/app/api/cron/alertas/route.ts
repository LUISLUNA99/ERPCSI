import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { calcularNivelAlerta } from '@/lib/alertas/factura'
import { sendEmail } from '@/lib/email/send'
import { emailAlertaFactura } from '@/lib/email/templates'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const { data: alertas, error } = await supabase
    .from('alertas_factura')
    .select('id, deadline, nivel, requisicion_id')
    .eq('resuelta', false)

  if (error || !alertas) {
    return NextResponse.json({ error: 'Error fetching alerts' }, { status: 500 })
  }

  let updated = 0

  for (const alerta of alertas) {
    const nuevoNivel = calcularNivelAlerta(new Date(alerta.deadline))

    if (nuevoNivel !== alerta.nivel) {
      await supabase
        .from('alertas_factura')
        .update({ nivel: nuevoNivel, updated_at: new Date().toISOString() })
        .eq('id', alerta.id)

      if (nuevoNivel === 'POR_VENCER' || nuevoNivel === 'VENCIDA') {
        const { data: requisicion } = await supabase
          .from('requisiciones')
          .select('folio, solicitante_id')
          .eq('id', alerta.requisicion_id)
          .single()

        if (requisicion) {
          const roles = nuevoNivel === 'VENCIDA' ? ['tesorero', 'admin', 'director'] : ['tesorero', 'admin']
          const { data: usuarios } = await supabase
            .from('perfiles')
            .select('id, email')
            .in('rol', roles)
            .eq('activo', true)

          if (usuarios) {
            const notificaciones = usuarios.map((u) => ({
              usuario_id: u.id,
              tipo: 'alerta_factura',
              titulo: nuevoNivel === 'VENCIDA'
                ? `Factura VENCIDA - ${requisicion.folio}`
                : `Factura por vencer - ${requisicion.folio}`,
              mensaje: nuevoNivel === 'VENCIDA'
                ? `La factura de ${requisicion.folio} ha vencido el plazo de entrega`
                : `Quedan menos de 2 dias para entregar la factura de ${requisicion.folio}`,
              requisicion_id: alerta.requisicion_id,
            }))

            await supabase.from('notificaciones').insert(notificaciones)

            // Enviar emails
            const emailData = emailAlertaFactura(requisicion.folio, alerta.requisicion_id, nuevoNivel)
            for (const u of usuarios) {
              sendEmail(u.email, emailData.subject, emailData.html).catch(console.error)
            }
          }
        }
      }

      updated++
    }
  }

  return NextResponse.json({
    message: `Alertas procesadas: ${alertas.length}, actualizadas: ${updated}`,
    timestamp: new Date().toISOString(),
  })
}
