'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadFactura } from '@/lib/supabase/storage'

export async function getRequisicionesSinFactura() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('requisiciones')
    .select(`
      *,
      proveedores(nombre),
      empresas_generadora:empresas!requisiciones_empresa_generadora_id_fkey(nombre, codigo),
      perfiles!requisiciones_solicitante_id_fkey(nombre),
      pagos(fecha_pago, folio_bancario),
      alertas_factura(deadline, nivel, resuelta)
    `)
    .eq('estatus', 'PAGADO')
    .eq('tiene_factura_inicial', false)
    .order('created_at', { ascending: false })

  if (perfil?.rol === 'operario') {
    query = query.eq('solicitante_id', user.id)
  }

  const { data, error } = await query
  if (error) return []
  return data
}

export async function subirFactura(requisicionId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const numeroFactura = formData.get('numero_factura') as string
  if (!numeroFactura) return { error: 'El numero de factura es obligatorio' }

  const { data: req } = await supabase
    .from('requisiciones')
    .select('estatus, folio, solicitante_id')
    .eq('id', requisicionId)
    .single()

  if (!req || req.estatus !== 'PAGADO') return { error: 'Solo se pueden subir facturas a solicitudes de compra pagadas' }

  // Subir archivo si se adjunto
  let facturaUrl = 'sin-archivo'
  let facturaNombre = `Factura-${numeroFactura}`
  const facturaFile = formData.get('factura_file') as File | null
  if (facturaFile && facturaFile.size > 0) {
    const uploadResult = await uploadFactura(supabase, facturaFile, requisicionId)
    if ('error' in uploadResult) {
      return { error: uploadResult.error }
    }
    facturaUrl = uploadResult.url
    facturaNombre = uploadResult.nombre
  }

  const { error: factError } = await supabase.from('facturas').insert({
    requisicion_id: requisicionId,
    subido_por_id: user.id,
    numero_factura: numeroFactura,
    factura_url: facturaUrl,
    factura_nombre: facturaNombre,
    fecha_factura: formData.get('fecha_factura') || null,
  })
  if (factError) return { error: 'Error al registrar la factura' }

  await supabase.from('requisiciones').update({
    estatus: 'COMPROBADO',
    tiene_factura_inicial: true,
    numero_factura_inicial: numeroFactura,
    factura_inicial_url: facturaUrl,
    factura_inicial_nombre: facturaNombre,
  }).eq('id', requisicionId)

  await supabase.from('alertas_factura').update({ resuelta: true }).eq('requisicion_id', requisicionId)

  await supabase.from('historial_requisiciones').insert({
    requisicion_id: requisicionId,
    usuario_id: user.id,
    estatus_anterior: 'PAGADO',
    estatus_nuevo: 'COMPROBADO',
    comentario: `Factura ${numeroFactura} registrada`,
  })

  revalidatePath('/facturas')
  revalidatePath('/requisiciones')
  return { success: true }
}
