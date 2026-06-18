-- Bitacora de auditoria
CREATE TABLE IF NOT EXISTS bitacora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES perfiles(id),
  usuario_nombre TEXT,
  usuario_email TEXT,
  usuario_rol TEXT,
  accion TEXT NOT NULL,
  modulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  entidad_tipo TEXT,
  entidad_id TEXT,
  entidad_descripcion TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address TEXT,
  user_agent TEXT,
  resultado TEXT DEFAULT 'exitoso' CHECK (resultado IN ('exitoso','fallido','parcial')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_usuario ON bitacora(usuario_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo ON bitacora(modulo);
CREATE INDEX IF NOT EXISTS idx_bitacora_accion ON bitacora(accion);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora(created_at);
CREATE INDEX IF NOT EXISTS idx_bitacora_entidad ON bitacora(entidad_tipo, entidad_id);

-- Permitir insert desde cualquier usuario autenticado
ALTER TABLE bitacora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bitacora_insert_auth" ON bitacora
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bitacora_select_admin" ON bitacora
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
