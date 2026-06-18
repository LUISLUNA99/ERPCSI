'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { BulkUpload } from '@/components/BulkUpload'
import { EmpresaDialog } from './EmpresaDialog'
import { SATConfigDialog } from './SATConfigDialog'
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
import { Badge } from '@/components/ui/badge'
import { Pencil, Power, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface Empresa {
  id: string
  codigo: string
  nombre: string
  rfc: string | null
  activa: boolean
  sat_configurado: boolean | null
  created_at: string
}

export function EmpresasClient({ empresas }: { empresas: Empresa[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [satDialogOpen, setSatDialogOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [satEmpresa, setSatEmpresa] = useState<Empresa | null>(null)

  function handleEdit(empresa: Empresa) {
    setEditingEmpresa(empresa)
    setDialogOpen(true)
  }

  function handleNew() {
    setEditingEmpresa(null)
    setDialogOpen(true)
  }

  function handleSATConfig(empresa: Empresa) {
    setSatEmpresa(empresa)
    setSatDialogOpen(true)
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
              <TableHead>SAT</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    {empresa.sat_configurado ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Configurado</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={empresa.activa} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSATConfig(empresa)}
                        title="Configurar SAT"
                      >
                        <Shield className="w-4 h-4 text-[#1B3A6B]" />
                      </Button>
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

      <SATConfigDialog
        open={satDialogOpen}
        onOpenChange={setSatDialogOpen}
        empresa={satEmpresa}
      />
    </div>
  )
}
