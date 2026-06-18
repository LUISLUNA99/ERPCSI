'use server'

import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { registrarAccion } from '@/lib/auditoria'
import {
  Fiel,
  FielRequestBuilder,
  Service,
  ServiceEndpoints,
  HttpsWebClient,
  QueryParameters,
  DateTimePeriod,
  DateTime,
  DownloadType,
  RequestType,
  ServiceType,
  DocumentStatus,
} from '@nodecfdi/sat-ws-descarga-masiva'

interface SolicitudParams {
  empresaId: string
  fechaInicio: Date
  fechaFin: Date
  tipo: 'emitidas' | 'recibidas'
  formato: 'xml' | 'metadata'
}

async function obtenerCredencialesSAT(empresaId: string) {
  const supabase = await createClient()

  const { data: empresa, error } = await supabase
    .from('empresas')
    .select('id, codigo, nombre, rfc, sat_cert_url, sat_key_url, sat_password_encrypted, sat_configurado')
    .eq('id', empresaId)
    .single()

  if (error || !empresa) throw new Error('Empresa no encontrada')
  if (!empresa.sat_configurado) throw new Error(`La empresa ${empresa.codigo} no tiene configuracion SAT`)
  if (!empresa.sat_cert_url || !empresa.sat_key_url || !empresa.sat_password_encrypted) {
    throw new Error('Faltan archivos de e.firma para la empresa')
  }

  // Download cert and key from Storage
  const { data: certData, error: certErr } = await supabase.storage
    .from('sat-certs')
    .download(empresa.sat_cert_url)
  if (certErr || !certData) throw new Error('Error al descargar certificado .cer')

  const { data: keyData, error: keyErr } = await supabase.storage
    .from('sat-certs')
    .download(empresa.sat_key_url)
  if (keyErr || !keyData) throw new Error('Error al descargar clave privada .key')

  const certContents = Buffer.from(await certData.arrayBuffer()).toString('binary')
  const keyContents = Buffer.from(await keyData.arrayBuffer()).toString('binary')
  const password = decrypt(empresa.sat_password_encrypted)

  return { empresa, certContents, keyContents, password }
}

function crearServicioSAT(certContents: string, keyContents: string, password: string, tipo: 'emitidas' | 'recibidas') {
  const fiel = Fiel.create(certContents, keyContents, password)
  if (!fiel.isValid()) {
    throw new Error('La e.firma (FIEL) no es valida. Verifica el certificado, clave y contrasena.')
  }

  const requestBuilder = new FielRequestBuilder(fiel)
  const webClient = new HttpsWebClient()
  const endpoints = ServiceEndpoints.cfdi()

  return new Service(requestBuilder, webClient, null, endpoints)
}

export async function solicitarDescarga(params: SolicitudParams): Promise<{ id: string; idSolicitudSat: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const { empresa, certContents, keyContents, password } = await obtenerCredencialesSAT(params.empresaId)

    const service = crearServicioSAT(certContents, keyContents, password, params.tipo)

    // Authenticate
    await service.authenticate()

    // Build query parameters
    const period = DateTimePeriod.create(
      DateTime.create(params.fechaInicio.toISOString()),
      DateTime.create(params.fechaFin.toISOString()),
    )

    const downloadType = params.tipo === 'emitidas'
      ? new DownloadType('issued')
      : new DownloadType('received')

    const requestType = params.formato === 'xml'
      ? new RequestType('xml')
      : new RequestType('metadata')

    let queryParams = QueryParameters.create(
      period,
      downloadType,
      requestType,
      new ServiceType('cfdi'),
    )

    // SAT v1.5: recibidas con estado 'Todos' causa error 301
    // Forzar filtro 'active' (Vigentes) para recibidas
    if (params.tipo === 'recibidas') {
      queryParams = queryParams.withDocumentStatus(new DocumentStatus('active'))
    }

    // Submit query to SAT
    const queryResult = await service.query(queryParams)

    if (!queryResult.getRequestId()) {
      const statusMsg = JSON.stringify(queryResult.getStatus())
      return { error: `El SAT rechazo la solicitud: ${statusMsg}` }
    }

    const idSolicitudSat = queryResult.getRequestId()

    // Save to our database
    const { data: solicitud, error: dbError } = await supabase
      .from('sat_solicitudes')
      .insert({
        empresa_id: params.empresaId,
        id_solicitud_sat: idSolicitudSat,
        fecha_inicio: params.fechaInicio.toISOString().split('T')[0],
        fecha_fin: params.fechaFin.toISOString().split('T')[0],
        tipo: params.tipo,
        formato: params.formato,
        estatus: 'pendiente',
        solicitado_por_id: user.id,
      })
      .select('id')
      .single()

    if (dbError || !solicitud) {
      return { error: 'Error al guardar la solicitud en la base de datos' }
    }

    await registrarAccion({
      accion: 'solicitar_descarga_sat',
      modulo: 'sat',
      descripcion: `Descarga SAT solicitada para ${empresa.codigo}: ${params.tipo} del ${params.fechaInicio.toISOString().split('T')[0]} al ${params.fechaFin.toISOString().split('T')[0]}`,
      entidadTipo: 'sat_solicitud',
      entidadId: solicitud.id,
      entidadDescripcion: idSolicitudSat,
      datosNuevos: { tipo: params.tipo, formato: params.formato, fechaInicio: params.fechaInicio, fechaFin: params.fechaFin },
    })

    return { id: solicitud.id, idSolicitudSat }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'

    await registrarAccion({
      accion: 'solicitar_descarga_sat',
      modulo: 'sat',
      descripcion: `Error al solicitar descarga SAT: ${errorMsg}`,
      entidadTipo: 'empresa',
      entidadId: params.empresaId,
      resultado: 'fallido',
      metadata: { error: errorMsg },
    })

    return { error: errorMsg }
  }
}

export { obtenerCredencialesSAT, crearServicioSAT }
