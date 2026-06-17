'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { emailRequisicionAprobada, emailRequisicionRechazada } from '@/lib/email/templates'

export async function aprobarRequisicion(requisicionId: string, observaciones?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: req } = await supabase
    .from('requisiciones')
    .select('estatus, folio, solicitante_id')
    .eq('id', requisicionId)
    .single()

  if (!req) return { error: 'Solicitud de compra no encontrada' }
  if (req.estatus !== 'EN_REVISION') return { error: 'Esta solicitud de compra no esta pendiente de aprobacion' }

  const { error: apError } = await supabase.from('aprobaciones').insert({
    requisicion_id: requisicionId,
    director_id: user.id,
    decision: 'APROBADO',
    observaciones: observaciones || null,
  })
  if (apError) return { error: 'Error al registrar la aprobacion' }

  const { error } = await supabase
    .from('requisiciones')
    .update({ estatus: 'APROBADO' })
    .eq('id', requisicionId)
  if (error) return { error: 'Error al actualizar la solicitud de compra' }

  await supabase.from('historial_requisiciones').insert({
    requisicion_id: requisicionId,
    usuario_id: user.id,
    estatus_anterior: 'EN_REVISION',
    estatus_nuevo: 'APROBADO',
    comentario: observaciones || 'Solicitud de compra aprobada',
  })

  // Notificar al solicitante y tesoreros
  const { data: tesoreros } = await supabase
    .from('perfiles')
    .select('id')
    .in('rol', ['admin', 'tesorero'])
    .eq('activo', true)

  const destinatarios = [
    { usuario_id: req.solicitante_id, tipo: 'aprobacion', titulo: 'Solicitud de compra aprobada', mensaje: `Tu solicitud de compra ${req.folio} ha sido aprobada.` },
    ...(tesoreros || []).map((t) => ({
      usuario_id: t.id,
      tipo: 'aprobacion',
      titulo: 'Solicitud de compra lista para pago',
      mensaje: `La solicitud de compra ${req.folio} fue aprobada y esta lista para programar pago.`,
    })),
  ]

  await supabase.from('notificaciones').insert(
    destinatarios.map((d) => ({ ...d, requisicion_id: requisicionId }))
  )

  // Email al solicitante
  const { data: solicitante } = await supabase.from('perfiles').select('email').eq('id', req.solicitante_id).single()
  if (solicitante) {
    const emailData = emailRequisicionAprobada(req.folio, requisicionId)
    sendEmail(solicitante.email, emailData.subject, emailData.html).catch(console.error)
  }

  revalidatePath('/aprobaciones')
  revalidatePath('/requisiciones')
  revalidatePath('/pagos')
  return { success: true }
}

export async function rechazarRequisicion(requisicionId: string, motivo: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!motivo || motivo.trim().length === 0) {
    return { error: 'El motivo de rechazo es obligatorio' }
  }

  const { data: req } = await supabase
    .from('requisiciones')
    .select('estatus, folio, solicitante_id')
    .eq('id', requisicionId)
    .single()

  if (!req) return { error: 'Solicitud de compra no encontrada' }
  if (req.estatus !== 'EN_REVISION') return { error: 'Esta solicitud de compra no esta pendiente de aprobacion' }

  await supabase.from('aprobaciones').insert({
    requisicion_id: requisicionId,
    director_id: user.id,
    decision: 'RECHAZADO',
    observaciones: motivo,
  })

  const { error } = await supabase
    .from('requisiciones')
    .update({ estatus: 'RECHAZADO' })
    .eq('id', requisicionId)
  if (error) return { error: 'Error al rechazar la solicitud de compra' }

  await supabase.from('historial_requisiciones').insert({
    requisicion_id: requisicionId,
    usuario_id: user.id,
    estatus_anterior: 'EN_REVISION',
    estatus_nuevo: 'RECHAZADO',
    comentario: motivo,
  })

  // Notificar al solicitante
  await supabase.from('notificaciones').insert({
    usuario_id: req.solicitante_id,
    tipo: 'rechazo',
    titulo: 'Solicitud de compra rechazada',
    mensaje: `Tu solicitud de compra ${req.folio} fue rechazada. Motivo: ${motivo}`,
    requisicion_id: requisicionId,
  })

  // Email al solicitante
  const { data: solicitante } = await supabase.from('perfiles').select('email').eq('id', req.solicitante_id).single()
  if (solicitante) {
    const emailData = emailRequisicionRechazada(req.folio, requisicionId, motivo)
    sendEmail(solicitante.email, emailData.subject, emailData.html).catch(console.error)
  }

  revalidatePath('/aprobaciones')
  revalidatePath('/requisiciones')
  return { success: true }
}

export async function cancelarRequisicion(requisicionId: string, motivo: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: req } = await supabase
    .from('requisiciones')
    .select('estatus, folio, solicitante_id')
    .eq('id', requisicionId)
    .single()

  if (!req) return { error: 'Solicitud de compra no encontrada' }
  if (req.estatus === 'CANCELADO' || req.estatus === 'COMPROBADO') {
    return { error: 'No se puede cancelar esta solicitud de compra' }
  }

  const { error } = await supabase
    .from('requisiciones')
    .update({ estatus: 'CANCELADO' })
    .eq('id', requisicionId)
  if (error) return { error: 'Error al cancelar' }

  await supabase.from('historial_requisiciones').insert({
    requisicion_id: requisicionId,
    usuario_id: user.id,
    estatus_anterior: req.estatus,
    estatus_nuevo: 'CANCELADO',
    comentario: motivo || 'Solicitud de compra cancelada',
  })

  revalidatePath('/aprobaciones')
  revalidatePath('/requisiciones')
  return { success: true }
}
