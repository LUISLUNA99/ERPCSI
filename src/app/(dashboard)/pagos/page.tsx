import { getRequisicionesPorPagar } from '@/app/actions/pagos.actions'
import { getBancos } from '@/app/actions/bancos.actions'
import { getClasificaciones } from '@/app/actions/clasificaciones.actions'
import { PagosClient } from './PagosClient'

export default async function PagosPage() {
  const [requisiciones, bancos, clasificaciones] = await Promise.all([
    getRequisicionesPorPagar(),
    getBancos(),
    getClasificaciones(),
  ])
  return (
    <PagosClient
      requisiciones={requisiciones}
      bancos={bancos}
      clasificaciones={clasificaciones.filter((c: { activa: boolean }) => c.activa)}
    />
  )
}
