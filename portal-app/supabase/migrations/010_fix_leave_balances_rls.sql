-- Fix RLS policies for leave_balances table
-- Issue: The existing policy has recursion problem when checking users table
-- Also missing policy for users to insert their own leave balances

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins and managers can manage leave balances" ON public.leave_balances;

-- Create new policies without recursion

-- Allow users to insert their own leave balances
CREATE POLICY "Users can insert own leave balances"
  ON public.leave_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own leave balances
CREATE POLICY "Users can update own leave balances"
  ON public.leave_balances FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow admins and HR to manage all leave balances (using service role for admin operations)
-- This policy is for SELECT only to avoid recursion issues
CREATE POLICY "All authenticated users can view leave balances"
  ON public.leave_balances FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: For admin/manager INSERT/UPDATE operations on other users' leave balances,
-- use service role or handle through backend functions
