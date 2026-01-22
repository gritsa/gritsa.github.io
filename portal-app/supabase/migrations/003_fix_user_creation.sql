-- Fix RLS policy to allow trigger function to create users
-- The issue: The "Admins can insert users" policy blocks the trigger from creating users
-- because there's no admin user yet (chicken-and-egg problem)

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;

-- Create a new policy that allows:
-- 1. The trigger function (via SECURITY DEFINER) to insert users
-- 2. Admins to manually insert users
CREATE POLICY "Allow user creation via trigger and admins"
  ON public.users FOR INSERT
  WITH CHECK (
    -- Allow if there are no users yet (first user creation)
    (SELECT COUNT(*) FROM public.users) = 0
    OR
    -- Allow if current user is an admin
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );
