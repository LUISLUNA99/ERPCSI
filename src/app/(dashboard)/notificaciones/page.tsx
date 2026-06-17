import { getNotificaciones } from '@/app/actions/notificaciones.actions'
import { NotificacionesClient } from './NotificacionesClient'

export default async function NotificacionesPage() {
  const notificaciones = await getNotificaciones()
  return <NotificacionesClient notificaciones={notificaciones} />
}
