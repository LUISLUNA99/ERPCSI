export type Rol = 'admin' | 'director' | 'tesorero' | 'operario' | 'visualizador' | 'pendiente'

export type ProveedorAuth = 'email' | 'microsoft'

export type EstatusRequisicion =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'PROGRAMADO'
  | 'PAGADO'
  | 'COMPROBADO'
  | 'CANCELADO'

export type NivelAlerta = 'PENDIENTE' | 'POR_VENCER' | 'VENCIDA'

export type Moneda = 'MXN' | 'USD' | 'EUR'

export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: Rol
  empresa_id: string | null
  activo: boolean
  proveedor_auth: ProveedorAuth
  foto_url: string | null
  created_at: string
  updated_at: string
}

export interface Empresa {
  id: string
  codigo: string
  nombre: string
  rfc: string | null
  activa: boolean
  created_at: string
  updated_at: string
}

export interface Proyecto {
  id: string
  empresa_id: string
  cliente_id: string
  centro_de_costo: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Proveedor {
  id: string
  nombre: string
  rfc: string | null
  banco: string | null
  clabe: string | null
  cuenta: string | null
  contacto_nombre: string | null
  contacto_email: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface ClasificacionGasto {
  id: string
  nombre: string
  descripcion: string | null
  activa: boolean
  orden: number
}

export interface BancoEmpresa {
  id: string
  empresa_id: string
  banco: string
  numero_cuenta: string | null
  clabe: string | null
  moneda: Moneda
  activo: boolean
  created_at: string
}

export interface Requisicion {
  id: string
  folio: string
  solicitante_id: string
  fecha_solicitud: string
  clasificacion_id: string | null
  mes_servicio: string
  mes_pago_deseado: string
  empresa_generadora_id: string
  empresa_paga_id: string
  proyecto_id: string | null
  proveedor_id: string | null
  concepto: string
  moneda: Moneda
  importe_me: number | null
  tipo_cambio: number
  importe_sin_iva: number | null
  iva: number | null
  importe_total: number
  factura_inicial_url: string | null
  factura_inicial_nombre: string | null
  numero_factura_inicial: string | null
  tiene_factura_inicial: boolean
  motivo_sin_factura: string | null
  observaciones_solicitante: string | null
  estatus: EstatusRequisicion
  created_at: string
  updated_at: string
}

export interface Notificacion {
  id: string
  usuario_id: string
  tipo: string
  titulo: string
  mensaje: string
  requisicion_id: string | null
  leida: boolean
  created_at: string
}
