'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadComprobante } from '@/lib/supabase/storage'
import { sendEmail } from '@/lib/email/send'
import { emailPagoEjecutado } from '@/lib/email/templates'
import { registrarAccion } from '@/lib/auditoria'

export async function getRequisicionesPorPagar() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('requisiciones')
    .select(`
      *,
      empresas_generadora:empresas!requisiciones_empresa_generadora_id_fkey(nombre, codigo),
      empresas_paga:empresas!requisiciones_empresa_paga_id_fkey(nombre, codigo),
      proveedores(nombre),
      clasificaciones_gasto(nombre),
      clasificacion_final:clasificaciones_gasto!requisiciones_clasificacion_final_id_fkey(nombre),
      perfiles!requisiciones_solicitante_id_fkey(nombre),
      pagos(id, fecha_programada, banco_empresa:bancos_empresa(banco, numero_cuenta))
    `)
    .in('estatus', ['APROBADO', 'PROGRAMADO'])
    .order('mes_pago_deseado')

  if (error) throw error
  return data
}

export async function programarPago(requisicionId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const bancoEmpresaId = formData.get('banco_empresa_id') as string
  const fechaProgramada = formData.get('fecha_programada') as string
  const observaciones = formData.get('observaciones') as string

  if (!bancoEmpresaId) return { error: 'Selecciona la cuenta bancaria' }
  if (!fechaProgramada) return { error: 'Indica la fecha programada' }

  const { data: req } = await supabase
    .from('requisiciones')
    .select('estatus, folio, solicitante_id')
    .eq('id', requisicionId)
    .single()

  if (!req || req.estatus !== 'APROBADO') return { error: 'La solicitud de compra no esta aprobada' }

  const { error: pagoError } = await supabase.from('pagos').insert({
    requisicion_id: requisicionId,
    tesorero_id: user.id,
    banco_empresa_id: bancoEmpresaId,
    fecha_programada: fechaProgramada,
    observaciones_programacion: observaciones || null,
  })
  if (pagoError) return { error: 'Error al programar pago: ' + pagoError.message }

  const reqUpdate: Record<string, string | null> = { estatus: 'PROGRAMADO' }
  const mesProvision = formData.get('mes_provision') as string
  const clasificacionFinalId = formData.get('clasificacion_final_id') as string
  if (mesProvision) reqUpdate.mes_provision = mesProvision
  if (clasificacionFinalId) reqUpdate.clasificacion_final_id = clasificacionFinalId
  await supabase.from('requisiciones').update(reqUpdate).eq('id', requisicionId)

  await supabase.from('historial_requisiciones').insert({
    requisicion_id: requisicionId,
    usuario_id: user.id,
    estatus_anterior: 'APROBADO',
    estatus_nuevo: 'PROGRAMADO',
    comentario: `Pago programado para ${fechaProgramada}`,
  })

  await supabase.from('notificaciones').insert({
    usuario_id: req.solicitante_id,
    tipo: 'pago',
    titulo: 'Pago programado',
    mensaje: `El pago de tu solicitud de compra ${req.folio} ha sido programado para el ${fechaProgramada}.`,
    requisicion_id: requisicionId,
  })

  await registrarAccion({
    accion: 'programar_pago',
    modulo: 'pagos',
    descripcion: `Pago programado para solicitud ${req.folio} el ${fechaProgramada}`,
    entidadTipo: 'requisicion',
    entidadId: requisicionId,
    entidadDescripcion: req.folio,
    datosNuevos: { bancoEmpresaId, fechaProgramada },
  })

  revalidatePath('/pagos')
  revalidatePath('/requisiciones')
  return { success: true }
}

export async function ejecutarPago(requisicionId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const fechaPago = formData.get('fecha_pago') as string
  const folioBancario = formData.get('folio_bancario') as string
  const tipoCambioReal = parseFloat(formData.get('tipo_cambio_real') as string) || null
  const importeRealMxn = parseFloat(formData.get('importe_real_mxn') as string) || null
  const observaciones = formData.get('observaciones_pago') as string

  if (!fechaPago) return { error: 'La fecha de pago es obligatoria' }
  if (!folioBancario) return { error: 'El folio bancario es obligatorio' }

  const { data: req } = await supabase
    .from('requisiciones')
    .select('estatus, folio, solicitante_id, tiene_factura_inicial')
    .eq('id', requisicionId)
    .single()

  if (!req || req.estatus !== 'PROGRAMADO') return { error: 'La solicitud de compra no esta programada' }

  // Subir comprobante si se adjunto
  let comprobanteUrl: string | null = null
  let comprobanteNombre: string | null = null
  const comprobanteFile = formData.get('comprobante_file') as File | null
  if (comprobanteFile && comprobanteFile.size > 0) {
    const uploadResult = await uploadComprobante(supabase, comprobanteFile, requisicionId)
    if ('error' in uploadResult) {
      console.error('Error subiendo comprobante:', uploadResult.error)
    } else {
      comprobanteUrl = uploadResult.url
      comprobanteNombre = uploadResult.nombre
    }
  }

  const { data: pago, error: pagoError } = await supabase
    .from('pagos')
    .update({
      fecha_pago: fechaPago,
      folio_bancario: folioBancario,
      tipo_cambio_real: tipoCambioReal,
      importe_real_mxn: importeRealMxn,
      observaciones_pago: observaciones || null,
      comprobante_url: comprobanteUrl,
      comprobante_nombre: comprobanteNombre,
    })
    .eq('requisicion_id', requisicionId)
    .select('id')
    .single()

  if (pagoError) return { error: 'Error al registrar pago' }

  const nuevoEstatus = req.tiene_factura_inicial ? 'COMPROBADO' : 'PAGADO'
  const reqUpdate2: Record<string, string | null> = { estatus: nuevoEstatus }
  const mesProvisionEj = formData.get('mes_provision') as string
  const clasificacionFinalEj = formData.get('clasificacion_final_id') as string
  if (mesProvisionEj) reqUpdate2.mes_provision = mesProvisionEj
  if (clasificacionFinalEj) reqUpdate2.clasificacion_final_id = clasificacionFinalEj
  await supabase.from('requisiciones').update(reqUpdate2).eq('id', requisicionId)

  await supabase.from('historial_requisiciones').insert({
    requisicion_id: requisicionId,
    usuario_id: user.id,
    estatus_anterior: 'PROGRAMADO',
    estatus_nuevo: nuevoEstatus,
    comentario: `Pago ejecutado. Folio bancario: ${folioBancario}`,
  })

  // Si no tiene factura, crear alerta
  if (!req.tiene_factura_inicial && pago) {
    const fechaPagoDate = new Date(fechaPago)
    const mas7dias = new Date(fechaPagoDate)
    mas7dias.setDate(mas7dias.getDate() + 7)
    const finDeMes = new Date(fechaPagoDate.getFullYear(), fechaPagoDate.getMonth() + 1, 0)
    const deadline = mas7dias < finDeMes ? mas7dias : finDeMes

    await supabase.from('alertas_factura').insert({
      requisicion_id: requisicionId,
      pago_id: pago.id,
      deadline: deadline.toISOString().split('T')[0],
      nivel: 'PENDIENTE',
    })
  }

  // Notificar solicitante
  await supabase.from('notificaciones').insert({
    usuario_id: req.solicitante_id,
    tipo: 'pago',
    titulo: 'Pago realizado',
    mensaje: `El pago de tu solicitud de compra ${req.folio} ha sido realizado. Folio bancario: ${folioBancario}.${!req.tiene_factura_inicial ? ' Por favor sube la factura.' : ''}`,
    requisicion_id: requisicionId,
  })

  // Email al solicitante
  const { data: solicitante } = await supabase.from('perfiles').select('email').eq('id', req.solicitante_id).single()
  if (solicitante) {
    const emailData = emailPagoEjecutado(req.folio, requisicionId, folioBancario)
    sendEmail(solicitante.email, emailData.subject, emailData.html).catch(console.error)
  }

  await registrarAccion({
    accion: 'ejecutar_pago',
    modulo: 'pagos',
    descripcion: `Pago ejecutado para solicitud ${req.folio}. Folio bancario: ${folioBancario}`,
    entidadTipo: 'requisicion',
    entidadId: requisicionId,
    entidadDescripcion: req.folio,
    datosNuevos: { fechaPago, folioBancario, tipoCambioReal, importeRealMxn },
  })

  revalidatePath('/pagos')
  revalidatePath('/requisiciones')
  revalidatePath('/facturas')
  return { success: true }
}
