'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { SortableHeader } from '@/components/SortableHeader'
import { UsuarioDialog } from './UsuarioDialog'
import { toggleUsuario, aprobarUsuario, rechazarUsuario } from '@/app/actions/usuarios.actions'
import { useSort } from '@/hooks/useSort'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Power, Check, X, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  director: 'Director de Operaciones',
  tesorero: 'Tesorero',
  operario: 'Operario',
  visualizador: 'Visualizador',
  pendiente: 'Pendiente',
}

const ROLES_ASIGNABLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'director', label: 'Director de Operaciones' },
  { value: 'tesorero', label: 'Tesorero' },
  { value: 'operario', label: 'Operario' },
  { value: 'visualizador', label: 'Visualizador' },
]

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  empresa_id: string | null
  activo: boolean
  proveedor_auth?: string
  foto_url?: string | null
  created_at?: string
  empresas: { nombre: string; codigo: string } | null
}

interface Empresa {
  id: string
  codigo: string
  nombre: string
}

function AuthBadge({ proveedor }: { proveedor?: string }) {
  if (proveedor === 'microsoft') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        Microsoft
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
      Email
    </span>
  )
}

function PendingUserCard({
  usuario,
  empresas,
  onApproved,
  onRejected,
}: {
  usuario: Usuario
  empresas: Empresa[]
  onApproved: () => void
  onRejected: () => void
}) {
  const [rol, setRol] = useState('')
  const [empresaId, setEmpresaId] = useState('todas')
  const [loading, setLoading] = useState(false)

  async function handleAprobar() {
    if (!rol) {
      toast.error('Selecciona un rol antes de aprobar')
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.set('rol', rol)
    formData.set('empresa_id', empresaId === 'todas' ? '' : empresaId)
    const result = await aprobarUsuario(usuario.id, formData)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${usuario.nombre} aprobado como ${ROLE_LABELS[rol]}`)
      onApproved()
    }
  }

  async function handleRechazar() {
    setLoading(true)
    const result = await rechazarUsuario(usuario.id)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Solicitud de ${usuario.nombre} rechazada`)
      onRejected()
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {usuario.foto_url ? (
              <img
                src={usuario.foto_url}
                alt={usuario.nombre}
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200">
                <UserPlus className="w-5 h-5 text-amber-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="font-medium text-gray-900">{usuario.nombre}</p>
              <p className="text-sm text-muted-foreground">{usuario.email}</p>
              {usuario.created_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Solicitud: {new Date(usuario.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Rol</label>
                <Select value={rol} onValueChange={setRol}>
                  <SelectTrigger className="w-48 h-9 bg-white">
                    <SelectValue placeholder="Selecciona rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES_ASIGNABLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Empresa</label>
                <Select value={empresaId} onValueChange={setEmpresaId}>
                  <SelectTrigger className="w-48 h-9 bg-white">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las empresas</SelectItem>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.codigo} - {e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white h-9"
                  onClick={handleAprobar}
                  disabled={loading || !rol}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Aprobar y asignar rol
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 h-9"
                  onClick={handleRechazar}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-1" />
                  Rechazar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function UsuariosClient({ usuarios, empresas }: { usuarios: Usuario[]; empresas: Empresa[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [filterRol, setFilterRol] = useState('todos')
  const [filterAuth, setFilterAuth] = useState('todos')

  const pendientes = usuarios.filter((u) => u.rol === 'pendiente' && u.activo)
  const activos = usuarios.filter((u) => u.rol !== 'pendiente')

  const filtered = activos
    .filter((u) => filterRol === 'todos' || u.rol === filterRol)
    .filter((u) => filterAuth === 'todos' || u.proveedor_auth === filterAuth)

  const { sorted, sortConfig, handleSort } = useSort(filtered)

  async function handleToggle(u: Usuario) {
    const result = await toggleUsuario(u.id, !u.activo)
    if (result.error) toast.error(result.error)
    else toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestion de usuarios del sistema"
        actionLabel="Nuevo usuario"
        onAction={() => { setEditing(null); setDialogOpen(true) }}
      />

      {/* Seccion de pendientes */}
      {pendientes.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Pendientes de aprobacion</CardTitle>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                {pendientes.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendientes.map((u) => (
              <PendingUserCard
                key={u.id}
                usuario={u}
                empresas={empresas}
                onApproved={() => {}}
                onRejected={() => {}}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center space-x-4">
        <Select value={filterRol} onValueChange={setFilterRol}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {Object.entries(ROLE_LABELS)
              .filter(([value]) => value !== 'pendiente')
              .map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={filterAuth} onValueChange={setFilterAuth}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por acceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los accesos</SelectItem>
            <SelectItem value="microsoft">Microsoft</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Nombre" sortKey="nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Rol" sortKey="rol" sortConfig={sortConfig} onSort={handleSort} />
              <TableHead>Acceso</TableHead>
              <SortableHeader label="Empresa" sortKey="empresas.nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Estatus" sortKey="activo" sortConfig={sortConfig} onSort={handleSort} />
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {ROLE_LABELS[u.rol] || u.rol}
                    </span>
                  </TableCell>
                  <TableCell>
                    <AuthBadge proveedor={u.proveedor_auth} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.empresas ? `${u.empresas.codigo} - ${u.empresas.nombre}` : 'Todas'}
                  </TableCell>
                  <TableCell><StatusBadge active={u.activo} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setDialogOpen(true) }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(u)}>
                        <Power className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UsuarioDialog open={dialogOpen} onOpenChange={setDialogOpen} usuario={editing} empresas={empresas} />
    </div>
  )
}
