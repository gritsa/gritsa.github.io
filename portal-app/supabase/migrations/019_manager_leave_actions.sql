-- Lets a Manager act on behalf of their reportees:
--   1. Submit + immediately approve a leave request for a reportee who can't apply themselves
--   2. Award extra paid/sick leave days (e.g. compensatory time for overtime/weekend work)
--
-- (2) needs to increase leave_balances.paid_and_sick for the reportee's row, which the existing
-- RLS policy from 010_fix_leave_balances_rls.sql does not allow — that policy restricts
-- INSERT/UPDATE to auth.uid() = user_id, the same gap that silently broke used_* counter
-- updates on leave approval (see docs/known-issues.md). Extend it so a Manager can write to
-- their own reportees' rows, and an Administrator can write to any row.

CREATE POLICY "Managers and Admins can insert reportee leave balances"
  ON public.leave_balances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.role = 'Administrator'
          OR (u.role = 'Manager' AND EXISTS (
            SELECT 1 FROM public.users e
            WHERE e.id = leave_balances.user_id AND e.manager_id = auth.uid()
          ))
        )
    )
  );

CREATE POLICY "Managers and Admins can update reportee leave balances"
  ON public.leave_balances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.role = 'Administrator'
          OR (u.role = 'Manager' AND EXISTS (
            SELECT 1 FROM public.users e
            WHERE e.id = leave_balances.user_id AND e.manager_id = auth.uid()
          ))
        )
    )
  );

-- Audit trail for (2) — leave_balances.paid_and_sick only holds the current total, so this is
-- the record of why/when/by whom it was increased. Not read by the balance calculation itself
-- (src/utils/leaveBalance.ts still treats leave_balances.paid_and_sick as the total quota).
CREATE TABLE public.leave_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES public.users(id) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  days INTEGER NOT NULL CHECK (days > 0),
  reason TEXT,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_leave_grants_employee_id ON public.leave_grants(employee_id);

ALTER TABLE public.leave_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own leave grants"
  ON public.leave_grants FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Managers and Admins can view reportee leave grants"
  ON public.leave_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.role = 'Administrator'
          OR (u.role = 'Manager' AND EXISTS (
            SELECT 1 FROM public.users e
            WHERE e.id = leave_grants.employee_id AND e.manager_id = auth.uid()
          ))
        )
    )
  );

CREATE POLICY "Managers and Admins can insert reportee leave grants"
  ON public.leave_grants FOR INSERT
  WITH CHECK (
    granted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          u.role = 'Administrator'
          OR (u.role = 'Manager' AND EXISTS (
            SELECT 1 FROM public.users e
            WHERE e.id = leave_grants.employee_id AND e.manager_id = auth.uid()
          ))
        )
    )
  );
