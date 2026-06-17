'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generarFolio } from '@/lib/utils/folio'
import { uploadFactura } from '@/lib/supabase/storage'
import { sendEmail } from '@/lib/email/send'
import { emailRequisicionEnviada } from '@/lib/email/templates'
import { z } from 'zod'

const requisicionSchema = z.object({
  clasificacion_id: z.string().min(1, 'Selecciona una clasificacion'),
  mes_servicio: z.string().min(1, 'Selecciona el mes del servicio'),
  mes_pago_deseado: z.string().min(1, 'Selecciona el mes de pago deseado'),
  empresa_generadora_id: z.string().min(1, 'Selecciona la empresa generadora'),
  empresa_paga_id: z.string().min(1, 'Selecciona la empresa que paga'),
  proyecto_id: z.string().optional(),
  proveedor_id: z.string().optional(),
  concepto: z.string().min(1, 'El concepto es obligatorio').max(500),
  moneda: z.enum(['MXN', 'USD', 'EUR']).default('MXN'),
  importe_sin_iva: z.number().min(0, 'El importe debe ser mayor a $0'),
  iva: z.number().min(0),
  importe_total: z.number().min(0.01, 'El importe total debe ser mayor a $0'),
  tipo_cambio: z.number().min(0).default(1),
  importe_me: z.number().optional(),
  motivo_sin_factura: z.string().optional(),
  observaciones_solicitante: z.string().optional(),
})

export async function getRequisiciones(filters?: {
  estatus?: string
  solicitante_id?: string
  empresa_id?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('requisiciones')
    .select(`
      *,
      empresas_generadora:empresas!requisiciones_empresa_generadora_id_fkey(nombre, codigo),
      empresas_paga:empresas!requisiciones_empresa_paga_id_fkey(nombre, codigo),
      proveedores(nombre),
      clasificaciones_gasto(nombre),
      proyectos(centro_de_costo, nombre),
      perfiles!requisiciones_solicitante_id_fkey(nombre)
    `)
    .order('created_at', { ascending: false })

  if (filters?.estatus) query = query.eq('estatus', filters.estatus)
  if (filters?.solicitante_id) query = query.eq('solicitante_id', filters.solicitante_id)
  if (filters?.empresa_id) query = query.eq('empresa_generadora_id', filters.empresa_id)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getRequisicionById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('requisiciones')
    .select(`
      *,
      empresas_generadora:empresas!requisiciones_empresa_generadora_id_fkey(nombre, codigo),
      empresas_paga:empresas!requisiciones_empresa_paga_id_fkey(nombre, codigo),
      proveedores(nombre, rfc, banco, clabe),
      clasificaciones_gasto(nombre),
      proyectos(centro_de_costo, nombre),
      perfiles!requisiciones_solicitante_id_fkey(nombre, email),
      aprobaciones(id, decision, observaciones, fecha, director:perfiles!aprobaciones_director_id_fkey(nombre)),
      pagos(id, fecha_programada, fecha_pago, folio_bancario, banco_empresa:bancos_empresa(banco, numero_cuenta)),
      facturas(id, numero_factura, factura_url, created_at),
      historial_requisiciones(id, estatus_anterior, estatus_nuevo, comentario, created_at, perfiles!historial_requisiciones_usuario_id_fkey(nombre))
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createRequisicion(formData: FormData, enviar: boolean = false) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const raw = {
    clasificacion_id: formData.get('clasificacion_id') as string,
    mes_servicio: formData.get('mes_servicio') as string,
    mes_pago_deseado: formData.get('mes_pago_deseado') as string,
    empresa_generadora_id: formData.get('empresa_generadora_id') as string,
    empresa_paga_id: formData.get('empresa_paga_id') as string,
    proyecto_id: (formData.get('proyecto_id') as string) || undefined,
    proveedor_id: (formData.get('proveedor_id') as string) || undefined,
    concepto: formData.get('concepto') as string,
    moneda: (formData.get('moneda') as string) || 'MXN',
    importe_sin_iva: parseFloat(formData.get('importe_sin_iva') as string) || 0,
    iva: parseFloat(formData.get('iva') as string) || 0,
    importe_total: parseFloat(formData.get('importe_total') as string) || 0,
    tipo_cambio: parseFloat(formData.get('tipo_cambio') as string) || 1,
    importe_me: parseFloat(formData.get('importe_me') as string) || undefined,
    motivo_sin_factura: (formData.get('motivo_sin_factura') as string) || undefined,
    observaciones_solicitante: (formData.get('observaciones_solicitante') as string) || undefined,
  }

  const parsed = requisicionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const folio = await generarFolio(supabase)

  const { data, error } = await supabase
    .from('requisiciones')
    .insert({
      ...parsed.data,
      folio,
      solicitante_id: user.id,
      estatus: enviar ? 'EN_REVISION' : 'BORRADOR',
      proyecto_id: parsed.data.proyecto_id || null,
      proveedor_id: parsed.data.proveedor_id || null,
    })
    .select('id')
    .single()

  if (error) return { error: 'Error al crear la solicitud de compra: ' + error.message }

  // Subir factura si se adjunto
  const facturaFile = formData.get('factura_file') as File | null
  if (facturaFile && facturaFile.size > 0) {
    const uploadResult = await uploadFactura(supabase, facturaFile, data.id)
    if ('error' in uploadResult) {
      console.error('Error subiendo factura:', uploadResult.error)
    } else {
      await supabase.from('requisiciones').update({
        tiene_factura_inicial: true,
        factura_inicial_url: uploadResult.url,
        factura_inicial_nombre: uploadResult.nombre,
      }).eq('id', data.id)

      await supabase.from('facturas').insert({
        requisicion_id: data.id,
        subido_por_id: user.id,
        factura_url: uploadResult.url,
        factura_nombre: uploadResult.nombre,
      })
    }
  }

  // Registrar en historial
  await supabase.from('historial_requisiciones').insert({
    requisicion_id: data.id,
    usuario_id: user.id,
    estatus_anterior: null,
    estatus_nuevo: enviar ? 'EN_REVISION' : 'BORRADOR',
    comentario: enviar ? 'Solicitud de compra enviada para aprobacion' : 'Solicitud de compra creada como borrador',
  })

  // Si se envia, notificar a directores
  if (enviar) {
    const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single()
    const { data: directores } = await supabase
      .from('perfiles')
      .select('id, email')
      .in('rol', ['admin', 'director'])
      .eq('activo', true)

    if (directores) {
      const notificaciones = directores.map((d) => ({
        usuario_id: d.id,
        tipo: 'nueva_requisicion',
        titulo: 'Nueva solicitud de compra pendiente',
        mensaje: `Se ha enviado la solicitud de compra ${folio} para tu aprobacion.`,
        requisicion_id: data.id,
      }))
      await supabase.from('notificaciones').insert(notificaciones)

      // Email a directores
      const emailData = emailRequisicionEnviada(folio, data.id, perfil?.nombre || 'Usuario')
      for (const d of directores) {
        sendEmail(d.email, emailData.subject, emailData.html).catch(console.error)
      }
    }
  }

  revalidatePath('/requisiciones')
  revalidatePath('/aprobaciones')
  return { success: true, id: data.id, folio }
}

export async function enviarRequisicion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: req } = await supabase
    .from('requisiciones')
    .select('estatus, folio')
    .eq('id', id)
    .single()

  if (!req) return { error: 'Solicitud de compra no encontrada' }
  if (req.estatus !== 'BORRADOR' && req.estatus !== 'RECHAZADO') {
    return { error: 'Solo se pueden enviar solicitudes de compra en borrador o rechazadas' }
  }

  const { error } = await supabase
    .from('requisiciones')
    .update({ estatus: 'EN_REVISION' })
    .eq('id', id)

  if (error) return { error: 'Error al enviar la solicitud de compra' }

  await supabase.from('historial_requisiciones').insert({
    requisicion_id: id,
    usuario_id: user.id,
    estatus_anterior: req.estatus,
    estatus_nuevo: 'EN_REVISION',
    comentario: req.estatus === 'RECHAZADO' ? 'Solicitud de compra reenviada para aprobacion' : 'Solicitud de compra enviada para aprobacion',
  })

  // Notificar directores
  const { data: directores } = await supabase
    .from('perfiles')
    .select('id')
    .in('rol', ['admin', 'director'])
    .eq('activo', true)

  if (directores) {
    const notificaciones = directores.map((d) => ({
      usuario_id: d.id,
      tipo: 'nueva_requisicion',
      titulo: 'Solicitud de compra pendiente de aprobacion',
      mensaje: `La solicitud de compra ${req.folio} requiere tu aprobacion.`,
      requisicion_id: id,
    }))
    await supabase.from('notificaciones').insert(notificaciones)
  }

  revalidatePath('/requisiciones')
  revalidatePath('/aprobaciones')
  return { success: true }
}
