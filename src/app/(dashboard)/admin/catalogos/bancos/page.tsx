import { getBancos } from '@/app/actions/bancos.actions'
import { getEmpresas } from '@/app/actions/empresas.actions'
import { BancosClient } from './BancosClient'

export default async function BancosPage() {
  const [bancos, empresas] = await Promise.all([getBancos(), getEmpresas()])
  return <BancosClient bancos={bancos} empresas={empresas} />
}
