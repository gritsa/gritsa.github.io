# Apply Leave Balances RLS Fix

## Problem
The `leave_balances` table has RLS policies that cause recursion and prevent users from creating their own leave balance records. This causes the error:
```
"new row violates row-level security policy for table \"leave_balances\""
```

## Solution
Run the migration file `010_fix_leave_balances_rls.sql` in your Supabase SQL Editor.

## Steps

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/010_fix_leave_balances_rls.sql`
4. Click "Run" or press Cmd/Ctrl + Enter
5. Verify it completes successfully

## What it Does

- Drops the problematic policy that checks the users table (causes recursion)
- Creates new policies:
  - Users can INSERT their own leave balances
  - Users can UPDATE their own leave balances
  - All authenticated users can VIEW all leave balances
  - Admins/Managers should use service role or backend functions for managing other users' balances

## Testing

After applying, test by:
1. Logging in to the portal
2. Switching browser tabs
3. Coming back to the portal tab
4. You should NOT be logged out
5. Check console for any RLS policy errors - should be gone
