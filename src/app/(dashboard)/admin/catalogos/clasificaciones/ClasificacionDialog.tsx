'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClasificacion, updateClasificacion } from '@/app/actions/clasificaciones.actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Clasificacion {
  id: string
  nombre: string
  descripcion: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  clasificacion?: Clasificacion | null
}

export function ClasificacionDialog({ open, onOpenChange, clasificacion }: Props) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!clasificacion

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = isEdit
      ? await updateClasificacion(clasificacion!.id, formData)
      : await createClasificacion(formData)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? 'Clasificacion actualizada' : 'Clasificacion creada')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar clasificacion' : 'Nueva clasificacion'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" name="nombre" defaultValue={clasificacion?.nombre || ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripcion</Label>
            <Textarea id="descripcion" name="descripcion" defaultValue={clasificacion?.descripcion || ''} rows={3} />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-accent-500 hover:bg-accent-600 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear clasificacion'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
