import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getReportData } from '@/app/actions/reportes.actions'
import { ReportesClient } from './ReportesClient'

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const rolesPermitidos = ['admin', 'director', 'tesorero', 'visualizador']
  if (!rolesPermitidos.includes(perfil.rol)) {
    redirect('/dashboard')
  }

  const canExport = ['admin', 'director', 'tesorero'].includes(perfil.rol)

  const { requisiciones, empresas } = await getReportData()

  return (
    <ReportesClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requisiciones={requisiciones as any}
      empresas={empresas}
      rol={perfil.rol}
      canExport={canExport}
    />
  )
}
