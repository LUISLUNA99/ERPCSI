'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { BulkUpload } from '@/components/BulkUpload'
import { SortableHeader } from '@/components/SortableHeader'
import { ProyectoDialog } from './ProyectoDialog'
import { toggleProyecto } from '@/app/actions/proyectos.actions'
import { bulkImportProyectos } from '@/app/actions/bulk.actions'
import { useSort } from '@/hooks/useSort'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Power, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Proyecto {
  id: string
  empresa_id: string
  cliente_id: string
  centro_de_costo: string
  nombre: string
  descripcion: string | null
  activo: boolean
  empresas: { nombre: string; codigo: string }
  clientes: { nombre: string; codigo: string }
}

interface Empresa {
  id: string
  codigo: string
  nombre: string
}

export function ProyectosClient({ proyectos, empresas }: { proyectos: Proyecto[]; empresas: Empresa[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Proyecto | null>(null)
  const [search, setSearch] = useState('')

  const filtered = proyectos.filter(
    (p) =>
      p.centro_de_costo.toLowerCase().includes(search.toLowerCase()) ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.empresas?.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const { sorted, sortConfig, handleSort } = useSort(filtered)

  async function handleToggle(p: Proyecto) {
    const result = await toggleProyecto(p.id, !p.activo)
    if (result.error) toast.error(result.error)
    else toast.success(p.activo ? 'Proyecto desactivado' : 'Proyecto activado')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos y Centros de Costo"
        description="Centros de costo por empresa y cliente"
        actionLabel="Nuevo proyecto"
        onAction={() => { setEditing(null); setDialogOpen(true) }}
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por CC, nombre o empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <BulkUpload
          config={{
            templateName: 'centros-de-costo',
            headers: ['centro_de_costo', 'empresa_codigo', 'cliente_codigo', 'cliente_nombre', 'nombre', 'descripcion'],
            sampleRows: [['50-01-01', '50', '01', 'Buenher', 'Gestion Buenher', 'Proyecto de gestion'], ['70-01-02', '70', '01', 'Cliente Principal', 'Desarrollo Web', 'Proyecto desarrollo']],
            requiredFields: ['centro_de_costo', 'empresa_codigo', 'cliente_codigo', 'nombre'],
            onUpload: bulkImportProyectos,
          }}
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Centro de Costo" sortKey="centro_de_costo" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Empresa" sortKey="empresas.nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Cliente" sortKey="clientes.nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Nombre" sortKey="nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Estatus" sortKey="activo" sortConfig={sortConfig} onSort={handleSort} />
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? 'Sin resultados' : 'No hay proyectos registrados'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-medium">{p.centro_de_costo}</TableCell>
                  <TableCell>{p.empresas?.codigo} - {p.empresas?.nombre}</TableCell>
                  <TableCell>{p.clientes?.codigo} - {p.clientes?.nombre}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
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

      <ProyectoDialog open={dialogOpen} onOpenChange={setDialogOpen} proyecto={editing} empresas={empresas} />
    </div>
  )
}
