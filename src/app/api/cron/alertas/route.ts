import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { calcularNivelAlerta } from '@/lib/alertas/factura'
import { sendEmail } from '@/lib/email/send'
import { emailAlertaFactura } from '@/lib/email/templates'
import { registrarAccion } from '@/lib/auditoria'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const { data: alertas, error } = await supabase
    .from('alertas_factura')
    .select('id, deadline, nivel, requisicion_id, created_at')
    .eq('resuelta', false)

  if (error || !alertas) {
    return NextResponse.json({ error: 'Error fetching alerts' }, { status: 500 })
  }

  let updated = 0
  let notificacionesPendiente3dias = 0

  for (const alerta of alertas) {
    const nuevoNivel = calcularNivelAlerta(new Date(alerta.deadline))

    // Check 3-day PENDIENTE notification
    if (nuevoNivel === 'PENDIENTE' && alerta.nivel === 'PENDIENTE') {
      const createdAt = new Date(alerta.created_at)
      const now = new Date()
      const diasDesdeCreacion = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

      if (diasDesdeCreacion >= 3) {
        // Check if we already sent this 3-day notification (avoid duplicates)
        const { data: existingNotif } = await supabase
          .from('notificaciones')
          .select('id')
          .eq('requisicion_id', alerta.requisicion_id)
          .eq('tipo', 'alerta_factura')
          .like('titulo', '%3 dias sin factura%')
          .limit(1)

        if (!existingNotif || existingNotif.length === 0) {
          const { data: requisicion } = await supabase
            .from('requisiciones')
            .select('folio')
            .eq('id', alerta.requisicion_id)
            .single()

          if (requisicion) {
            const { data: tesoreros } = await supabase
              .from('perfiles')
              .select('id, email')
              .eq('rol', 'tesorero')
              .eq('activo', true)

            if (tesoreros && tesoreros.length > 0) {
              const notificaciones = tesoreros.map((t) => ({
                usuario_id: t.id,
                tipo: 'alerta_factura',
                titulo: `3 dias sin factura - ${requisicion.folio}`,
                mensaje: `Han pasado 3 dias desde el pago de ${requisicion.folio} y aun no se ha recibido la factura. Por favor da seguimiento con el proveedor.`,
                requisicion_id: alerta.requisicion_id,
              }))

              await supabase.from('notificaciones').insert(notificaciones)
              notificacionesPendiente3dias++
            }
          }
        }
      }
    }

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

  // Audit logging
  if (alertas.length > 0) {
    try {
      await registrarAccion({
        accion: 'cron_alertas_factura',
        modulo: 'alertas',
        descripcion: `Cron alertas: ${alertas.length} revisadas, ${updated} actualizadas, ${notificacionesPendiente3dias} notificaciones de 3 dias`,
      })
    } catch {
      // Never fail the cron due to audit logging
    }
  }

  return NextResponse.json({
    message: `Alertas procesadas: ${alertas.length}, actualizadas: ${updated}, notif 3 dias: ${notificacionesPendiente3dias}`,
    timestamp: new Date().toISOString(),
  })
}
