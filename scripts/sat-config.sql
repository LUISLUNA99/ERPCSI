-- Columnas SAT en empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sat_cert_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sat_key_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sat_password_encrypted TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sat_configurado BOOLEAN DEFAULT false;

-- Bucket privado para certificados SAT
INSERT INTO storage.buckets (id, name, public) VALUES ('sat-certs', 'sat-certs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "sat_certs_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sat-certs' AND
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "sat_certs_admin_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sat-certs' AND
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "sat_certs_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sat-certs' AND
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
