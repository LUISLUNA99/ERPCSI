import { getUsuarios } from '@/app/actions/usuarios.actions'
import { getEmpresas } from '@/app/actions/empresas.actions'
import { UsuariosClient } from './UsuariosClient'

export default async function UsuariosPage() {
  const [usuarios, empresas] = await Promise.all([getUsuarios(), getEmpresas()])
  return <UsuariosClient usuarios={usuarios} empresas={empresas} />
}
