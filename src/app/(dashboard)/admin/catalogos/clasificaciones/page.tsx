import { getClasificaciones } from '@/app/actions/clasificaciones.actions'
import { ClasificacionesClient } from './ClasificacionesClient'

export default async function ClasificacionesPage() {
  const clasificaciones = await getClasificaciones()
  return <ClasificacionesClient clasificaciones={clasificaciones} />
}
