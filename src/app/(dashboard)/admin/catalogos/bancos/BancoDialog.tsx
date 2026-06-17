'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createBanco, updateBanco } from '@/app/actions/bancos.actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BancoEmpresa {
  id: string
  empresa_id: string
  banco: string
  numero_cuenta: string | null
  clabe: string | null
  moneda: string
}

interface Empresa {
  id: string
  codigo: string
  nombre: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  banco?: BancoEmpresa | null
  empresas: Empresa[]
}

const BANCOS = ['Santander', 'BBVA', 'HSBC', 'Banregio', 'Citibanamex', 'Scotiabank', 'Otro']
const MONEDAS = ['MXN', 'USD', 'EUR']

export function BancoDialog({ open, onOpenChange, banco, empresas }: Props) {
  const [loading, setLoading] = useState(false)
  const [empresaId, setEmpresaId] = useState(banco?.empresa_id || '')
  const [bancoNombre, setBancoNombre] = useState(banco?.banco || '')
  const [moneda, setMoneda] = useState(banco?.moneda || 'MXN')
  const isEdit = !!banco

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('empresa_id', empresaId)
    formData.set('banco', bancoNombre)
    formData.set('moneda', moneda)

    const result = isEdit ? await updateBanco(banco!.id, formData) : await createBanco(formData)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? 'Cuenta actualizada' : 'Cuenta creada')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Empresa *</Label>
            <Select value={empresaId} onValueChange={setEmpresaId} required>
              <SelectTrigger><SelectValue placeholder="Selecciona empresa" /></SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.codigo} - {e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Banco *</Label>
            <Select value={bancoNombre} onValueChange={setBancoNombre} required>
              <SelectTrigger><SelectValue placeholder="Selecciona banco" /></SelectTrigger>
              <SelectContent>
                {BANCOS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_cuenta">No. Cuenta</Label>
              <Input id="numero_cuenta" name="numero_cuenta" defaultValue={banco?.numero_cuenta || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clabe">CLABE</Label>
              <Input id="clabe" name="clabe" defaultValue={banco?.clabe || ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={setMoneda}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONEDAS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !empresaId || !bancoNombre} className="bg-accent-500 hover:bg-accent-600 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear cuenta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
