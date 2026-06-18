'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { SortableHeader } from '@/components/SortableHeader'
import { UsuarioDialog } from './UsuarioDialog'
import { toggleUsuario } from '@/app/actions/usuarios.actions'
import { useSort } from '@/hooks/useSort'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  director: 'Director de Operaciones',
  tesorero: 'Tesorero',
  operario: 'Operario',
  visualizador: 'Visualizador',
}

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  empresa_id: string | null
  activo: boolean
  empresas: { nombre: string; codigo: string } | null
}

interface Empresa {
  id: string
  codigo: string
  nombre: string
}

export function UsuariosClient({ usuarios, empresas }: { usuarios: Usuario[]; empresas: Empresa[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [filterRol, setFilterRol] = useState('todos')

  const filtered = filterRol === 'todos'
    ? usuarios
    : usuarios.filter((u) => u.rol === filterRol)

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

      <div className="flex items-center space-x-4">
        <Select value={filterRol} onValueChange={setFilterRol}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
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
              <SortableHeader label="Empresa" sortKey="empresas.nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Estatus" sortKey="activo" sortConfig={sortConfig} onSort={handleSort} />
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
