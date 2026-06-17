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
      estatus,
      mes_servicio,
      mes_pago_deseado,
      empresas_generadora:empresas!requisiciones_empresa_generadora_id_fkey(id, nombre, codigo),
      proveedores(nombre),
      clasificaciones_gasto(nombre),
      perfiles!requisiciones_solicitante_id_fkey(nombre)
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
