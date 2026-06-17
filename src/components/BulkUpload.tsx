'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, Upload, FileUp, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { parseCSV, generateCSV, downloadCSV } from '@/lib/csv'
import { toast } from 'sonner'

export interface BulkUploadConfig {
  templateName: string
  headers: string[]
  sampleRows?: string[][]
  requiredFields: string[]
  onUpload: (rows: Record<string, string>[]) => Promise<{ inserted: number; updated: number; errors: string[] }>
}

interface Props {
  config: BulkUploadConfig
}

export function BulkUpload({ config }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDownloadTemplate() {
    const csv = generateCSV(config.headers, config.sampleRows)
    downloadCSV(`plantilla-${config.templateName}`, csv)
    toast.success('Plantilla descargada')
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Solo se aceptan archivos CSV')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const text = await file.text()
      const parsed = parseCSV(text)

      if (parsed.length < 2) {
        toast.error('El archivo esta vacio o solo tiene encabezados')
        setLoading(false)
        return
      }

      const fileHeaders = parsed[0].map((h) => h.toLowerCase().trim())
      const templateHeaders = config.headers.map((h) => h.toLowerCase().trim())

      // Validate required headers exist
      const missingHeaders = config.requiredFields.filter(
        (req) => !fileHeaders.includes(req.toLowerCase())
      )
      if (missingHeaders.length > 0) {
        toast.error(`Faltan columnas obligatorias: ${missingHeaders.join(', ')}`)
        setLoading(false)
        return
      }

      // Map rows to objects using header names
      const rows = parsed.slice(1).map((row) => {
        const obj: Record<string, string> = {}
        fileHeaders.forEach((header, i) => {
          // Map to template header name (original casing)
          const matchIdx = templateHeaders.indexOf(header)
          const key = matchIdx >= 0 ? config.headers[matchIdx] : header
          obj[key] = row[i] || ''
        })
        return obj
      })

      // Filter out empty rows
      const nonEmptyRows = rows.filter((row) =>
        Object.values(row).some((v) => v.trim().length > 0)
      )

      if (nonEmptyRows.length === 0) {
        toast.error('No se encontraron registros en el archivo')
        setLoading(false)
        return
      }

      const result = await config.onUpload(nonEmptyRows)
      setResult(result)
      setDialogOpen(true)

      if (result.errors.length === 0) {
        toast.success(`${result.inserted} registros creados, ${result.updated} actualizados`)
      } else {
        toast.warning(`Completado con ${result.errors.length} errores`)
      }
    } catch (err) {
      toast.error('Error al procesar el archivo')
      console.error(err)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          className="border-[#1B3A6B] text-[#1B3A6B] hover:bg-[#1B3A6B] hover:text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Descargar plantilla
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          {loading ? 'Procesando...' : 'Carga masiva'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Resultado de carga masiva
            </DialogTitle>
            <DialogDescription>
              Resumen de la importacion de {config.templateName}
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{result.inserted} creados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">{result.updated} actualizados</p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm font-medium text-red-800">{result.errors.length} errores</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">{err}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setDialogOpen(false)}
                className="w-full bg-accent-500 hover:bg-accent-600"
              >
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
