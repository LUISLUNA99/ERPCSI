'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { BulkUpload } from '@/components/BulkUpload'
import { ProveedorDialog } from './ProveedorDialog'
import { toggleProveedor } from '@/app/actions/proveedores.actions'
import { bulkImportProveedores } from '@/app/actions/bulk.actions'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Power, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Proveedor {
  id: string
  nombre: string
  rfc: string | null
  banco: string | null
  clabe: string | null
  cuenta: string | null
  contacto_nombre: string | null
  contacto_email: string | null
  activo: boolean
}

export function ProveedoresClient({ proveedores }: { proveedores: Proveedor[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Proveedor | null>(null)
  const [search, setSearch] = useState('')

  const filtered = proveedores.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.rfc && p.rfc.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleToggle(p: Proveedor) {
    const result = await toggleProveedor(p.id, !p.activo)
    if (result.error) toast.error(result.error)
    else toast.success(p.activo ? 'Proveedor desactivado' : 'Proveedor activado')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Directorio de proveedores"
        actionLabel="Nuevo proveedor"
        onAction={() => { setEditing(null); setDialogOpen(true) }}
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o RFC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <BulkUpload
          config={{
            templateName: 'proveedores',
            headers: ['nombre', 'rfc', 'banco', 'clabe', 'cuenta', 'contacto_nombre', 'contacto_email'],
            sampleRows: [['Proveedor Ejemplo', 'PRV010101AAA', 'BBVA', '012345678901234567', '1234567890', 'Juan Perez', 'juan@ejemplo.com']],
            requiredFields: ['nombre'],
            onUpload: bulkImportProveedores,
          }}
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? 'Sin resultados para la busqueda' : 'No hay proveedores registrados'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{p.rfc || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.banco || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.contacto_nombre || '—'}
                    {p.contacto_email && <div className="text-xs">{p.contacto_email}</div>}
                  </TableCell>
                  <TableCell><StatusBadge active={p.activo} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setDialogOpen(true) }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(p)}>
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

      <ProveedorDialog open={dialogOpen} onOpenChange={setDialogOpen} proveedor={editing} />
    </div>
  )
}
