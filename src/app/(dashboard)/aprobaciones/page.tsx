import { getRequisiciones } from '@/app/actions/requisiciones.actions'
import { AprobacionesClient } from './AprobacionesClient'

export default async function AprobacionesPage() {
  const requisiciones = await getRequisiciones({ estatus: 'EN_REVISION' })
  return <AprobacionesClient requisiciones={requisiciones} />
}
