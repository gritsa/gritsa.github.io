-- HR-Finance could not see employee timesheets at all: the original SELECT policies on
-- `timesheets` (001_initial_schema.sql) only grant Administrator/Manager. HR-Finance was added
-- as a role later (006_add_hr_finance_role.sql) but this table was never retrofitted. This is
-- additive — Postgres ORs multiple permissive policies together, so the existing
-- Administrator/Manager policy is untouched. View-only: HR-Finance doesn't need to edit an
-- employee's timesheet entries, just see and download them.

CREATE POLICY "HR-Finance can read all timesheets"
  ON public.timesheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HR-Finance'
    )
  );
