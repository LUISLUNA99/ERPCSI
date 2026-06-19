'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRequisicion } from '@/app/actions/requisiciones.actions'
import { getClientes } from '@/app/actions/proyectos.actions'
import { Loader2, Save, Send, Upload, X, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { getMesesOptions } from '@/lib/utils/meses'
import { Combobox } from '@/components/ui/combobox'

interface Props {
  empresas: { id: string; codigo: string; nombre: string }[]
  proveedores: { id: string; nombre: string; rfc: string | null }[]
  clasificaciones: { id: string; nombre: string }[]
  proyectos: { id: string; empresa_id: string; centro_de_costo: string; nombre: string }[]
  userName: string
}

export function NuevaRequisicionForm({ empresas, proveedores, clasificaciones, proyectos, userName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'borrador' | 'enviar'>('borrador')

  // Form state
  const [clasificacionId, setClasificacionId] = useState('')
  const [mesServicio, setMesServicio] = useState('')
  const [mesPago, setMesPago] = useState('')
  const [mesProvision, setMesProvision] = useState('')
  const [empresaGenId, setEmpresaGenId] = useState('')
  const [empresaPagaId, setEmpresaPagaId] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [moneda, setMoneda] = useState('MXN')
  const [importeSinIva, setImporteSinIva] = useState('')
  const [ivaManual, setIvaManual] = useState(false)
  const [iva, setIva] = useState('')
  const [tipoCambio, setTipoCambio] = useState('1')
  const [tieneFactura, setTieneFactura] = useState(false)
  const [facturaFile, setFacturaFile] = useState<File | null>(null)

  const meses = getMesesOptions()

  // Filtrar proyectos por empresa generadora
  const proyectosFiltrados = empresaGenId
    ? proyectos.filter((p) => p.empresa_id === empresaGenId)
    : []

  // Calculo automatico de IVA
  useEffect(() => {
    if (!ivaManual && importeSinIva) {
      const subtotal = parseFloat(importeSinIva) || 0
      setIva((subtotal * 0.16).toFixed(2))
    }
  }, [importeSinIva, ivaManual])

  const subtotal = parseFloat(importeSinIva) || 0
  const ivaNum = parseFloat(iva) || 0
  const total = subtotal + ivaNum

  // Importe en moneda extranjera
  const tc = parseFloat(tipoCambio) || 1
  const importeMe = moneda !== 'MXN' ? total : undefined

  async function handleSubmit(enviar: boolean) {
    setAction(enviar ? 'enviar' : 'borrador')
    setLoading(true)

    const formData = new FormData()
    formData.set('clasificacion_id', clasificacionId)
    formData.set('mes_servicio', mesServicio)
    formData.set('mes_pago_deseado', mesPago)
    if (mesProvision) formData.set('mes_provision', mesProvision)
    formData.set('empresa_generadora_id', empresaGenId)
    formData.set('empresa_paga_id', empresaPagaId || empresaGenId)
    formData.set('proyecto_id', proyectoId)
    formData.set('proveedor_id', proveedorId)
    formData.set('concepto', (document.getElementById('concepto') as HTMLTextAreaElement)?.value || '')
    formData.set('moneda', moneda)
    formData.set('importe_sin_iva', String(subtotal))
    formData.set('iva', String(ivaNum))
    formData.set('importe_total', String(total))
    formData.set('tipo_cambio', tipoCambio)
    if (importeMe) formData.set('importe_me', String(importeMe))

    if (facturaFile) {
      formData.set('factura_file', facturaFile)
    }

    const motivoEl = document.getElementById('motivo_sin_factura') as HTMLTextAreaElement
    if (motivoEl?.value) formData.set('motivo_sin_factura', motivoEl.value)

    const obsEl = document.getElementById('observaciones') as HTMLTextAreaElement
    if (obsEl?.value) formData.set('observaciones_solicitante', obsEl.value)

    const result = await createRequisicion(formData, enviar)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(enviar
      ? `Solicitud de compra ${result.folio} enviada para aprobacion`
      : `Solicitud de compra ${result.folio} guardada como borrador`
    )
    router.push('/requisiciones')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva solicitud de compra</h1>
        <p className="text-muted-foreground mt-1">Solicitante: {userName} | Fecha: {new Date().toLocaleDateString('es-MX')}</p>
      </div>

      {/* Clasificacion y periodo */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Clasificacion y periodo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Tipo de gasto *</Label>
            <Select value={clasificacionId} onValueChange={setClasificacionId}>
              <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
              <SelectContent>
                {clasificaciones.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mes del servicio *</Label>
            <Select value={mesServicio} onValueChange={setMesServicio}>
              <SelectTrigger><SelectValue placeholder="Mes servicio" /></SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mes de provision</Label>
            <Select value={mesProvision} onValueChange={setMesProvision}>
              <SelectTrigger><SelectValue placeholder="Mes provision" /></SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mes de pago deseado *</Label>
            <Select value={mesPago} onValueChange={setMesPago}>
              <SelectTrigger><SelectValue placeholder="Mes pago" /></SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Empresas y proyecto */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Empresa y proyecto</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Empresa que genera el gasto *</Label>
            <Select value={empresaGenId} onValueChange={(v) => { setEmpresaGenId(v); setProyectoId(''); if (!empresaPagaId) setEmpresaPagaId(v) }}>
              <SelectTrigger><SelectValue placeholder="Empresa generadora" /></SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.codigo} - {e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Empresa que paga *</Label>
            <Select value={empresaPagaId} onValueChange={setEmpresaPagaId}>
              <SelectTrigger><SelectValue placeholder="Empresa que paga" /></SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.codigo} - {e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Proyecto / Centro de costo</Label>
            <Combobox
              options={proyectosFiltrados.map((p) => ({
                value: p.id,
                label: `${p.centro_de_costo} - ${p.nombre}`,
                searchText: `${p.centro_de_costo} ${p.nombre}`,
              }))}
              value={proyectoId}
              onValueChange={setProyectoId}
              placeholder={empresaGenId ? 'Buscar proyecto...' : 'Primero selecciona empresa'}
              searchPlaceholder="Buscar por nombre o centro de costo..."
              emptyText="No se encontraron proyectos."
              disabled={!empresaGenId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Proveedor y concepto */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Proveedor y concepto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Combobox
              options={proveedores.map((p) => ({
                value: p.id,
                label: `${p.nombre}${p.rfc ? ` (${p.rfc})` : ''}`,
                searchText: `${p.nombre} ${p.rfc || ''}`,
              }))}
              value={proveedorId}
              onValueChange={setProveedorId}
              placeholder="Buscar proveedor..."
              searchPlaceholder="Buscar por nombre o RFC..."
              emptyText="No se encontraron proveedores."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto del pago *</Label>
            <Textarea id="concepto" placeholder="Describe el concepto del gasto..." maxLength={500} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Importes */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Importes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN - Peso mexicano</SelectItem>
                  <SelectItem value="USD">USD - Dolar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {moneda !== 'MXN' && (
              <div className="space-y-2">
                <Label>Tipo de cambio</Label>
                <Input type="number" step="0.0001" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Importe sin IVA *</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={importeSinIva} onChange={(e) => setImporteSinIva(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>IVA (16%)</Label>
                <button type="button" onClick={() => setIvaManual(!ivaManual)} className="text-xs text-accent-500 hover:underline">
                  {ivaManual ? 'Calcular auto' : 'Ajustar manual'}
                </button>
              </div>
              <Input type="number" step="0.01" min="0" value={iva} onChange={(e) => { setIva(e.target.value); setIvaManual(true) }} disabled={!ivaManual} />
            </div>
          </div>
          <div className="flex justify-end">
            <div className="text-right bg-gray-50 rounded-lg px-6 py-3">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-primary-500">
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {moneda}
              </p>
              {moneda !== 'MXN' && (
                <p className="text-sm text-muted-foreground">
                  Equiv. ${(total * tc).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Factura y observaciones */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Factura y observaciones</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Factura del proveedor (opcional)</Label>
            <p className="text-sm text-muted-foreground">Puedes adjuntar la factura ahora o subirla despues del pago.</p>
            {!facturaFile ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-accent-500 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Arrastra tu archivo o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground mb-3">PDF o XML, maximo 10MB</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('El archivo no puede superar 10MB')
                          return
                        }
                        setFacturaFile(file)
                        setTieneFactura(true)
                      }
                    }}
                  />
                  <span className="inline-block bg-accent-500 hover:bg-accent-600 text-white text-sm px-4 py-2 rounded-md">
                    Seleccionar archivo
                  </span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{facturaFile.name}</p>
                    <p className="text-xs text-green-600">{(facturaFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setFacturaFile(null); setTieneFactura(false) }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {!tieneFactura && (
            <div className="space-y-2">
              <Label htmlFor="motivo_sin_factura">Motivo por el que no se adjunta factura</Label>
              <Textarea id="motivo_sin_factura" placeholder="Ej: Aun no la entrega el proveedor, se solicitara despues del servicio..." rows={2} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea id="observaciones" placeholder="Notas adicionales para el aprobador..." rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex justify-end space-x-4 pb-8">
        <Button variant="outline" onClick={() => router.push('/requisiciones')} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={loading}
        >
          {loading && action === 'borrador' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Guardar borrador
        </Button>
        <Button
          onClick={() => {
            if (confirm('Una vez enviada, la solicitud de compra sera revisada por el Director. ¿Deseas continuar?')) {
              handleSubmit(true)
            }
          }}
          disabled={loading}
          className="bg-accent-500 hover:bg-accent-600 text-white"
        >
          {loading && action === 'enviar' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Send className="w-4 h-4 mr-2" />
          Enviar para aprobacion
        </Button>
      </div>
    </div>
  )
}
