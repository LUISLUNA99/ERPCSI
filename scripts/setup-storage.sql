-- Crear buckets en Supabase Storage
-- Ejecutar en SQL Editor de Supabase Dashboard

INSERT INTO storage.buckets (id, name, public) VALUES ('facturas', 'facturas', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', true);

-- Politicas de acceso: cualquier usuario autenticado puede subir
CREATE POLICY "Usuarios autenticados pueden subir facturas"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'facturas');

CREATE POLICY "Usuarios autenticados pueden ver facturas"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'facturas');

CREATE POLICY "Usuarios autenticados pueden subir comprobantes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Usuarios autenticados pueden ver comprobantes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'comprobantes');
