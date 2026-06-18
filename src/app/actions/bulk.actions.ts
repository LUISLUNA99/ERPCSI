'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { registrarAccion } from '@/lib/auditoria'

interface BulkResult {
  inserted: number
  updated: number
  errors: string[]
}

// ─── EMPRESAS ────────────────────────────────────────────

export async function bulkImportEmpresas(rows: Record<string, string>[]): Promise<BulkResult> {
  const supabase = await createClient()
  const result: BulkResult = { inserted: 0, updated: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2
    const codigo = row['codigo']?.trim()
    const nombre = row['nombre']?.trim()
    const rfc = row['rfc']?.trim() || null

    if (!codigo || !nombre) {
      result.errors.push(`Fila ${lineNum}: codigo y nombre son obligatorios`)
      continue
    }

    // Check if exists by codigo
    const { data: existing } = await supabase
      .from('empresas')
      .select('id')
      .eq('codigo', codigo)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('empresas')
        .update({ nombre, rfc })
        .eq('id', existing.id)
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al actualizar ${codigo} - ${error.message}`)
      } else {
        result.updated++
      }
    } else {
      const { error } = await supabase
        .from('empresas')
        .insert({ codigo, nombre, rfc })
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al crear ${codigo} - ${error.message}`)
      } else {
        result.inserted++
      }
    }
  }

  revalidatePath('/admin/catalogos/empresas')
  await registrarAccion({ accion: 'carga_masiva', modulo: 'catalogos', descripcion: `Carga masiva de empresas: ${result.inserted} creados, ${result.updated} actualizados, ${result.errors.length} errores`, entidadTipo: 'empresa', resultado: result.errors.length > 0 ? 'parcial' : 'exitoso', metadata: { inserted: result.inserted, updated: result.updated, errorCount: result.errors.length } })
  return result
}

// ─── PROVEEDORES ─────────────────────────────────────────

export async function bulkImportProveedores(rows: Record<string, string>[]): Promise<BulkResult> {
  const supabase = await createClient()
  const result: BulkResult = { inserted: 0, updated: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2
    const nombre = row['nombre']?.trim()
    const rfc = row['rfc']?.trim() || null
    const banco = row['banco']?.trim() || null
    const clabe = row['clabe']?.trim() || null
    const cuenta = row['cuenta']?.trim() || null
    const contacto_nombre = row['contacto_nombre']?.trim() || null
    const contacto_email = row['contacto_email']?.trim() || null

    if (!nombre) {
      result.errors.push(`Fila ${lineNum}: nombre es obligatorio`)
      continue
    }

    // Check if exists by RFC (if provided) or exact name match
    let existing = null
    if (rfc) {
      const { data } = await supabase
        .from('proveedores')
        .select('id')
        .eq('rfc', rfc)
        .single()
      existing = data
    }
    if (!existing) {
      const { data } = await supabase
        .from('proveedores')
        .select('id')
        .eq('nombre', nombre)
        .single()
      existing = data
    }

    if (existing) {
      const { error } = await supabase
        .from('proveedores')
        .update({ nombre, rfc, banco, clabe, cuenta, contacto_nombre, contacto_email })
        .eq('id', existing.id)
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al actualizar ${nombre} - ${error.message}`)
      } else {
        result.updated++
      }
    } else {
      const { error } = await supabase
        .from('proveedores')
        .insert({ nombre, rfc, banco, clabe, cuenta, contacto_nombre, contacto_email })
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al crear ${nombre} - ${error.message}`)
      } else {
        result.inserted++
      }
    }
  }

  revalidatePath('/admin/catalogos/proveedores')
  await registrarAccion({ accion: 'carga_masiva', modulo: 'catalogos', descripcion: `Carga masiva de proveedores: ${result.inserted} creados, ${result.updated} actualizados, ${result.errors.length} errores`, entidadTipo: 'proveedor', resultado: result.errors.length > 0 ? 'parcial' : 'exitoso', metadata: { inserted: result.inserted, updated: result.updated, errorCount: result.errors.length } })
  return result
}

// ─── CLASIFICACIONES ─────────────────────────────────────

export async function bulkImportClasificaciones(rows: Record<string, string>[]): Promise<BulkResult> {
  const supabase = await createClient()
  const result: BulkResult = { inserted: 0, updated: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2
    const nombre = row['nombre']?.trim()
    const descripcion = row['descripcion']?.trim() || null

    if (!nombre) {
      result.errors.push(`Fila ${lineNum}: nombre es obligatorio`)
      continue
    }

    const { data: existing } = await supabase
      .from('clasificaciones_gasto')
      .select('id')
      .eq('nombre', nombre)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('clasificaciones_gasto')
        .update({ descripcion })
        .eq('id', existing.id)
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al actualizar ${nombre} - ${error.message}`)
      } else {
        result.updated++
      }
    } else {
      const { error } = await supabase
        .from('clasificaciones_gasto')
        .insert({ nombre, descripcion })
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al crear ${nombre} - ${error.message}`)
      } else {
        result.inserted++
      }
    }
  }

  revalidatePath('/admin/catalogos/clasificaciones')
  await registrarAccion({ accion: 'carga_masiva', modulo: 'catalogos', descripcion: `Carga masiva de clasificaciones: ${result.inserted} creados, ${result.updated} actualizados, ${result.errors.length} errores`, entidadTipo: 'clasificacion', resultado: result.errors.length > 0 ? 'parcial' : 'exitoso', metadata: { inserted: result.inserted, updated: result.updated, errorCount: result.errors.length } })
  return result
}

// ─── BANCOS EMPRESA ──────────────────────────────────────

export async function bulkImportBancos(rows: Record<string, string>[]): Promise<BulkResult> {
  const supabase = await createClient()
  const result: BulkResult = { inserted: 0, updated: 0, errors: [] }

  // Cache de empresas por codigo
  const { data: empresas } = await supabase.from('empresas').select('id, codigo')
  const empresaMap = new Map((empresas || []).map((e) => [e.codigo.toLowerCase(), e.id]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2
    const empresaCodigo = row['empresa_codigo']?.trim()
    const banco = row['banco']?.trim()
    const numero_cuenta = row['numero_cuenta']?.trim() || null
    const clabe = row['clabe']?.trim() || null
    const moneda = row['moneda']?.trim()?.toUpperCase() || 'MXN'

    if (!empresaCodigo || !banco) {
      result.errors.push(`Fila ${lineNum}: empresa_codigo y banco son obligatorios`)
      continue
    }

    const empresaId = empresaMap.get(empresaCodigo.toLowerCase())
    if (!empresaId) {
      result.errors.push(`Fila ${lineNum}: No se encontro la empresa con codigo "${empresaCodigo}"`)
      continue
    }

    if (!['MXN', 'USD', 'EUR'].includes(moneda)) {
      result.errors.push(`Fila ${lineNum}: Moneda invalida "${moneda}". Usa MXN, USD o EUR`)
      continue
    }

    // Check duplicate by empresa + banco + numero_cuenta
    const { data: existing } = await supabase
      .from('bancos_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('banco', banco)
      .eq('numero_cuenta', numero_cuenta || '')
      .single()

    if (existing) {
      const { error } = await supabase
        .from('bancos_empresa')
        .update({ clabe, moneda })
        .eq('id', existing.id)
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al actualizar - ${error.message}`)
      } else {
        result.updated++
      }
    } else {
      const { error } = await supabase
        .from('bancos_empresa')
        .insert({ empresa_id: empresaId, banco, numero_cuenta, clabe, moneda })
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al crear - ${error.message}`)
      } else {
        result.inserted++
      }
    }
  }

  revalidatePath('/admin/catalogos/bancos')
  await registrarAccion({ accion: 'carga_masiva', modulo: 'catalogos', descripcion: `Carga masiva de cuentas bancarias: ${result.inserted} creados, ${result.updated} actualizados, ${result.errors.length} errores`, entidadTipo: 'banco', resultado: result.errors.length > 0 ? 'parcial' : 'exitoso', metadata: { inserted: result.inserted, updated: result.updated, errorCount: result.errors.length } })
  return result
}

// ─── PROYECTOS (CENTROS DE COSTO) ───────────────────────

export async function bulkImportProyectos(rows: Record<string, string>[]): Promise<BulkResult> {
  const supabase = await createClient()
  const result: BulkResult = { inserted: 0, updated: 0, errors: [] }

  // Cache de empresas
  const { data: empresas } = await supabase.from('empresas').select('id, codigo')
  const empresaMap = new Map((empresas || []).map((e) => [e.codigo.toLowerCase(), e.id]))

  // Cache de clientes (se actualiza cuando se crean nuevos)
  const { data: clientes } = await supabase.from('clientes').select('id, codigo, empresa_id')
  const clienteMap = new Map(
    (clientes || []).map((c) => [`${c.empresa_id}-${c.codigo.toLowerCase()}`, c.id])
  )

  // Detectar duplicados dentro del mismo archivo
  const ccEnArchivo = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2
    const centro_de_costo = row['centro_de_costo']?.trim()
    const empresa_codigo = row['empresa_codigo']?.trim()
    const cliente_codigo = row['cliente_codigo']?.trim()
    const cliente_nombre = row['cliente_nombre']?.trim() || ''
    const nombre = row['nombre']?.trim()
    const descripcion = row['descripcion']?.trim() || null

    if (!centro_de_costo || !empresa_codigo || !cliente_codigo || !nombre) {
      result.errors.push(`Fila ${lineNum}: centro_de_costo, empresa_codigo, cliente_codigo y nombre son obligatorios`)
      continue
    }

    // Validar formato XX-XX-XX
    if (!/^\w+-\w+-\w+$/.test(centro_de_costo)) {
      result.errors.push(`Fila ${lineNum}: Formato de centro de costo invalido "${centro_de_costo}". Usa XX-XX-XX`)
      continue
    }

    // Validar duplicados dentro del archivo
    if (ccEnArchivo.has(centro_de_costo.toLowerCase())) {
      result.errors.push(`Fila ${lineNum}: Centro de costo "${centro_de_costo}" esta duplicado en el archivo`)
      continue
    }
    ccEnArchivo.add(centro_de_costo.toLowerCase())

    const empresaId = empresaMap.get(empresa_codigo.toLowerCase())
    if (!empresaId) {
      result.errors.push(`Fila ${lineNum}: No se encontro la empresa con codigo "${empresa_codigo}"`)
      continue
    }

    // Auto-crear cliente si no existe
    const clienteKey = `${empresaId}-${cliente_codigo.toLowerCase()}`
    let clienteId = clienteMap.get(clienteKey)
    if (!clienteId) {
      const clienteNombre = cliente_nombre || `Cliente ${cliente_codigo}`
      const { data: nuevoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({ empresa_id: empresaId, codigo: cliente_codigo, nombre: clienteNombre })
        .select('id')
        .single()

      if (clienteError) {
        if (clienteError.code === '23505') {
          // Ya existe, obtenerlo
          const { data: existente } = await supabase
            .from('clientes')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('codigo', cliente_codigo)
            .single()
          if (existente) {
            clienteId = existente.id
            clienteMap.set(clienteKey, clienteId)
          } else {
            result.errors.push(`Fila ${lineNum}: Error al obtener cliente "${cliente_codigo}"`)
            continue
          }
        } else {
          result.errors.push(`Fila ${lineNum}: Error al crear cliente "${cliente_codigo}" - ${clienteError.message}`)
          continue
        }
      } else {
        clienteId = nuevoCliente.id
        clienteMap.set(clienteKey, clienteId)
      }
    }

    // Check if CC already exists
    const { data: existing } = await supabase
      .from('proyectos')
      .select('id')
      .eq('centro_de_costo', centro_de_costo)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('proyectos')
        .update({ empresa_id: empresaId, cliente_id: clienteId, nombre, descripcion })
        .eq('id', existing.id)
      if (error) {
        result.errors.push(`Fila ${lineNum}: Error al actualizar ${centro_de_costo} - ${error.message}`)
      } else {
        result.updated++
      }
    } else {
      const { error } = await supabase
        .from('proyectos')
        .insert({ empresa_id: empresaId, cliente_id: clienteId, centro_de_costo, nombre, descripcion })
      if (error) {
        if (error.code === '23505') {
          result.errors.push(`Fila ${lineNum}: Ya existe el centro de costo "${centro_de_costo}"`)
        } else {
          result.errors.push(`Fila ${lineNum}: Error al crear ${centro_de_costo} - ${error.message}`)
        }
      } else {
        result.inserted++
      }
    }
  }

  revalidatePath('/admin/catalogos/proyectos')
  await registrarAccion({ accion: 'carga_masiva', modulo: 'catalogos', descripcion: `Carga masiva de centros de costo: ${result.inserted} creados, ${result.updated} actualizados, ${result.errors.length} errores`, entidadTipo: 'proyecto', resultado: result.errors.length > 0 ? 'parcial' : 'exitoso', metadata: { inserted: result.inserted, updated: result.updated, errorCount: result.errors.length } })
  return result
}
