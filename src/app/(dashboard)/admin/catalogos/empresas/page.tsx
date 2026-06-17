import { getEmpresas } from '@/app/actions/empresas.actions'
import { EmpresasClient } from './EmpresasClient'

export default async function EmpresasPage() {
  const empresas = await getEmpresas()
  return <EmpresasClient empresas={empresas} />
}
