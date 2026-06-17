'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createEmpresa, updateEmpresa } from '@/app/actions/empresas.actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Empresa {
  id: string
  codigo: string
  nombre: string
  rfc: string | null
}

interface EmpresaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresa?: Empresa | null
}

export function EmpresaDialog({ open, onOpenChange, empresa }: EmpresaDialogProps) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!empresa

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = isEdit
      ? await updateEmpresa(empresa!.id, formData)
      : await createEmpresa(formData)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Empresa actualizada' : 'Empresa creada')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar empresa' : 'Nueva empresa'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Codigo</Label>
            <Input
              id="codigo"
              name="codigo"
              placeholder="Ej: 50, 70, DCM"
              defaultValue={empresa?.codigo || ''}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Nombre de la empresa"
              defaultValue={empresa?.nombre || ''}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rfc">RFC (opcional)</Label>
            <Input
              id="rfc"
              name="rfc"
              placeholder="RFC de la empresa"
              defaultValue={empresa?.rfc || ''}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-accent-500 hover:bg-accent-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear empresa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
