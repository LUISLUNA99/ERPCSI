'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadFactura } from '@/lib/supabase/storage'
import { registrarAccion } from '@/lib/auditoria'
import { XMLParser } from 'fast-xml-parser'

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

interface CFDIData {
  uuid_cfdi?: string
  rfc_emisor?: string
  rfc_receptor?: string
  subtotal?: number
  iva_factura?: number
  total_factura?: number
  fecha_factura?: string
}

function parseCFDIXml(xmlContent: string): CFDIData {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    })
    const parsed = parser.parse(xmlContent)

    // Navigate CFDI structure - handle namespace prefixes
    const comprobante = parsed['cfdi:Comprobante'] || parsed['Comprobante'] || {}
    const emisor = comprobante['cfdi:Emisor'] || comprobante['Emisor'] || {}
    const receptor = comprobante['cfdi:Receptor'] || comprobante['Receptor'] || {}
    const complemento = comprobante['cfdi:Complemento'] || comprobante['Complemento'] || {}
    const timbre = complemento['tfd:TimbreFiscalDigital'] || complemento['TimbreFiscalDigital'] || {}

    // Extract IVA from Impuestos > Traslados
    const impuestos = comprobante['cfdi:Impuestos'] || comprobante['Impuestos'] || {}
    const traslados = impuestos['cfdi:Traslados'] || impuestos['Traslados'] || {}
    let trasladoArr = traslados['cfdi:Traslado'] || traslados['Traslado'] || []
    if (!Array.isArray(trasladoArr)) trasladoArr = [trasladoArr]
    const ivaTraslado = trasladoArr.find((t: Record<string, string>) => t['@_Impuesto'] === '002')

    return {
      uuid_cfdi: timbre['@_UUID'] || undefined,
      rfc_emisor: emisor['@_Rfc'] || undefined,
      rfc_receptor: receptor['@_Rfc'] || undefined,
      subtotal: comprobante['@_SubTotal'] ? parseFloat(comprobante['@_SubTotal']) : undefined,
      iva_factura: ivaTraslado?.['@_Importe'] ? parseFloat(ivaTraslado['@_Importe']) : undefined,
      total_factura: comprobante['@_Total'] ? parseFloat(comprobante['@_Total']) : undefined,
      fecha_factura: comprobante['@_Fecha'] ? comprobante['@_Fecha'].split('T')[0] : undefined,
    }
  } catch {
    return {}
  }
}

export async function subirFactura(requisicionId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const numeroFactura = formData.get('numero_factura') as string
  if (!numeroFactura) return { error: 'El numero de factura es obligatorio' }

  const { data: req } = await supabase
    .from('requisiciones')
    .select('estatus, folio, solicitante_id, empresa_generadora_id')
    .eq('id', requisicionId)
    .single()

  if (!req || req.estatus !== 'PAGADO') return { error: 'Solo se pueden subir facturas a solicitudes de compra pagadas' }

  // Upload PDF file
  let facturaUrl = 'sin-archivo'
  let facturaNombre = `Factura-${numeroFactura}`
  const facturaFile = formData.get('factura_file') as File | null
  if (facturaFile && facturaFile.size > 0) {
    const uploadResult = await uploadFactura(supabase, facturaFile, requisicionId, req.empresa_generadora_id)
    if ('error' in uploadResult) {
      return { error: uploadResult.error }
    }
    facturaUrl = uploadResult.url
    facturaNombre = uploadResult.nombre
  }

  // Upload and parse XML file
  let xmlUrl: string | null = null
  let cfdiData: CFDIData = {}
  const xmlFile = formData.get('xml_file') as File | null
  if (xmlFile && xmlFile.size > 0) {
    const xmlUploadResult = await uploadFactura(supabase, xmlFile, requisicionId, req.empresa_generadora_id)
    if ('error' in xmlUploadResult) {
      console.error('Error subiendo XML:', xmlUploadResult.error)
    } else {
      xmlUrl = xmlUploadResult.url
      // Parse XML content
      const xmlText = await xmlFile.text()
      cfdiData = parseCFDIXml(xmlText)
    }
  }

  const fechaFactura = cfdiData.fecha_factura || (formData.get('fecha_factura') as string) || null

  const { error: factError } = await supabase.from('facturas').insert({
    requisicion_id: requisicionId,
    subido_por_id: user.id,
    numero_factura: numeroFactura,
    factura_url: facturaUrl,
    factura_nombre: facturaNombre,
    xml_url: xmlUrl,
    uuid_cfdi: cfdiData.uuid_cfdi || null,
    rfc_emisor: cfdiData.rfc_emisor || null,
    rfc_receptor: cfdiData.rfc_receptor || null,
    subtotal: cfdiData.subtotal || null,
    iva_factura: cfdiData.iva_factura || null,
    total_factura: cfdiData.total_factura || null,
    fecha_factura: fechaFactura,
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
    comentario: `Factura ${numeroFactura} registrada${cfdiData.uuid_cfdi ? ` (UUID: ${cfdiData.uuid_cfdi})` : ''}`,
  })

  await registrarAccion({
    accion: 'subir_factura',
    modulo: 'facturas',
    descripcion: `Factura ${numeroFactura} registrada para solicitud ${req.folio}`,
    entidadTipo: 'requisicion',
    entidadId: requisicionId,
    entidadDescripcion: req.folio,
    datosNuevos: { numeroFactura, facturaUrl, xmlUrl, uuid_cfdi: cfdiData.uuid_cfdi },
  })

  revalidatePath('/facturas')
  revalidatePath('/requisiciones')
  return { success: true }
}
