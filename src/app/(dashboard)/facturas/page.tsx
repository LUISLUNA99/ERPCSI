import { getRequisicionesSinFactura } from '@/app/actions/facturas.actions'
import { FacturasClient } from './FacturasClient'

export default async function FacturasPage() {
  const requisiciones = await getRequisicionesSinFactura()
  return <FacturasClient requisiciones={requisiciones} />
}
