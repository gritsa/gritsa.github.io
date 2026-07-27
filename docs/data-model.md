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

## Policies (`015_policies_module.sql`)

HR authors policies (rich text, stored as Tiptap-produced HTML) grouped into **policy sets**, and
assigns a set to employees with a due date for digital signature.

- **`policy_sets`** — name/description, `is_active`. Not directly browsable by employees (see RLS
  below) — only reachable through their own assignments.
- **`policies`** — belongs to a set, `title` + `content` (HTML) + `order_index`.
- **`employee_signatures`** — one reusable signature image per employee (`user_id` UNIQUE),
  pointing at `{employee_id}/signature/signature.png` in the `documents` bucket. Redrawing
  overwrites the same file/row rather than creating a new one.
- **`policy_assignments`** — one row per "send" event (`policy_set_id`, `employee_id`,
  `assigned_by`, `due_date`). Re-sending a set to a new joiner, or re-sending it to someone who
  already completed it, is just another insert — history accumulates, nothing is overwritten.
  `status` (`Pending`/`Completed`) is **server-computed**, never client-set: an `AFTER INSERT ON
  policy_signatures` trigger (`SECURITY DEFINER`, same idiom as `handle_new_user`) flips it to
  `Completed` once every policy in the set has a signed row for that assignment. Employees have no
  UPDATE policy on this table at all — the trigger is the only way status changes.
- **`policy_signatures`** — one immutable row per signed policy per assignment, holding
  `signature_file_path` (a copy of the employee's signature made *at the moment of signing*, via
  `storage.copy()`, at `{employee_id}/policy-signatures/{assignment_id}_{policy_id}.png` — so a
  later signature redraw doesn't retroactively change what a past signature "looked like"). The
  INSERT policy checks three things, not just assignment ownership: that `assignment_id` belongs
  to the caller, that `policy_id` actually belongs to that assignment's `policy_set_id` (otherwise
  a caller with more than one assignment could pair a real assignment with a borrowed `policy_id`
  and fool the completion count without signing the real policies), and that
  `signature_file_path` matches the caller's own `employee_signatures.file_path` row (otherwise
  that column is unvalidated client input). No UPDATE/DELETE policy exists for anyone at the app
  layer — signed rows are permanent.

**`policy_set_id`/`policy_id` foreign keys use `ON DELETE RESTRICT`**, not the `CASCADE` used
everywhere else in this schema for `employee_id`/`user_id` FKs — deliberately, since these are
*content* parents whose deletion would destroy compliance history. The app enforces the same rule
earlier: `PoliciesManagement.tsx` disables adding/removing policies from a set once it has ≥1
assignment (only text edits and reordering remain), and disables editing/deleting a policy once it
has ≥1 signature. **Known limitation:** this locking is UI-only — an HR-Finance/Administrator
account's `FOR ALL` RLS policy has no extra `CHECK` beyond the role match, so it's still possible
to bypass the lock and delete a signed policy directly (e.g. via the browser console), the same way
nothing stops HR from deleting `employee_documents` or `salary_structures` rows outside the UI
either. This is an accepted, documented gap, not a bug — RLS's job in this schema is stopping
*employees*, not policing privileged roles.

The completion trigger also means adding a policy to a set *after* some assignments were already
`Completed` won't reopen them — the denominator changed but nothing re-evaluates old assignments.
This is exactly what the locked-once-assigned rule above prevents from happening in the first
place; if you ever see a `Completed` assignment with fewer signatures than the set's current
policy count, that's how it happened.

## Storage

Single bucket: **`documents`** (created in `002_storage_policies.sql`). Path convention is
`{user_id}/...` so RLS storage policies can check `auth.uid()` against the path prefix — this is
also why the Policies module's signature paths above are read/writable by their owner and by
HR-Finance/Administrator with zero new storage policies (see `013_fix_storage_rls.sql`'s
role-wide policies). Holds PAN/Aadhaar uploads, HR/personal documents, expense receipts, and
signature images. Reads for anything other than the file's own owner go through the
`document-proxy` Edge Function rather than a signed URL directly from the client — see
[edge-functions.md](edge-functions.md).

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
