-- Adiciona 'solicitacao_exame' como document_type válido em patient_documents
-- (solicitação de exame radiográfico: panorâmica, periapical, tomografia, etc.)

ALTER TABLE public.patient_documents
  DROP CONSTRAINT patient_documents_document_type_check;

ALTER TABLE public.patient_documents
  ADD CONSTRAINT patient_documents_document_type_check
  CHECK (document_type = ANY (ARRAY['contrato'::text, 'termo_consentimento'::text, 'receituario'::text, 'atestado'::text, 'personalizado'::text, 'solicitacao_exame'::text]));
