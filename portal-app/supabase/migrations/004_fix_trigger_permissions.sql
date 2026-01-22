-- Fix the trigger to bypass RLS completely
-- The trigger function needs special permissions to insert into users table

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with proper permissions
-- SECURITY DEFINER makes it run with the permissions of the function owner (postgres superuser)
-- This bypasses RLS entirely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, profile_completed, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'Employee'::user_role,
    FALSE,
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, that's fine
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user record: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also update the RLS policy to be more permissive for the service role
DROP POLICY IF EXISTS "Allow user creation via trigger and admins" ON public.users;

-- Create a simpler policy that allows service role and admins to insert
CREATE POLICY "Allow user creation"
  ON public.users FOR INSERT
  WITH CHECK (
    -- Allow service role (used by triggers)
    current_setting('role') = 'service_role'
    OR
    -- Allow if there are no users yet
    NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'Administrator')
    OR
    -- Allow if current user is an admin
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );
