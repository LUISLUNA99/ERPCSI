-- ============================================================
-- SCHEMA SQL · ERP CSI · Grupo CSI
-- Base de datos: Supabase (PostgreSQL)
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE estatus_requisicion AS ENUM (
  'BORRADOR',
  'EN_REVISION',
  'APROBADO',
  'RECHAZADO',
  'PROGRAMADO',
  'PAGADO',
  'COMPROBADO',
  'CANCELADO'
);

CREATE TYPE rol_usuario AS ENUM (
  'admin',
  'director',
  'tesorero',
  'operario',
  'visualizador'
);

CREATE TYPE nivel_alerta AS ENUM (
  'PENDIENTE',
  'POR_VENCER',
  'VENCIDA'
);

CREATE TYPE tipo_cfdi AS ENUM (
  'EMITIDA',
  'RECIBIDA'
);

CREATE TYPE moneda AS ENUM (
  'MXN',
  'USD',
  'EUR'
);

-- ============================================================
-- CATÁLOGOS
-- ============================================================

CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rfc TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE empresas IS 'Empresas del Grupo CSI: Buzzword (50), INOVITZ (70), Digital & Creative Mind (DCM)';

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, codigo)
);

CREATE TABLE proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  centro_de_costo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN proyectos.centro_de_costo IS 'Formato: EmpresaID-ClienteID-ProyectoID, ej: 50-01-01';

CREATE TABLE proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rfc TEXT,
  banco TEXT,
  clabe TEXT,
  cuenta TEXT,
  contacto_nombre TEXT,
  contacto_email TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clasificaciones_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0
);

CREATE TABLE bancos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  banco TEXT NOT NULL,
  numero_cuenta TEXT,
  clabe TEXT,
  moneda moneda DEFAULT 'MXN',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USUARIOS
-- ============================================================

CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol rol_usuario NOT NULL,
  empresa_id UUID REFERENCES empresas(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN perfiles.empresa_id IS 'NULL = acceso a todas las empresas (admin/director)';

-- ============================================================
-- REQUISICIONES (núcleo del sistema)
-- ============================================================

CREATE TABLE requisiciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT UNIQUE NOT NULL,

  -- Solicitante
  solicitante_id UUID NOT NULL REFERENCES perfiles(id),
  fecha_solicitud TIMESTAMPTZ DEFAULT now(),

  -- Clasificación
  clasificacion_id UUID REFERENCES clasificaciones_gasto(id),
  mes_servicio TEXT NOT NULL,
  mes_pago_deseado TEXT NOT NULL,

  -- Empresas
  empresa_generadora_id UUID NOT NULL REFERENCES empresas(id),
  empresa_paga_id UUID NOT NULL REFERENCES empresas(id),

  -- Proyecto
  proyecto_id UUID REFERENCES proyectos(id),

  -- Proveedor y concepto
  proveedor_id UUID REFERENCES proveedores(id),
  concepto TEXT NOT NULL,

  -- Importes
  moneda moneda DEFAULT 'MXN',
  importe_me NUMERIC(15,2),
  tipo_cambio NUMERIC(10,4) DEFAULT 1,
  importe_sin_iva NUMERIC(15,2),
  iva NUMERIC(15,2) DEFAULT 0,
  importe_total NUMERIC(15,2) NOT NULL,

  -- Factura inicial (opcional)
  factura_inicial_url TEXT,
  factura_inicial_nombre TEXT,
  numero_factura_inicial TEXT,
  tiene_factura_inicial BOOLEAN DEFAULT false,
  motivo_sin_factura TEXT,

  -- Observaciones solicitante
  observaciones_solicitante TEXT,

  -- Estado
  estatus estatus_requisicion DEFAULT 'BORRADOR',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- APROBACIONES
-- ============================================================

CREATE TABLE aprobaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID NOT NULL REFERENCES requisiciones(id),
  director_id UUID NOT NULL REFERENCES perfiles(id),
  decision TEXT NOT NULL CHECK (decision IN ('APROBADO', 'RECHAZADO')),
  observaciones TEXT,
  fecha TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PAGOS
-- ============================================================

CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID NOT NULL UNIQUE REFERENCES requisiciones(id),
  tesorero_id UUID NOT NULL REFERENCES perfiles(id),

  -- Programación
  banco_empresa_id UUID REFERENCES bancos_empresa(id),
  fecha_programada DATE,
  observaciones_programacion TEXT,

  -- Ejecución
  fecha_pago DATE,
  folio_bancario TEXT,
  comprobante_url TEXT,
  comprobante_nombre TEXT,
  tipo_cambio_real NUMERIC(10,4),
  importe_real_mxn NUMERIC(15,2),
  observaciones_pago TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FACTURAS
-- ============================================================

CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID NOT NULL REFERENCES requisiciones(id),
  subido_por_id UUID NOT NULL REFERENCES perfiles(id),

  numero_factura TEXT,
  factura_url TEXT NOT NULL,
  factura_nombre TEXT NOT NULL,
  xml_url TEXT,
  uuid_cfdi TEXT,
  rfc_emisor TEXT,
  rfc_receptor TEXT,
  fecha_factura DATE,
  subtotal NUMERIC(15,2),
  iva_factura NUMERIC(15,2),
  total_factura NUMERIC(15,2),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ALERTAS DE FACTURA
-- ============================================================

CREATE TABLE alertas_factura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID NOT NULL REFERENCES requisiciones(id),
  pago_id UUID NOT NULL REFERENCES pagos(id),
  deadline DATE NOT NULL,
  nivel nivel_alerta DEFAULT 'PENDIENTE',
  resuelta BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================

CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  requisicion_id UUID REFERENCES requisiciones(id),
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- HISTORIAL / AUDIT TRAIL
-- ============================================================

CREATE TABLE historial_requisiciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID NOT NULL REFERENCES requisiciones(id),
  usuario_id UUID NOT NULL REFERENCES perfiles(id),
  estatus_anterior estatus_requisicion,
  estatus_nuevo estatus_requisicion,
  comentario TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FASE 2: CONCILIACIÓN BANCARIA
-- ============================================================

CREATE TABLE estados_cuenta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_empresa_id UUID NOT NULL REFERENCES bancos_empresa(id),
  periodo TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  archivo_url TEXT,
  archivo_nombre TEXT,
  procesado BOOLEAN DEFAULT false,
  total_cargos NUMERIC(15,2),
  total_abonos NUMERIC(15,2),
  subido_por_id UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE movimientos_bancarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado_cuenta_id UUID NOT NULL REFERENCES estados_cuenta(id),
  fecha DATE NOT NULL,
  descripcion TEXT,
  referencia TEXT,
  cargo NUMERIC(15,2),
  abono NUMERIC(15,2),
  saldo NUMERIC(15,2),
  conciliado BOOLEAN DEFAULT false,
  pago_id UUID REFERENCES pagos(id),
  conciliado_manualmente BOOLEAN DEFAULT false,
  conciliado_por_id UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FASE 3: CONCILIACIÓN SAT
-- ============================================================

CREATE TABLE cfdi_sat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  tipo tipo_cfdi NOT NULL,
  uuid TEXT UNIQUE NOT NULL,
  fecha_emision TIMESTAMPTZ,
  rfc_emisor TEXT,
  nombre_emisor TEXT,
  rfc_receptor TEXT,
  nombre_receptor TEXT,
  subtotal NUMERIC(15,2),
  iva NUMERIC(15,2),
  total NUMERIC(15,2),
  estatus_sat TEXT,
  conciliado BOOLEAN DEFAULT false,
  factura_id UUID REFERENCES facturas(id),
  movimiento_id UUID REFERENCES movimientos_bancarios(id),
  periodo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_requisiciones_estatus ON requisiciones(estatus);
CREATE INDEX idx_requisiciones_empresa_gen ON requisiciones(empresa_generadora_id);
CREATE INDEX idx_requisiciones_empresa_paga ON requisiciones(empresa_paga_id);
CREATE INDEX idx_requisiciones_proyecto ON requisiciones(proyecto_id);
CREATE INDEX idx_requisiciones_fecha ON requisiciones(fecha_solicitud);
CREATE INDEX idx_requisiciones_solicitante ON requisiciones(solicitante_id);
CREATE INDEX idx_requisiciones_folio ON requisiciones(folio);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id, leida);
CREATE INDEX idx_movimientos_conciliado ON movimientos_bancarios(conciliado);
CREATE INDEX idx_cfdi_conciliado ON cfdi_sat(conciliado);
CREATE INDEX idx_alertas_resuelta ON alertas_factura(resuelta, nivel);
CREATE INDEX idx_proyectos_empresa ON proyectos(empresa_id);
CREATE INDEX idx_historial_requisicion ON historial_requisiciones(requisicion_id);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_requisiciones_updated
  BEFORE UPDATE ON requisiciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pagos_updated
  BEFORE UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_alertas_updated
  BEFORE UPDATE ON alertas_factura
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_perfiles_updated
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clasificaciones_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_requisiciones ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS TEXT AS $$
  SELECT rol::TEXT FROM perfiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Catálogos: todos los autenticados pueden leer, solo admin puede escribir
CREATE POLICY "catalogos_read" ON empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogos_write" ON empresas FOR ALL TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "catalogos_read" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogos_write" ON clientes FOR ALL TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "catalogos_read" ON proyectos FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogos_write" ON proyectos FOR ALL TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "catalogos_read" ON proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogos_write" ON proveedores FOR ALL TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "catalogos_read" ON clasificaciones_gasto FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogos_write" ON clasificaciones_gasto FOR ALL TO authenticated USING (get_user_rol() = 'admin');

CREATE POLICY "catalogos_read" ON bancos_empresa FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogos_write" ON bancos_empresa FOR ALL TO authenticated USING (get_user_rol() = 'admin');

-- Perfiles: cada quien ve el suyo, admin ve todos
CREATE POLICY "perfiles_own" ON perfiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_rol() = 'admin');
CREATE POLICY "perfiles_admin" ON perfiles FOR ALL TO authenticated
  USING (get_user_rol() = 'admin');

-- Requisiciones: operario ve las suyas, roles avanzados ven todas
CREATE POLICY "requisiciones_select" ON requisiciones FOR SELECT TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR get_user_rol() IN ('admin', 'director', 'tesorero', 'visualizador')
  );
CREATE POLICY "requisiciones_insert" ON requisiciones FOR INSERT TO authenticated
  WITH CHECK (
    solicitante_id = auth.uid()
    AND get_user_rol() IN ('admin', 'director', 'tesorero', 'operario')
  );
CREATE POLICY "requisiciones_update" ON requisiciones FOR UPDATE TO authenticated
  USING (
    (solicitante_id = auth.uid() AND estatus IN ('BORRADOR', 'RECHAZADO'))
    OR get_user_rol() IN ('admin', 'director', 'tesorero')
  );

-- Notificaciones: solo las propias
CREATE POLICY "notificaciones_own" ON notificaciones FOR ALL TO authenticated
  USING (usuario_id = auth.uid());

-- Aprobaciones: director y admin
CREATE POLICY "aprobaciones_read" ON aprobaciones FOR SELECT TO authenticated
  USING (get_user_rol() IN ('admin', 'director', 'tesorero', 'visualizador'));
CREATE POLICY "aprobaciones_write" ON aprobaciones FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('admin', 'director'));

-- Pagos: tesorero y admin
CREATE POLICY "pagos_read" ON pagos FOR SELECT TO authenticated
  USING (get_user_rol() IN ('admin', 'director', 'tesorero', 'visualizador'));
CREATE POLICY "pagos_write" ON pagos FOR ALL TO authenticated
  USING (get_user_rol() IN ('admin', 'tesorero'));

-- Facturas: operario sube las suyas, tesorero y admin todas
CREATE POLICY "facturas_read" ON facturas FOR SELECT TO authenticated
  USING (get_user_rol() IN ('admin', 'director', 'tesorero', 'visualizador')
    OR subido_por_id = auth.uid());
CREATE POLICY "facturas_insert" ON facturas FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('admin', 'tesorero', 'operario'));

-- Historial: lectura para roles avanzados
CREATE POLICY "historial_read" ON historial_requisiciones FOR SELECT TO authenticated
  USING (get_user_rol() IN ('admin', 'director', 'tesorero', 'visualizador')
    OR EXISTS (
      SELECT 1 FROM requisiciones r
      WHERE r.id = historial_requisiciones.requisicion_id
      AND r.solicitante_id = auth.uid()
    ));

-- Alertas: tesorero y admin
CREATE POLICY "alertas_read" ON alertas_factura FOR SELECT TO authenticated
  USING (get_user_rol() IN ('admin', 'director', 'tesorero'));

-- ============================================================
-- DATOS INICIALES (SEED)
-- ============================================================

-- Empresas del Grupo CSI
INSERT INTO empresas (codigo, nombre, rfc) VALUES
  ('50', 'Buzzword', 'BWC000101XXX'),
  ('70', 'INOVITZ', 'INV000101XXX'),
  ('DCM', 'Digital & Creative Mind', 'DCM000101XXX');

-- Clasificaciones de gasto
INSERT INTO clasificaciones_gasto (nombre, descripcion, orden) VALUES
  ('Pago proveedor', 'Pago a proveedor externo por servicio o producto', 1),
  ('Reembolso', 'Reembolso a empleado por gasto personal del negocio', 2),
  ('Compra', 'Compra de activos o insumos', 3),
  ('Nómina', 'Pago de nómina, aguinaldo, finiquito o pensión', 4),
  ('Finiquito', 'Pago de finiquito a empleado', 5),
  ('Gastos por comprobar', 'Anticipo o gasto que requiere comprobación posterior', 6),
  ('Comisión bancaria', 'Comisiones, intereses y cargos bancarios', 7),
  ('Impuesto', 'Pago de impuestos (ISR, IVA, ISN, IMSS, INFONAVIT, etc.)', 8);

-- Bancos disponibles por empresa (ejemplo Buzzword)
-- NOTA: Completar con cuentas reales antes de producción
-- INSERT INTO bancos_empresa (empresa_id, banco, moneda) VALUES (...)

-- ============================================================
-- STORAGE BUCKETS (ejecutar en Supabase Storage)
-- ============================================================
-- Crear los siguientes buckets en Supabase Storage:
--   - facturas        (privado, max 10MB, pdf/xml)
--   - comprobantes    (privado, max 10MB, pdf)
--   - estados-cuenta  (privado, max 50MB, pdf/xlsx/csv)
--   - cfdi-xml        (privado, max 5MB, xml)
