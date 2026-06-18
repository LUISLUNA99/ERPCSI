'use server'

import { createClient } from '@/lib/supabase/server'

export async function getReportData() {
  const supabase = await createClient()

  const { data: requisiciones, error } = await supabase
    .from('requisiciones')
    .select(`
      id,
      folio,
      fecha_solicitud,
      concepto,
      moneda,
      importe_total,
      importe_sin_iva,
      iva,
      importe_me,
      estatus,
      mes_servicio,
      mes_pago_deseado,
      mes_provision,
      empresas_generadora:empresas!requisiciones_empresa_generadora_id_fkey(id, nombre, codigo),
      empresas_paga:empresas!requisiciones_empresa_paga_id_fkey(nombre, codigo),
      proveedores(nombre),
      clasificaciones_gasto(nombre),
      clasificacion_final:clasificaciones_gasto!requisiciones_clasificacion_final_id_fkey(nombre),
      proyectos(centro_de_costo, nombre),
      perfiles!requisiciones_solicitante_id_fkey(nombre),
      pagos(folio_bancario, observaciones_pago)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  const { data: empresas, error: empresasError } = await supabase
    .from('empresas')
    .select('id, nombre, codigo')
    .eq('activa', true)
    .order('codigo')

  if (empresasError) throw empresasError

  return { requisiciones: requisiciones || [], empresas: empresas || [] }
}
