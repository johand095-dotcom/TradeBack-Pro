-- LIVE TradeBack Pro: private EMS supporting-document bucket.
-- Creates a dedicated bucket; does not alter existing customer files.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('ems-supporting-documents','ems-supporting-documents',false,10485760,
ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ems_supporting_docs_insert" ON storage.objects;
CREATE POLICY "ems_supporting_docs_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='ems-supporting-documents'
 AND EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.user_id=auth.uid() AND p.is_active=true));

DROP POLICY IF EXISTS "ems_supporting_docs_read" ON storage.objects;
CREATE POLICY "ems_supporting_docs_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='ems-supporting-documents'
 AND EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.user_id=auth.uid() AND p.is_active=true));

-- Persist the uploaded path against the corresponding completed step.
ALTER TABLE public.ems_step_events ADD COLUMN IF NOT EXISTS attachment_path text;
