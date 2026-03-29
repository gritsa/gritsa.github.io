-- Fix storage RLS policies
-- Problem 1: HR-Finance/Admin uploading documents for employees fail because the
--   file path is hr-documents/{employeeId}/... and the existing policy only allows
--   uploads where (storage.foldername(name))[1] = auth.uid(), which won't match.
-- Problem 2: Expense receipt uploads fail because the path is
--   expense-receipts/{userId}/... and [1] = 'expense-receipts', not the user's UUID.

-- ── HR-Finance / Admin: full access to the documents bucket ──────────────────

DROP POLICY IF EXISTS "HR-Finance and Admins can upload any document" ON storage.objects;
DROP POLICY IF EXISTS "HR-Finance and Admins can read all documents" ON storage.objects;
DROP POLICY IF EXISTS "HR-Finance and Admins can delete any document" ON storage.objects;
DROP POLICY IF EXISTS "HR-Finance and Admins can update any document" ON storage.objects;

CREATE POLICY "HR-Finance and Admins can upload any document"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

CREATE POLICY "HR-Finance and Admins can read all documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

CREATE POLICY "HR-Finance and Admins can delete any document"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

CREATE POLICY "HR-Finance and Admins can update any document"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

-- ── Employees: upload expense receipts to expense-receipts/{their-uid}/... ────
-- The path is expense-receipts/{userId}/{filename}
-- storage.foldername(name) returns ['expense-receipts', '{userId}'] → index [2] is the user id.

DROP POLICY IF EXISTS "Users can upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own expense receipts" ON storage.objects;

CREATE POLICY "Users can upload expense receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'expense-receipts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can read own expense receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'expense-receipts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete own expense receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'expense-receipts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- ── Manager: read access to documents bucket (for expense receipt viewing) ────
-- The existing "Admins and managers can read all documents" policy only covers
-- Manager and Administrator. Drop and re-create it to also cover HR-Finance
-- (handled above) and to avoid duplicate with the new policy.
DROP POLICY IF EXISTS "Admins and managers can read all documents" ON storage.objects;

-- (HR-Finance and Admin read-all is already covered by the policies above.)
-- Managers still need read access for team documents / expense receipts.
CREATE POLICY "Managers can read all documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Manager'
    )
  );
