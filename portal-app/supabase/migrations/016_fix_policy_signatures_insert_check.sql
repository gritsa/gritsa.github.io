-- Fix policy_signatures INSERT policy from 015_policies_module.sql
--
-- Bug: the WITH CHECK compared the inserted signature_file_path (the immutable per-signing
-- snapshot, e.g. "{uid}/policy-signatures/{assignment_id}_{policy_id}.png", copied at sign time
-- via storage.copy()) against the employee's own employee_signatures.file_path (the reusable
-- signature at "{uid}/signature/signature.png"). Those two paths are never equal by design — the
-- whole point of the snapshot copy is that it lives at a different, immutable path — so every
-- real sign attempt was rejected with a 403 (caught live: signing a policy failed end-to-end).
--
-- Fix: instead of comparing to the source path, require signature_file_path to be exactly the
-- deterministic destination path our own app code constructs for this specific
-- (employee, assignment, policy) triple. This still closes the original hole (an employee can't
-- point signature_file_path at an arbitrary/unowned string) without requiring it to equal a path
-- it can never equal.

DROP POLICY IF EXISTS "Employees can sign their own assigned policies" ON public.policy_signatures;

CREATE POLICY "Employees can sign their own assigned policies"
  ON public.policy_signatures FOR INSERT
  WITH CHECK (
    employee_id = auth.uid()
    AND signature_file_path = auth.uid()::text || '/policy-signatures/' || assignment_id::text || '_' || policy_id::text || '.png'
    AND EXISTS (
      SELECT 1 FROM public.policy_assignments pa
      JOIN public.policies p ON p.policy_set_id = pa.policy_set_id
      WHERE pa.id = policy_signatures.assignment_id
        AND pa.employee_id = auth.uid()
        AND p.id = policy_signatures.policy_id
    )
  );
