'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createProyecto, updateProyecto, getClientes, createCliente } from '@/app/actions/proyectos.actions'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Proyecto {
  id: string
  empresa_id: string
  cliente_id: string
  centro_de_costo: string
  nombre: string
  descripcion: string | null
}

interface Empresa {
  id: string
  codigo: string
  nombre: string
}

interface Cliente {
  id: string
  empresa_id: string
  codigo: string
  nombre: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyecto?: Proyecto | null
  empresas: Empresa[]
}

export function ProyectoDialog({ open, onOpenChange, proyecto, empresas }: Props) {
  const [loading, setLoading] = useState(false)
  const [empresaId, setEmpresaId] = useState(proyecto?.empresa_id || '')
  const [clienteId, setClienteId] = useState(proyecto?.cliente_id || '')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [showNewCliente, setShowNewCliente] = useState(false)
  const isEdit = !!proyecto

  useEffect(() => {
    if (empresaId) {
      getClientes(empresaId).then(setClientes)
    } else {
      setClientes([])
    }
  }, [empresaId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('empresa_id', empresaId)
    formData.set('cliente_id', clienteId)

    const result = isEdit
      ? await updateProyecto(proyecto!.id, formData)
      : await createProyecto(formData)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? 'Proyecto actualizado' : 'Proyecto creado')
    onOpenChange(false)
  }

  async function handleNewCliente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('empresa_id', empresaId)
    const result = await createCliente(formData)
    if (result.error) { toast.error(result.error); return }
    toast.success('Cliente creado')
    setShowNewCliente(false)
    const updated = await getClientes(empresaId)
    setClientes(updated)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Empresa *</Label>
            <Select value={empresaId} onValueChange={(v) => { setEmpresaId(v); setClienteId('') }}>
              <SelectTrigger><SelectValue placeholder="Selecciona empresa" /></SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.codigo} - {e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cliente *</Label>
              {empresaId && (
                <button type="button" onClick={() => setShowNewCliente(!showNewCliente)} className="text-xs text-accent-500 hover:underline flex items-center">
                  <Plus className="w-3 h-3 mr-1" /> Nuevo cliente
                </button>
              )}
            </div>
            <Select value={clienteId} onValueChange={setClienteId} disabled={!empresaId}>
              <SelectTrigger><SelectValue placeholder={empresaId ? 'Selecciona cliente' : 'Primero selecciona empresa'} /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showNewCliente && (
            <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
              <p className="text-sm font-medium">Nuevo cliente</p>
              <form onSubmit={handleNewCliente} className="flex space-x-2">
                <Input name="codigo" placeholder="Codigo (ej: 01)" className="w-24" required />
                <Input name="nombre" placeholder="Nombre del cliente" className="flex-1" required />
                <Button type="submit" size="sm" className="bg-accent-500 hover:bg-accent-600 text-white">Crear</Button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="centro_de_costo">Centro de costo *</Label>
              <Input id="centro_de_costo" name="centro_de_costo" placeholder="50-01-01" defaultValue={proyecto?.centro_de_costo || ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" name="nombre" placeholder="Nombre del proyecto" defaultValue={proyecto?.nombre || ''} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripcion</Label>
            <Textarea id="descripcion" name="descripcion" defaultValue={proyecto?.descripcion || ''} rows={2} />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !empresaId || !clienteId} className="bg-accent-500 hover:bg-accent-600 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
