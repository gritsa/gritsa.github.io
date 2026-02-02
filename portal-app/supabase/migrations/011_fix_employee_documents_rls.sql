-- Fix RLS policies for employee_documents table
-- Issue: The "FOR ALL" policy doesn't have proper WITH CHECK clause for INSERT operations
-- HR-Finance users are getting RLS violations when trying to insert documents

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "HR-Finance and Admins can manage employee documents" ON public.employee_documents;

-- Create separate policies for different operations

-- Allow HR-Finance and Admins to INSERT employee documents
CREATE POLICY "HR-Finance and Admins can insert employee documents"
  ON public.employee_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

-- Allow HR-Finance and Admins to UPDATE employee documents
CREATE POLICY "HR-Finance and Admins can update employee documents"
  ON public.employee_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

-- Allow HR-Finance and Admins to DELETE employee documents
CREATE POLICY "HR-Finance and Admins can delete employee documents"
  ON public.employee_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );
