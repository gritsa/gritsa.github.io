# Fix Employee Documents RLS Policy

## Issue
HR-Finance users are unable to upload documents for employees due to RLS policy error:
```
Error: new row violates row-level security policy
```

## Root Cause
The RLS policy for `employee_documents` was using `FOR ALL` with only a `USING` clause. INSERT operations require a `WITH CHECK` clause, not a `USING` clause.

## Solution
Apply the migration `011_fix_employee_documents_rls.sql` which:
1. Drops the problematic `FOR ALL` policy
2. Creates separate policies for INSERT, UPDATE, and DELETE operations
3. Each policy has the correct clause type (WITH CHECK for INSERT, USING for DELETE, both for UPDATE)

## Steps to Apply

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/011_fix_employee_documents_rls.sql`
4. Click **Run** to execute the migration
5. Verify success message appears

### Option 2: Via Supabase CLI

```bash
# From the project root directory
cd /Users/abidev/dev/gritsa.github.io/portal-app
supabase db push
```

## Verification

After applying the migration, test the following:

1. **Login as HR-Finance user**
2. **Navigate to HR & Finance page**
3. **Select an employee**
4. **Go to "HR Documents" tab**
5. **Click "Upload Document"**
6. **Fill in document details and select a file**
7. **Click "Upload"**
8. **Verify** document uploads successfully without RLS error

## SQL to Check Current Policies

If you want to verify the policies are correctly applied:

```sql
-- Check all policies on employee_documents table
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employee_documents'
  AND schemaname = 'public';
```

Expected output:
- `Employees can view their own documents` (SELECT)
- `HR-Finance and Admins can view all employee documents` (SELECT)
- `HR-Finance and Admins can insert employee documents` (INSERT) with WITH CHECK clause
- `HR-Finance and Admins can update employee documents` (UPDATE) with both USING and WITH CHECK
- `HR-Finance and Admins can delete employee documents` (DELETE) with USING clause

## Technical Details

### Why the Original Policy Failed

```sql
-- INCORRECT - FOR ALL with only USING clause
CREATE POLICY "..." FOR ALL USING (...);
```

When using `FOR ALL`, you must provide:
- `USING` clause for SELECT, UPDATE, DELETE operations
- `WITH CHECK` clause for INSERT, UPDATE operations

### Correct Approach

```sql
-- CORRECT - Separate policies per operation
CREATE POLICY "..." FOR INSERT WITH CHECK (...);
CREATE POLICY "..." FOR UPDATE USING (...) WITH CHECK (...);
CREATE POLICY "..." FOR DELETE USING (...);
```

This gives explicit control over each operation type and avoids confusion.
