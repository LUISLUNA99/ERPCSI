import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEmpresas } from '@/app/actions/empresas.actions'
import { getProveedores } from '@/app/actions/proveedores.actions'
import { getClasificaciones } from '@/app/actions/clasificaciones.actions'
import { getProyectos } from '@/app/actions/proyectos.actions'
import { NuevaRequisicionForm } from './NuevaRequisicionForm'

export default async function NuevaRequisicionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const [empresas, proveedores, clasificaciones, proyectos] = await Promise.all([
    getEmpresas(),
    getProveedores(),
    getClasificaciones(),
    getProyectos(),
  ])

  return (
    <NuevaRequisicionForm
      empresas={empresas.filter((e: { activa: boolean }) => e.activa)}
      proveedores={proveedores.filter((p: { activo: boolean }) => p.activo)}
      clasificaciones={clasificaciones.filter((c: { activa: boolean }) => c.activa)}
      proyectos={proyectos.filter((p: { activo: boolean }) => p.activo).map((p: { id: string; empresa_id: string; centro_de_costo: string; nombre: string }) => ({
        id: p.id,
        empresa_id: p.empresa_id,
        centro_de_costo: p.centro_de_costo,
        nombre: p.nombre,
      }))}
      userName={perfil.nombre}
    />
  )
}
