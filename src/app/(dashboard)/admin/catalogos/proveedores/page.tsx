import { getProveedores } from '@/app/actions/proveedores.actions'
import { ProveedoresClient } from './ProveedoresClient'

export default async function ProveedoresPage() {
  const proveedores = await getProveedores()
  return <ProveedoresClient proveedores={proveedores} />
}
