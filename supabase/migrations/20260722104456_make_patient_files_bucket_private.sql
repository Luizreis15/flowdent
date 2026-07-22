-- CRÍTICO 2: bucket patient-files deixa de ser público.
-- Arquivos passam a ser servidos só via signed URL (createSignedUrl) ou download autenticado.
-- Policies de storage existentes (escopo por clínica / pasta clinicas/) continuam valendo
-- para autorizar a geração de signed URLs.

UPDATE storage.buckets
SET public = false
WHERE id = 'patient-files';

-- Normaliza logotipo_url legado (URL pública completa) → path relativo no storage.
UPDATE public.configuracoes_clinica
SET logotipo_url = substring(
  split_part(logotipo_url, '?', 1)
  from '/storage/v1/object/public/patient-files/(.*)$'
)
WHERE logotipo_url LIKE '%/object/public/patient-files/%';
