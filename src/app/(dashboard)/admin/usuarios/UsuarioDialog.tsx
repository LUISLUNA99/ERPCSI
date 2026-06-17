'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createUsuario, updateUsuario } from '@/app/actions/usuarios.actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  empresa_id: string | null
}

interface Empresa {
  id: string
  codigo: string
  nombre: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: Usuario | null
  empresas: Empresa[]
}

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'director', label: 'Director de Operaciones' },
  { value: 'tesorero', label: 'Tesorero' },
  { value: 'operario', label: 'Operario' },
  { value: 'visualizador', label: 'Visualizador' },
]

export function UsuarioDialog({ open, onOpenChange, usuario, empresas }: Props) {
  const [loading, setLoading] = useState(false)
  const [rol, setRol] = useState(usuario?.rol || '')
  const [empresaId, setEmpresaId] = useState(usuario?.empresa_id || 'todas')
  const isEdit = !!usuario

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('rol', rol)
    formData.set('empresa_id', empresaId === 'todas' ? '' : empresaId)

    const result = isEdit
      ? await updateUsuario(usuario!.id, formData)
      : await createUsuario(formData)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" defaultValue={usuario?.nombre || ''} required />
          </div>

          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electronico *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contrasena temporal *</Label>
                <Input id="password" name="password" type="password" minLength={6} required />
                <p className="text-xs text-muted-foreground">Minimo 6 caracteres. El usuario podra cambiarla despues.</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Rol *</Label>
            <Select value={rol} onValueChange={setRol} required>
              <SelectTrigger><SelectValue placeholder="Selecciona rol" /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Empresa asignada</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Todas las empresas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las empresas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.codigo} - {e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Dejar en &quot;Todas&quot; para acceso global.</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !rol} className="bg-accent-500 hover:bg-accent-600 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
