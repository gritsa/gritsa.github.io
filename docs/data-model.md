# Data Model

Schema source of truth: `portal-app/supabase/migrations/*.sql`, applied in numeric order
(001 → 013). There's no ORM — pages query Supabase directly via `supabase.from('table')...`.
TypeScript shapes in `portal-app/src/types/index.ts` mirror these tables (kept in sync by hand,
not generated — see [known-issues.md](known-issues.md)).

Every table has `ENABLE ROW LEVEL SECURITY`; authorization lives in Postgres RLS policies, not
in the frontend. The frontend only decides what to *render*; the database decides what a given
`auth.uid()` is allowed to read/write.

## Core tables (`001_initial_schema.sql`)

- **`users`** — extends `auth.users` 1:1 (same UUID as PK). Holds `role`
  (`Employee`/`Manager`/`Administrator`/`HR-Finance`), `display_name`, `profile_completed`,
  `manager_id` (self-referencing FK), `project_ids` (text array).
- **`employee_profiles`** — 1:1 with `users`. Personal details, emergency contact,
  PAN/Aadhaar document URLs. Extended in `007_hr_finance_schema.sql` with `designation`,
  `employment_type`, and bank details (`bank_name`, `ifsc_code`, `account_number`, `upi_id`).
- **`projects`** — name/description, `created_by`, `is_active`. Assigned to users via
  `users.project_ids`.
- **`timesheets`** — one row per `(employee_id, month, year)`. Day-by-day entries stored as a
  `JSONB` map (`days: { [day]: { type, description } }`) rather than normalized rows.
- **`leave_balances`** — one row per `(user_id, year)`. Tracks the annual quota
  (`paid_and_sick`, starts at 18; `national_holidays`, starts at 10). The `used_*` counter
  columns exist but **are not the source of truth for "used" leave** — see the note below.
- **`leave_requests`** — leave applications with `status` (`Pending`/`Approved`/`Rejected`),
  reviewed by a manager/admin.
- **`national_holidays`** — admin-configurable list, scoped by `year`.

## HR-Finance tables (`007_hr_finance_schema.sql`, extended in `008`/`009`)

- **`salary_structures`** — versioned by `effective_from`; one active structure per employee.
  Earnings breakdown (`basic_salary`, `hra`, `special_allowance`, `conveyance_allowance`,
  `medical_allowance`, `bonus_incentives`, `dearness_allowance`, `lta`, plus freeform
  `other_allowances`/`deductions` JSONB).
- **`payslips`** — one row per `(employee_id, month, year)`, generated from a salary structure
  plus attendance data (`working_days`, `paid_days`, `lop_days`, `leaves_taken`) and statutory
  deductions (`epf`, `tds`, `professional_tax`, `esi`, `lwf`, `loan_recovery`).
  `status`: `Draft` → `Submitted` → `Paid`.
- **`employee_documents`** — documents HR uploads *for* an employee (tagged with
  `financial_year`, `document_type`).
- **`personal_documents`** — documents an employee uploads for themselves (via `MySpace`).

## Expenses (`012_expenses_schema.sql`)

- **`expenses`** — employee submits (`Pending`) → manager approves/rejects → approved expenses
  get tagged with `payslip_month`/`payslip_year` so HR-Finance can fold them into that month's
  payslip. `receipt_url` points into the `documents` storage bucket.

## Offboarding (`014_employee_offboarding.sql`)

- **`employee_offboarding`** — one row per offboarding attempt for an employee. A partial unique
  index (`WHERE status = 'Active'`) enforces at most one active process per employee at a time;
  starting a new one after a prior `Retained`/`Completed`/`Cancelled` record is fine.
  - `notice_period_days` / `last_working_date`: `last_working_date` is always
    `initiated_at + notice_period_days`, recomputed from the *original* `initiated_at` whenever
    the notice period is edited (not from "today"), so shortening the notice period for a
    negotiated early release pulls the last working date in relative to when the process
    actually started.
  - `personal_email`: collected during the process (required before Stage 4), since final exit
    documents go there rather than the employee's work email.
  - Four fixed stages, tracked as flat `stageN_completed_at` / `stageN_notes` column pairs
    (not a separate stages table, since the 4 stages are fixed, not user-configurable):
    1. Exit interview & discussion — can end here via `retained = true` / `status = 'Retained'`
    2. Handover of responsibilities
    3. First level exit documents
    4. Final exit documents (NOC, last salary) — completing this sets `status = 'Completed'`
  - `status`: `Active` → `Retained` | `Completed` | `Cancelled`. Only `Active` records are
    editable/actionable in the UI ([`OffboardingTab.tsx`](../portal-app/src/pages/hr-finance/OffboardingTab.tsx));
    everything else is shown as read-only history.
  - RLS follows the same HR-Finance/Administrator pattern as `salary_structures` — unlike
    `leave_balances` (see below), the "manage" policy has no `auth.uid() = employee_id`
    restriction, so an admin/HR-Finance user can actually write to another employee's row.

## Storage

Single bucket: **`documents`** (created in `002_storage_policies.sql`). Path convention is
`{user_id}/...` so RLS storage policies can check `auth.uid()` against the path prefix. Holds
PAN/Aadhaar uploads, HR/personal documents, and expense receipts. Reads for anything other than
the file's own owner go through the `document-proxy` Edge Function rather than a signed URL
directly from the client — see [edge-functions.md](edge-functions.md).

## RLS pattern used throughout

Almost every "elevated access" policy follows this shape — a subquery against `public.users`
checking the caller's role:

```sql
CREATE POLICY "HR-Finance and Admins can view all X"
  ON public.X FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );
```

If you add a new table that needs role-based access, copy this pattern rather than inventing a
new one — it's what every existing policy does, and `005_fix_rls_recursion.sql` exists because
an earlier, different approach caused infinite recursion when a policy on `users` queried
`users` itself. If a policy needs to check the caller's own role, query `public.users` from a
*different* table's policy, never write a self-referential policy directly on `users` without
checking that migration first.

## Migration history worth knowing about

Several migrations are bug fixes for RLS issues, not schema changes — useful context if you hit
similar symptoms:

- `003_fix_user_creation.sql`, `004_fix_trigger_permissions.sql` — fixed the `handle_new_user`
  trigger not being able to insert into `public.users` due to RLS.
- `005_fix_rls_recursion.sql` — fixed infinite recursion from a `users` policy querying `users`.
- `010_fix_leave_balances_rls.sql`, `011_fix_employee_documents_rls.sql`,
  `013_fix_storage_rls.sql` — same class of "policy was too strict / recursive" fixes for
  those tables and the storage bucket.

**`010_fix_leave_balances_rls.sql` left a gap that's still live**: it restricts `UPDATE` on
`leave_balances` to `auth.uid() = user_id` (the migration's own comment says admin/manager
writes to *another* employee's row need "service role or a backend function," which was never
built). In practice this means when a manager approves an employee's leave
(`ManagerDashboard.tsx`'s `handleApproveReject`), its attempt to increment that employee's
`used_paid_and_sick`/`used_national_holidays` is silently dropped by RLS — 0 rows match, no
error is thrown. So those two counter columns are permanently stale (effectively always 0) for
approvals done by anyone other than the employee themself. Both `Dashboard.tsx` and
`LeaveManagement.tsx` work around this by never trusting the stored counters: remaining balance
is always computed from approved `leave_requests` history for the current year via
`src/utils/leaveBalance.ts`, using `leave_balances` only for the annual quota
(`paid_and_sick`/`national_holidays`). If you're tempted to read `used_paid_and_sick` directly
for a new feature, don't — go through `getLeaveBalanceSummary()` instead, or you'll reintroduce
the "shows 18 remaining regardless of approved leave" bug this pattern exists to avoid.

If a query hangs or silently returns nothing and you suspect RLS, check the corresponding table
in the Supabase dashboard's policy editor before adding a new migration — there's a real chance
the fix is "loosen this WHERE clause," matching the pattern of the fixes above.
