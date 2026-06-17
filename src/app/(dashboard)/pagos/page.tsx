import { getRequisicionesPorPagar } from '@/app/actions/pagos.actions'
import { getBancos } from '@/app/actions/bancos.actions'
import { PagosClient } from './PagosClient'

export default async function PagosPage() {
  const [requisiciones, bancos] = await Promise.all([
    getRequisicionesPorPagar(),
    getBancos(),
  ])
  return <PagosClient requisiciones={requisiciones} bancos={bancos} />
}
