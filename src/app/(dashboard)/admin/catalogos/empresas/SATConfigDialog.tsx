'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { guardarConfigSAT } from '@/app/actions/empresas.actions'
import { Loader2, Shield, Eye, EyeOff, Upload, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Empresa {
  id: string
  codigo: string
  nombre: string
  rfc: string | null
  sat_configurado: boolean | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresa: Empresa | null
}

export function SATConfigDialog({ open, onOpenChange, empresa }: Props) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [certFileName, setCertFileName] = useState('')
  const [keyFileName, setKeyFileName] = useState('')

  if (!empresa) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await guardarConfigSAT(empresa!.id, formData)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Configuracion SAT guardada correctamente')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1B3A6B]" />
            Configuracion SAT — {empresa.codigo}
          </DialogTitle>
          <DialogDescription>
            e.firma (certificado y clave privada) para {empresa.nombre}
          </DialogDescription>
        </DialogHeader>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          {empresa.sat_configurado ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              SAT Configurado
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              SAT Pendiente
            </Badge>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Confidentiality notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium">Informacion confidencial</p>
            <p className="mt-1">Esta informacion es confidencial. Solo el administrador tiene acceso. Los archivos .cer y .key no son descargables, solo reemplazables.</p>
          </div>

          {/* RFC */}
          <div className="space-y-2">
            <Label htmlFor="sat_rfc">RFC</Label>
            <Input
              id="sat_rfc"
              name="rfc"
              placeholder="Ej: BWD010101AAA"
              defaultValue={empresa.rfc || ''}
              className="uppercase"
              required
            />
            <p className="text-xs text-muted-foreground">Formato: 3-4 letras + 6 digitos + 3 caracteres alfanumericos</p>
          </div>

          {/* Separator */}
          <div className="border-t border-dashed border-gray-300 pt-4">
            <p className="text-sm font-medium text-[#1B3A6B] mb-3">Archivos de e.firma</p>
          </div>

          {/* Cert file */}
          <div className="space-y-2">
            <Label htmlFor="cert_file">
              Certificado (.cer)
              {!empresa.sat_configurado && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-colors flex-1">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {certFileName || (empresa.sat_configurado ? 'Reemplazar certificado' : 'Seleccionar archivo .cer')}
                </span>
                <input
                  type="file"
                  name="cert_file"
                  accept=".cer"
                  className="hidden"
                  onChange={(e) => setCertFileName(e.target.files?.[0]?.name || '')}
                />
              </label>
            </div>
            {empresa.sat_configurado && (
              <p className="text-xs text-green-600">Certificado ya cargado. Solo sube uno nuevo para reemplazarlo.</p>
            )}
          </div>

          {/* Key file */}
          <div className="space-y-2">
            <Label htmlFor="key_file">
              Clave privada (.key)
              {!empresa.sat_configurado && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-colors flex-1">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {keyFileName || (empresa.sat_configurado ? 'Reemplazar clave privada' : 'Seleccionar archivo .key')}
                </span>
                <input
                  type="file"
                  name="key_file"
                  accept=".key"
                  className="hidden"
                  onChange={(e) => setKeyFileName(e.target.files?.[0]?.name || '')}
                />
              </label>
            </div>
            {empresa.sat_configurado && (
              <p className="text-xs text-green-600">Clave ya cargada. Solo sube una nueva para reemplazarla.</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="sat_password">Contrasena de clave privada</Label>
            <div className="relative">
              <Input
                id="sat_password"
                name="sat_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Contrasena del archivo .key"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">La contrasena se almacena encriptada con AES-256</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
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
              className="bg-[#1B3A6B] hover:bg-[#15305a] text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar configuracion SAT
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
