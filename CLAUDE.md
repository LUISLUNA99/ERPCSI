# CLAUDE.md — ERP CSI · Grupo CSI

> Este archivo es la fuente de verdad para Claude Code. Lee todo antes de escribir una sola línea de código.

---

## 1. Contexto del negocio

**Grupo CSI** es un consorcio de empresas mexicanas. Este sistema gestiona sus cuentas por pagar, conciliación bancaria y validación contra el SAT.

### Empresas del grupo
| ID | Nombre | Descripción |
|----|--------|-------------|
| 50 | Buzzword | Empresa de comunicación |
| 70 | INOVITZ | Empresa de tecnología |
| DCM | Digital & Creative Mind | Agencia creativa |

### Estructura de centros de costo
El formato es `EmpresaID-ClienteID-ProyectoID`, por ejemplo `50-01-01` = Buzzword / Cliente Buenher / Gestión.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| ORM | Supabase client directo (no Prisma) |
| Estilos | Tailwind CSS + shadcn/ui |
| Email | Resend |
| Storage | Supabase Storage (facturas, comprobantes) |
| Deploy | Vercel |
| Lenguaje | TypeScript estricto |

---

## 3. Arquitectura del proyecto

```
/app
  /(auth)
    /login
  /(dashboard)
    /layout.tsx              ← sidebar + notificaciones
    /dashboard               ← home por rol
    /requisiciones
      /nueva                 ← Pantalla Operario
      /[id]                  ← Detalle
    /aprobaciones            ← Pantalla Director de Operaciones
    /pagos                   ← Pantalla Tesorero
    /facturas                ← Pantalla Comprobador
    /conciliacion
      /bancaria              ← Fase 2
      /sat                   ← Fase 3
    /admin
      /catalogos
        /empresas
        /proyectos
        /proveedores
        /clasificaciones
        /bancos
        /usuarios
      /configuracion
    /notificaciones
    /reportes
/components
  /ui                        ← shadcn/ui
  /forms
  /tables
  /cards
  /notifications
/lib
  /supabase
  /email
  /utils
  /validations
/types
  /database.types.ts
/hooks
/middleware.ts               ← protección de rutas por rol
```

---

## 4. Roles y permisos

| Rol | Slug | Descripción |
|-----|------|-------------|
| Administrador | `admin` | Acceso total, gestión de catálogos y usuarios |
| Director de Operaciones | `director` | Aprueba o rechaza requisiciones |
| Tesorero | `tesorero` | Ejecuta pagos, sube comprobantes |
| Operario | `operario` | Crea requisiciones, puede subir factura inicial |
| Visualizador | `visualizador` | Solo lectura en reportes |

### Matriz de permisos por módulo
| Acción | operario | director | tesorero | admin | visualizador |
|--------|----------|----------|----------|-------|--------------|
| Crear requisición | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver sus requisiciones | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver todas las requisiciones | ❌ | ✅ | ✅ | ✅ | ✅ |
| Aprobar / Rechazar | ❌ | ✅ | ❌ | ✅ | ❌ |
| Programar y ejecutar pago | ❌ | ❌ | ✅ | ✅ | ❌ |
| Subir comprobante bancario | ❌ | ❌ | ✅ | ✅ | ❌ |
| Subir factura | ✅ | ❌ | ✅ | ✅ | ❌ |
| Gestionar catálogos | ❌ | ❌ | ❌ | ✅ | ❌ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ✅ | ❌ |
| Ver reportes | ❌ | ✅ | ✅ | ✅ | ✅ |
| Exportar Excel | ❌ | ✅ | ✅ | ✅ | ❌ |
| Cargar estado de cuenta | ❌ | ❌ | ✅ | ✅ | ❌ |
| Ver conciliación | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Flujo de estados de una requisición

```
BORRADOR → EN_REVISION → APROBADO → PROGRAMADO → PAGADO → COMPROBADO
                       ↘ RECHAZADO
                                              ↘ CANCELADO (cualquier etapa)
```

### Transiciones válidas
| De | A | Actor |
|----|---|-------|
| BORRADOR | EN_REVISION | operario |
| EN_REVISION | APROBADO | director |
| EN_REVISION | RECHAZADO | director |
| RECHAZADO | EN_REVISION | operario (re-envía) |
| APROBADO | PROGRAMADO | tesorero |
| PROGRAMADO | PAGADO | tesorero |
| PAGADO | COMPROBADO | tesorero u operario (al subir factura) |
| cualquiera | CANCELADO | director o admin |

---

## 6. Reglas de negocio críticas

### Factura
1. La factura es OPCIONAL al crear la requisición (operario puede no tenerla).
2. La factura es OBLIGATORIA para marcar como COMPROBADO.
3. Si al pagar no hay factura → el registro queda en estado `PAGADO` con alerta activa.

### Alerta de factura vencida
```
deadline = MIN(fecha_pago + 7 días, último_día_del_mes_de_pago)
```

Niveles:
- 🟡 PENDIENTE: sin factura, dentro del plazo
- 🟠 POR_VENCER: quedan ≤ 2 días para el deadline
- 🔴 VENCIDA: pasó el deadline sin factura

Notificaciones automáticas:
- Día 3 post-pago sin factura → recordatorio a Tesorero
- Cuando quedan 2 días → alerta diaria a Tesorero + Admin
- Al vencer → alerta inmediata + correo a Director

### Monedas
- Soportar MXN, USD, EUR
- Siempre almacenar tipo de cambio al momento del pago
- Siempre almacenar el equivalente en MXN

### IVA
- Calcular automáticamente al 16% por defecto
- Permitir captura manual para casos especiales (exento, 0%, etc.)

### Empresa generadora ≠ empresa que paga
- Registro ambas siempre
- Impacta la conciliación bancaria (el movimiento sale de la cuenta de la empresa que paga)

---

## 7. Esquema de base de datos

### Tablas principales

```sql
-- CATÁLOGOS

CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,          -- '50', '70', 'DCM'
  nombre TEXT NOT NULL,                  -- 'Buzzword', 'INOVITZ', etc.
  rfc TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),
  codigo TEXT NOT NULL,                  -- '01', '02', etc.
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),
  cliente_id UUID REFERENCES clientes(id),
  centro_de_costo TEXT UNIQUE NOT NULL,  -- '50-01-01'
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clasificaciones_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true
  -- Valores: 'Pago proveedor', 'Reembolso', 'Compra', 'Nómina',
  --          'Finiquito', 'Gastos por comprobar', 'Comisión bancaria', 'Impuesto'
);

CREATE TABLE bancos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),
  banco TEXT NOT NULL,                   -- 'Santander', 'BBVA', 'HSBC', 'Banregio'
  numero_cuenta TEXT,
  clabe TEXT,
  moneda TEXT DEFAULT 'MXN',
  activo BOOLEAN DEFAULT true
);

-- USUARIOS

CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin','director','tesorero','operario','visualizador')),
  empresa_id UUID REFERENCES empresas(id),   -- empresa principal del usuario (puede ser null = todas)
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- REQUISICIONES (núcleo del sistema)

CREATE TABLE requisiciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT UNIQUE NOT NULL,            -- 'REQ-2026-0001'
  
  -- Solicitante
  solicitante_id UUID REFERENCES perfiles(id),
  fecha_solicitud TIMESTAMPTZ DEFAULT now(),
  
  -- Clasificación
  clasificacion_id UUID REFERENCES clasificaciones_gasto(id),
  mes_servicio TEXT NOT NULL,            -- 'ENE-2026', 'FEB-2026', etc.
  mes_pago_deseado TEXT NOT NULL,
  
  -- Empresas
  empresa_generadora_id UUID REFERENCES empresas(id),
  empresa_paga_id UUID REFERENCES empresas(id),
  
  -- Proyecto
  proyecto_id UUID REFERENCES proyectos(id),
  
  -- Proveedor y concepto
  proveedor_id UUID REFERENCES proveedores(id),
  concepto TEXT NOT NULL,
  
  -- Importes
  moneda TEXT DEFAULT 'MXN',
  importe_me NUMERIC(15,2),              -- monto en moneda extranjera
  tipo_cambio NUMERIC(10,4) DEFAULT 1,
  importe_sin_iva NUMERIC(15,2),
  iva NUMERIC(15,2),
  importe_total NUMERIC(15,2) NOT NULL,
  
  -- Factura inicial (opcional al crear)
  factura_inicial_url TEXT,
  factura_inicial_nombre TEXT,
  numero_factura_inicial TEXT,
  tiene_factura_inicial BOOLEAN DEFAULT false,
  motivo_sin_factura TEXT,               -- obligatorio si no hay factura
  
  -- Observaciones del solicitante
  observaciones_solicitante TEXT,
  
  -- Estado
  estatus TEXT DEFAULT 'BORRADOR' CHECK (estatus IN (
    'BORRADOR','EN_REVISION','APROBADO','RECHAZADO',
    'PROGRAMADO','PAGADO','COMPROBADO','CANCELADO'
  )),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- APROBACIONES

CREATE TABLE aprobaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID REFERENCES requisiciones(id),
  director_id UUID REFERENCES perfiles(id),
  decision TEXT NOT NULL CHECK (decision IN ('APROBADO','RECHAZADO')),
  observaciones TEXT,
  fecha TIMESTAMPTZ DEFAULT now()
);

-- PAGOS

CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID REFERENCES requisiciones(id) UNIQUE,
  tesorero_id UUID REFERENCES perfiles(id),
  
  -- Programación
  banco_empresa_id UUID REFERENCES bancos_empresa(id),
  fecha_programada DATE,
  observaciones_programacion TEXT,
  
  -- Ejecución
  fecha_pago DATE,
  folio_bancario TEXT,
  comprobante_url TEXT,
  comprobante_nombre TEXT,
  tipo_cambio_real NUMERIC(10,4),        -- TC al momento del pago (puede diferir del solicitado)
  importe_real_mxn NUMERIC(15,2),
  observaciones_pago TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FACTURAS

CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID REFERENCES requisiciones(id),
  subido_por_id UUID REFERENCES perfiles(id),
  
  numero_factura TEXT,
  factura_url TEXT NOT NULL,
  factura_nombre TEXT NOT NULL,
  xml_url TEXT,                          -- CFDI XML para validación SAT
  uuid_cfdi TEXT,                        -- UUID del timbre fiscal
  rfc_emisor TEXT,
  rfc_receptor TEXT,
  fecha_factura DATE,
  subtotal NUMERIC(15,2),
  iva_factura NUMERIC(15,2),
  total_factura NUMERIC(15,2),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ALERTAS DE FACTURA

CREATE TABLE alertas_factura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID REFERENCES requisiciones(id),
  pago_id UUID REFERENCES pagos(id),
  deadline DATE NOT NULL,
  nivel TEXT DEFAULT 'PENDIENTE' CHECK (nivel IN ('PENDIENTE','POR_VENCER','VENCIDA')),
  resuelta BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- NOTIFICACIONES

CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES perfiles(id),
  tipo TEXT NOT NULL,                    -- 'nueva_requisicion', 'aprobacion', 'rechazo', 'pago', 'alerta_factura'
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  requisicion_id UUID REFERENCES requisiciones(id),
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HISTORIAL DE CAMBIOS (audit trail)

CREATE TABLE historial_requisiciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID REFERENCES requisiciones(id),
  usuario_id UUID REFERENCES perfiles(id),
  estatus_anterior TEXT,
  estatus_nuevo TEXT,
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FASE 2: ESTADOS DE CUENTA BANCARIOS

CREATE TABLE estados_cuenta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_empresa_id UUID REFERENCES bancos_empresa(id),
  periodo TEXT NOT NULL,                 -- 'ENE-2026'
  fecha_inicio DATE,
  fecha_fin DATE,
  archivo_url TEXT,
  procesado BOOLEAN DEFAULT false,
  subido_por_id UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE movimientos_bancarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado_cuenta_id UUID REFERENCES estados_cuenta(id),
  fecha DATE NOT NULL,
  descripcion TEXT,
  referencia TEXT,
  cargo NUMERIC(15,2),
  abono NUMERIC(15,2),
  saldo NUMERIC(15,2),
  conciliado BOOLEAN DEFAULT false,
  pago_id UUID REFERENCES pagos(id),    -- FK cuando se concilia
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FASE 3: FACTURAS SAT

CREATE TABLE cfdi_sat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('EMITIDA','RECIBIDA')),
  uuid TEXT UNIQUE NOT NULL,
  fecha_emision TIMESTAMPTZ,
  rfc_emisor TEXT,
  nombre_emisor TEXT,
  rfc_receptor TEXT,
  nombre_receptor TEXT,
  subtotal NUMERIC(15,2),
  iva NUMERIC(15,2),
  total NUMERIC(15,2),
  estatus_sat TEXT,                      -- 'Vigente', 'Cancelado'
  conciliado BOOLEAN DEFAULT false,
  factura_id UUID REFERENCES facturas(id),
  movimiento_id UUID REFERENCES movimientos_bancarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Índices importantes
```sql
CREATE INDEX idx_requisiciones_estatus ON requisiciones(estatus);
CREATE INDEX idx_requisiciones_empresa ON requisiciones(empresa_generadora_id);
CREATE INDEX idx_requisiciones_proyecto ON requisiciones(proyecto_id);
CREATE INDEX idx_requisiciones_fecha ON requisiciones(fecha_solicitud);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id, leida);
CREATE INDEX idx_movimientos_conciliado ON movimientos_bancarios(conciliado);
CREATE INDEX idx_cfdi_conciliado ON cfdi_sat(conciliado);
```

### Row Level Security (RLS)
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE requisiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
-- ... (aplicar a todas)

-- Política: operario solo ve sus propias requisiciones
CREATE POLICY "operario_sus_requisiciones" ON requisiciones
  FOR SELECT USING (
    solicitante_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','director','tesorero','visualizador'))
  );

-- Política: notificaciones solo propias
CREATE POLICY "notificaciones_propias" ON notificaciones
  FOR SELECT USING (usuario_id = auth.uid());
```

---

## 8. Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 9. Comandos de desarrollo

```bash
npm install
npm run dev          # desarrollo local
npm run build        # build de producción
npm run type-check   # verificar tipos TypeScript
```

---

## 10. Convenciones de código

- Componentes: PascalCase (`RequisicionCard.tsx`)
- Hooks: camelCase con prefijo `use` (`useRequisiciones.ts`)
- Server Actions: en `/app/actions/` con sufijo `.actions.ts`
- Tipos de DB: generados desde Supabase en `/types/database.types.ts`
- Siempre usar `'use server'` o `'use client'` explícitamente
- Validación con Zod en todos los formularios
- Manejo de errores con try/catch en todas las server actions
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente

---

## 11. Diseño UI — Principios para usuarios no técnicos

El sistema tiene dos tipos de usuarios principales:
- **Operativos**: capturan gastos, no son expertos en tecnología
- **Financieros**: revisan, aprogan y concilian, requieren datos claros

### Principios de diseño
1. **Una acción principal por pantalla** — el botón más importante siempre está visible y destacado
2. **Lenguaje del negocio, no del sistema** — "Enviar para aprobación" no "Submit"
3. **Estados visibles siempre** — el usuario siempre sabe en qué paso está
4. **Errores explicativos** — nunca "Error 400", siempre "El monto debe ser mayor a $0"
5. **Confirmaciones en acciones irreversibles** — aprobar, rechazar, cancelar piden confirmación
6. **Formularios cortos** — mostrar solo los campos necesarios para ese momento
7. **Feedback inmediato** — toasts de éxito/error después de cada acción

### Paleta de colores (sistema financiero confiable)
- **Primario**: `#1B3A6B` — azul marino institucional
- **Secundario**: `#2563EB` — azul acción
- **Éxito**: `#16A34A` — verde
- **Alerta**: `#D97706` — naranja
- **Peligro**: `#DC2626` — rojo
- **Neutro**: `#F8FAFC` — fondo general
- **Texto**: `#0F172A` — casi negro

### Estatus con colores consistentes
| Estatus | Color | Badge |
|---------|-------|-------|
| BORRADOR | Gris | `bg-gray-100 text-gray-700` |
| EN_REVISION | Azul | `bg-blue-100 text-blue-700` |
| APROBADO | Verde claro | `bg-green-100 text-green-700` |
| RECHAZADO | Rojo claro | `bg-red-100 text-red-700` |
| PROGRAMADO | Púrpura | `bg-purple-100 text-purple-700` |
| PAGADO | Verde | `bg-green-200 text-green-800` |
| COMPROBADO | Verde oscuro | `bg-emerald-100 text-emerald-800` |
| CANCELADO | Gris oscuro | `bg-gray-200 text-gray-600` |

---

## 12. Fases del proyecto

### Fase 1 — CxP (Cuentas por Pagar) ← ACTUAL
- [ ] Setup proyecto Next.js + Supabase
- [ ] Esquema de base de datos completo
- [ ] Autenticación y roles (middleware)
- [ ] Catálogos (Admin): empresas, proyectos, proveedores, clasificaciones, bancos
- [ ] Gestión de usuarios (Admin)
- [ ] Pantalla Operario: nueva requisición
- [ ] Pantalla Director: aprobaciones
- [ ] Pantalla Tesorero: pagos
- [ ] Subida de facturas y comprobantes (Supabase Storage)
- [ ] Motor de alertas de factura vencida
- [ ] Sistema de notificaciones (in-app + email via Resend)
- [ ] Vista global CxP (Admin/Director/Tesorero)
- [ ] Reportes y exportación Excel

### Fase 2 — Conciliación Bancaria
- [ ] Parsers por banco (Santander, BBVA, HSBC, Banregio)
- [ ] Carga de estados de cuenta
- [ ] Motor de matching CxP vs Banco
- [ ] Dashboard de conciliación bancaria
- [ ] Gestión de partidas no conciliadas

### Fase 3 — Conciliación SAT
- [ ] Carga de CFDIs emitidos y recibidos (XML)
- [ ] Motor de matching triple (CxP + Banco + SAT)
- [ ] Dashboard de conciliación SAT
- [ ] Reporte de diferencias

---

## 13. Recomendación de diseño UI/UX

Para el diseño de pantallas se recomienda usar **v0.dev** de Vercel:
- Genera componentes React/Tailwind listos para Next.js
- Integra directamente con shadcn/ui (mismo stack del proyecto)
- Permite describir en español lo que necesitas
- Output es código limpio y editable

### Prompt sugerido para v0.dev
Al usar v0.dev, describe así cada pantalla:
> "Diseña una pantalla de [nombre] para un sistema financiero empresarial en México. El usuario es [rol]. La pantalla debe mostrar [elementos]. Los colores institucionales son azul marino #1B3A6B y azul acción #2563EB. El diseño debe ser limpio, con mucho espacio en blanco, lenguaje en español, pensado para usuarios no técnicos. Usar shadcn/ui components."

---

## 14. API Routes / Server Actions principales

```
POST   /app/actions/requisiciones/crear.actions.ts
POST   /app/actions/requisiciones/enviar.actions.ts
POST   /app/actions/aprobaciones/aprobar.actions.ts
POST   /app/actions/aprobaciones/rechazar.actions.ts
POST   /app/actions/pagos/programar.actions.ts
POST   /app/actions/pagos/ejecutar.actions.ts
POST   /app/actions/facturas/subir.actions.ts
GET    /app/actions/reportes/exportar.actions.ts
POST   /app/actions/notificaciones/marcar-leida.actions.ts
```

---

## 15. Generador de folios

```typescript
// lib/utils/folio.ts
export async function generarFolio(supabase: SupabaseClient): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('requisiciones')
    .select('*', { count: 'exact', head: true })
    .like('folio', `REQ-${year}-%`)
  
  const numero = String((count || 0) + 1).padStart(4, '0')
  return `REQ-${year}-${numero}`
}
```

---

## 16. Motor de alertas (cron job o trigger)

```typescript
// lib/alertas/factura.ts

export function calcularDeadlineFactura(fechaPago: Date): Date {
  const mas7dias = new Date(fechaPago)
  mas7dias.setDate(mas7dias.getDate() + 7)
  
  const finDeMes = new Date(fechaPago.getFullYear(), fechaPago.getMonth() + 1, 0)
  
  return mas7dias < finDeMes ? mas7dias : finDeMes
}

export function calcularNivelAlerta(deadline: Date): 'PENDIENTE' | 'POR_VENCER' | 'VENCIDA' {
  const hoy = new Date()
  const diasRestantes = Math.floor((deadline.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diasRestantes < 0) return 'VENCIDA'
  if (diasRestantes <= 2) return 'POR_VENCER'
  return 'PENDIENTE'
}
```

El cron se ejecuta diariamente via Vercel Cron Jobs o Supabase Edge Functions.
