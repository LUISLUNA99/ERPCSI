import { getProyectos } from '@/app/actions/proyectos.actions'
import { getEmpresas } from '@/app/actions/empresas.actions'
import { ProyectosClient } from './ProyectosClient'

export default async function ProyectosPage() {
  const [proyectos, empresas] = await Promise.all([getProyectos(), getEmpresas()])
  return <ProyectosClient proyectos={proyectos} empresas={empresas} />
}
