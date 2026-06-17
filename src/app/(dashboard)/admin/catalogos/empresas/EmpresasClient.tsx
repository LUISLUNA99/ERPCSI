'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { BulkUpload } from '@/components/BulkUpload'
import { EmpresaDialog } from './EmpresaDialog'
import { toggleEmpresa } from '@/app/actions/empresas.actions'
import { bulkImportEmpresas } from '@/app/actions/bulk.actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'

interface Empresa {
  id: string
  codigo: string
  nombre: string
  rfc: string | null
  activa: boolean
  created_at: string
}

export function EmpresasClient({ empresas }: { empresas: Empresa[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)

  function handleEdit(empresa: Empresa) {
    setEditingEmpresa(empresa)
    setDialogOpen(true)
  }

  function handleNew() {
    setEditingEmpresa(null)
    setDialogOpen(true)
  }

  async function handleToggle(empresa: Empresa) {
    const result = await toggleEmpresa(empresa.id, !empresa.activa)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        empresa.activa ? 'Empresa desactivada' : 'Empresa activada'
      )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        description="Empresas del Grupo CSI"
        actionLabel="Nueva empresa"
        onAction={handleNew}
      />

      <BulkUpload
        config={{
          templateName: 'empresas',
          headers: ['codigo', 'nombre', 'rfc'],
          sampleRows: [['50', 'Buzzword', 'BWD010101AAA'], ['70', 'INOVITZ', 'INO010101BBB']],
          requiredFields: ['codigo', 'nombre'],
          onUpload: bulkImportEmpresas,
        }}
      />

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codigo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No hay empresas registradas
                </TableCell>
              </TableRow>
            ) : (
              empresas.map((empresa) => (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">{empresa.codigo}</TableCell>
                  <TableCell>{empresa.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {empresa.rfc || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={empresa.activa} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(empresa)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(empresa)}
                        title={empresa.activa ? 'Desactivar' : 'Activar'}
                      >
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

      <EmpresaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresa={editingEmpresa}
      />
    </div>
  )
}
