'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { BulkUpload } from '@/components/BulkUpload'
import { SortableHeader } from '@/components/SortableHeader'
import { ClasificacionDialog } from './ClasificacionDialog'
import { toggleClasificacion } from '@/app/actions/clasificaciones.actions'
import { bulkImportClasificaciones } from '@/app/actions/bulk.actions'
import { useSort } from '@/hooks/useSort'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'

interface Clasificacion {
  id: string
  nombre: string
  descripcion: string | null
  activa: boolean
  orden: number
}

export function ClasificacionesClient({ clasificaciones }: { clasificaciones: Clasificacion[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Clasificacion | null>(null)

  const { sorted, sortConfig, handleSort } = useSort(clasificaciones)

  async function handleToggle(c: Clasificacion) {
    const result = await toggleClasificacion(c.id, !c.activa)
    if (result.error) toast.error(result.error)
    else toast.success(c.activa ? 'Clasificacion desactivada' : 'Clasificacion activada')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clasificaciones de gasto"
        description="Tipos de clasificacion para requisiciones"
        actionLabel="Nueva clasificacion"
        onAction={() => { setEditing(null); setDialogOpen(true) }}
      />
      <BulkUpload
        config={{
          templateName: 'clasificaciones',
          headers: ['nombre', 'descripcion'],
          sampleRows: [['Pago proveedor', 'Pagos a proveedores de servicios'], ['Reembolso', 'Reembolsos de gastos']],
          requiredFields: ['nombre'],
          onUpload: bulkImportClasificaciones,
        }}
      />

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Nombre" sortKey="nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Descripcion" sortKey="descripcion" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Estatus" sortKey="activa" sortConfig={sortConfig} onSort={handleSort} />
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No hay clasificaciones registradas
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.descripcion || '—'}</TableCell>
                  <TableCell><StatusBadge active={c.activa} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setDialogOpen(true) }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(c)}>
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
      <ClasificacionDialog open={dialogOpen} onOpenChange={setDialogOpen} clasificacion={editing} />
    </div>
  )
}
