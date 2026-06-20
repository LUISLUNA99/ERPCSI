import { XMLParser } from 'fast-xml-parser'

const MESES_MAP: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
}

export function parsearCFDI(
  xmlContent: string,
  empresaId: string,
  solicitudId: string | null,
  archivoId: string | null,
  tipoCfdi: 'EMITIDA' | 'RECIBIDA',
  mesPeriodo: string | null,
  anioPeriodo: number | null
): Record<string, unknown> | null {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: () => false,
    })

    const parsed = parser.parse(xmlContent)

    const comprobante = parsed['cfdi:Comprobante'] || parsed['Comprobante'] || parsed['cfdi:comprobante']
    if (!comprobante) return null

    const emisor = comprobante['cfdi:Emisor'] || comprobante['Emisor'] || {}
    const receptor = comprobante['cfdi:Receptor'] || comprobante['Receptor'] || {}
    const complemento = comprobante['cfdi:Complemento'] || comprobante['Complemento'] || {}
    const timbreFiscal = complemento['tfd:TimbreFiscalDigital'] || complemento['TimbreFiscalDigital'] || {}

    const uuid = timbreFiscal['@_UUID'] || timbreFiscal['@_uuid'] || ''
    if (!uuid) return null

    // Extract impuestos (traslados y retenciones)
    let iva = 0
    let isrRetenido = 0
    let ivaRetenido = 0
    const impuestosNode = comprobante['cfdi:Impuestos'] || comprobante['Impuestos']
    const impuestosJson: Record<string, unknown> = {}

    if (impuestosNode) {
      const traslados = impuestosNode['cfdi:Traslados'] || impuestosNode['Traslados']
      if (traslados) {
        const traslado = traslados['cfdi:Traslado'] || traslados['Traslado']
        if (traslado) {
          const trasladoArr = Array.isArray(traslado) ? traslado : [traslado]
          impuestosJson.traslados = trasladoArr
          for (const t of trasladoArr) {
            if (t['@_Impuesto'] === '002') {
              iva += parseFloat(t['@_Importe'] || '0')
            }
          }
        }
      }

      const retenciones = impuestosNode['cfdi:Retenciones'] || impuestosNode['Retenciones']
      if (retenciones) {
        const retencion = retenciones['cfdi:Retencion'] || retenciones['Retencion']
        if (retencion) {
          const retencionArr = Array.isArray(retencion) ? retencion : [retencion]
          impuestosJson.retenciones = retencionArr
          for (const r of retencionArr) {
            if (r['@_Impuesto'] === '001') {
              isrRetenido += parseFloat(r['@_Importe'] || '0')
            } else if (r['@_Impuesto'] === '002') {
              ivaRetenido += parseFloat(r['@_Importe'] || '0')
            }
          }
        }
      }
    }

    // Extract conceptos
    const conceptosNode = comprobante['cfdi:Conceptos'] || comprobante['Conceptos']
    let conceptosJson: unknown[] = []
    if (conceptosNode) {
      const concepto = conceptosNode['cfdi:Concepto'] || conceptosNode['Concepto']
      if (concepto) {
        const conceptoArr = Array.isArray(concepto) ? concepto : [concepto]
        conceptosJson = conceptoArr.map((c: Record<string, unknown>) => ({
          clave_prod_serv: c['@_ClaveProdServ'] || null,
          cantidad: parseFloat(String(c['@_Cantidad'] || '0')),
          clave_unidad: c['@_ClaveUnidad'] || null,
          unidad: c['@_Unidad'] || null,
          descripcion: c['@_Descripcion'] || null,
          valor_unitario: parseFloat(String(c['@_ValorUnitario'] || '0')),
          importe: parseFloat(String(c['@_Importe'] || '0')),
          descuento: parseFloat(String(c['@_Descuento'] || '0')),
        }))
      }
    }

    // Extract complementos
    let complementosJson: Record<string, unknown> | null = null
    if (complemento && Object.keys(complemento).length > 1) {
      const { 'tfd:TimbreFiscalDigital': _tfd, 'TimbreFiscalDigital': _tfd2, ...rest } = complemento as Record<string, unknown>
      if (Object.keys(rest).length > 0) {
        complementosJson = rest
      }
    }

    const total = parseFloat(comprobante['@_Total'] || '0')
    const tipoCambio = parseFloat(comprobante['@_TipoCambio'] || '1')
    const moneda = comprobante['@_Moneda'] || 'MXN'
    const totalMxn = moneda === 'MXN' ? total : total * tipoCambio

    const fechaEmision = comprobante['@_Fecha'] || null
    let periodo = mesPeriodo ? `${mesPeriodo}-${anioPeriodo}` : null
    let anio = anioPeriodo
    let mes = mesPeriodo ? (MESES_MAP[mesPeriodo] || null) : null

    if (fechaEmision && !periodo) {
      const d = new Date(fechaEmision)
      anio = d.getFullYear()
      mes = d.getMonth() + 1
      const mesKeys = Object.keys(MESES_MAP)
      periodo = `${mesKeys[mes - 1]}-${anio}`
    }

    return {
      empresa_id: empresaId,
      solicitud_id: solicitudId,
      archivo_id: archivoId,
      tipo: tipoCfdi,
      uuid,
      fecha_emision: fechaEmision,
      rfc_emisor: emisor['@_Rfc'] || emisor['@_rfc'] || null,
      nombre_emisor: emisor['@_Nombre'] || emisor['@_nombre'] || null,
      rfc_receptor: receptor['@_Rfc'] || receptor['@_rfc'] || null,
      nombre_receptor: receptor['@_Nombre'] || receptor['@_nombre'] || null,
      serie: comprobante['@_Serie'] || null,
      folio: comprobante['@_Folio'] || null,
      forma_pago: comprobante['@_FormaPago'] || null,
      metodo_pago: comprobante['@_MetodoPago'] || null,
      uso_cfdi: receptor['@_UsoCFDI'] || null,
      lugar_expedicion: comprobante['@_LugarExpedicion'] || null,
      moneda,
      tipo_cambio: tipoCambio,
      tipo_comprobante: comprobante['@_TipoDeComprobante'] || null,
      subtotal: parseFloat(comprobante['@_SubTotal'] || '0'),
      descuento: parseFloat(comprobante['@_Descuento'] || '0'),
      iva,
      isr_retenido: isrRetenido,
      iva_retenido: ivaRetenido,
      total,
      total_mxn: totalMxn,
      estatus_sat: 'Vigente',
      conceptos: conceptosJson.length > 0 ? conceptosJson : null,
      impuestos: Object.keys(impuestosJson).length > 0 ? impuestosJson : null,
      complementos: complementosJson,
      periodo,
      anio,
      mes,
      xml_raw: xmlContent,
    }
  } catch {
    return null
  }
}
