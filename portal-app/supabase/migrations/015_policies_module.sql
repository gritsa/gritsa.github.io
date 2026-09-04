-- Policies module: HR authors policies (rich text) grouped into policy sets, assigns a set to
-- employees with a due date, and employees sign each policy with a reusable signature. An
-- assignment's completion is server-computed (trigger), never client-set.
--
-- ON DELETE RESTRICT on policy_assignments.policy_set_id and policy_signatures.policy_id is
-- deliberate (unlike the CASCADE used for every user_id/employee_id FK in this schema): once a
-- set has been assigned, or a policy has been signed, it can't be hard-deleted out from under an
-- audit trail. The app additionally locks these in the UI (see docs/data-model.md) before a
-- delete would even be attempted; this is the DB-level backstop.

CREATE TABLE public.policy_sets (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  policy_set_id UUID REFERENCES public.policy_sets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '', -- HTML produced by the Tiptap editor
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_policies_policy_set_id ON public.policies(policy_set_id);

-- One reusable signature per employee, upserted whenever they redraw it.
CREATE TABLE public.employee_signatures (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TYPE policy_assignment_status AS ENUM ('Pending', 'Completed');

-- One row per "send" event: re-assigning a set to a new joiner, or re-sending it to someone who
-- already completed it (e.g. an annual re-acknowledgment), is just another insert here. History
-- accumulates; nothing is ever overwritten.
CREATE TABLE public.policy_assignments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  policy_set_id UUID REFERENCES public.policy_sets(id) ON DELETE RESTRICT NOT NULL,
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.users(id) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  due_date DATE,
  status policy_assignment_status DEFAULT 'Pending' NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_policy_assignments_employee_id ON public.policy_assignments(employee_id);
CREATE INDEX idx_policy_assignments_policy_set_id ON public.policy_assignments(policy_set_id);

-- One immutable row per signed policy per assignment. No UPDATE/DELETE policy is granted to
-- anyone at the app layer (see RLS below) — these are permanent audit records.
CREATE TABLE public.policy_signatures (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  assignment_id UUID REFERENCES public.policy_assignments(id) ON DELETE CASCADE NOT NULL,
  policy_id UUID REFERENCES public.policies(id) ON DELETE RESTRICT NOT NULL,
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  signature_file_path TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(assignment_id, policy_id)
);

CREATE INDEX idx_policy_signatures_assignment_id ON public.policy_signatures(assignment_id);

-- ── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.policy_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_signatures ENABLE ROW LEVEL SECURITY;

-- policy_sets: HR-Finance/Admin manage everything. Employees can only see a set if they have an
-- assignment against it — the catalog itself is not browsable by employees.
CREATE POLICY "HR-Finance and Admins can manage policy sets"
  ON public.policy_sets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')));

CREATE POLICY "Employees can view policy sets from their assignments"
  ON public.policy_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.policy_assignments pa
      WHERE pa.policy_set_id = policy_sets.id AND pa.employee_id = auth.uid()
    )
  );

-- policies: same shape as policy_sets above.
CREATE POLICY "HR-Finance and Admins can manage policies"
  ON public.policies FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')));

CREATE POLICY "Employees can view policies from their assignments"
  ON public.policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.policy_assignments pa
      WHERE pa.policy_set_id = policies.policy_set_id AND pa.employee_id = auth.uid()
    )
  );

-- employee_signatures: employees manage their own; HR-Finance/Admin can view all (audit).
CREATE POLICY "Employees manage their own signature"
  ON public.employee_signatures FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "HR-Finance and Admins can view all signatures"
  ON public.employee_signatures FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')));

-- policy_assignments: employees can only ever read their own — status is server-computed by the
-- completion trigger below, so no UPDATE policy is granted to employees at all. HR-Finance/Admin
-- manage everything (create assignments, adjust due dates, etc).
CREATE POLICY "Employees can view their own assignments"
  ON public.policy_assignments FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR-Finance and Admins can manage assignments"
  ON public.policy_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')));

-- policy_signatures: employees can insert/view their own. The INSERT check verifies three things
-- (not just that the assignment belongs to them) to close off forgery paths:
--   1. the assignment_id is really theirs
--   2. the policy_id actually belongs to that assignment's policy_set — otherwise an employee
--      with more than one assignment could pair a real assignment_id with a policy_id borrowed
--      from an unrelated set, satisfying the completion trigger without signing the real policies
--   3. signature_file_path matches their own saved employee_signatures row — otherwise that
--      column is unvalidated client input with nothing tying it to a file they actually own
-- No UPDATE/DELETE policy for anyone at the app layer — signed records are permanent.
CREATE POLICY "Employees can view their own policy signatures"
  ON public.policy_signatures FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees can sign their own assigned policies"
  ON public.policy_signatures FOR INSERT
  WITH CHECK (
    employee_id = auth.uid()
    AND signature_file_path = (SELECT file_path FROM public.employee_signatures WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.policy_assignments pa
      JOIN public.policies p ON p.policy_set_id = pa.policy_set_id
      WHERE pa.id = policy_signatures.assignment_id
        AND pa.employee_id = auth.uid()
        AND p.id = policy_signatures.policy_id
    )
  );

CREATE POLICY "HR-Finance and Admins can view all policy signatures"
  ON public.policy_signatures FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')));

-- ── Completion trigger ──────────────────────────────────────────────────────
-- Server-computed, not client-set: once every policy in an assignment's set has a signed row for
-- that assignment, flip status to Completed. SECURITY DEFINER + a pinned search_path (same idiom
-- as handle_new_user in 004_fix_trigger_permissions.sql) so it can write to policy_assignments
-- even though employees have no UPDATE policy on that table, and so it can't be search-path
-- hijacked by an object created earlier in the caller's session search_path.
CREATE OR REPLACE FUNCTION public.check_policy_assignment_completion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_policies INTEGER;
  signed_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM public.policies
  WHERE policy_set_id = (SELECT policy_set_id FROM public.policy_assignments WHERE id = NEW.assignment_id);

  SELECT COUNT(*) INTO signed_policies
  FROM public.policy_signatures
  WHERE assignment_id = NEW.assignment_id;

  IF signed_policies >= total_policies THEN
    UPDATE public.policy_assignments
    SET status = 'Completed', completed_at = NOW()
    WHERE id = NEW.assignment_id AND status <> 'Completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_policy_signature_insert
  AFTER INSERT ON public.policy_signatures
  FOR EACH ROW EXECUTE FUNCTION public.check_policy_assignment_completion();

-- ── updated_at triggers ─────────────────────────────────────────────────────

CREATE TRIGGER update_policy_sets_updated_at BEFORE UPDATE ON public.policy_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_signatures_updated_at BEFORE UPDATE ON public.employee_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_assignments_updated_at BEFORE UPDATE ON public.policy_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
