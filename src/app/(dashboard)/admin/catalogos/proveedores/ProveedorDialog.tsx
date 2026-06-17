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
import { createProveedor, updateProveedor } from '@/app/actions/proveedores.actions'
import { Loader2 } from 'lucide-react'
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
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proveedor?: Proveedor | null
}

export function ProveedorDialog({ open, onOpenChange, proveedor }: Props) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!proveedor

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = isEdit
      ? await updateProveedor(proveedor!.id, formData)
      : await createProveedor(formData)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Proveedor actualizado' : 'Proveedor creado')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" name="nombre" defaultValue={proveedor?.nombre || ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input id="rfc" name="rfc" defaultValue={proveedor?.rfc || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banco">Banco</Label>
              <Input id="banco" name="banco" defaultValue={proveedor?.banco || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clabe">CLABE</Label>
              <Input id="clabe" name="clabe" defaultValue={proveedor?.clabe || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuenta">Cuenta</Label>
              <Input id="cuenta" name="cuenta" defaultValue={proveedor?.cuenta || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contacto_nombre">Contacto</Label>
              <Input id="contacto_nombre" name="contacto_nombre" defaultValue={proveedor?.contacto_nombre || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contacto_email">Email contacto</Label>
              <Input id="contacto_email" name="contacto_email" type="email" defaultValue={proveedor?.contacto_email || ''} />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-accent-500 hover:bg-accent-600 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
