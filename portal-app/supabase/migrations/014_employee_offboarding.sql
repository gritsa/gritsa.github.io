-- Employee offboarding / exit process
-- Admin or HR-Finance starts the process for an employee, sets a notice period
-- (default: 60 days from today, tweakable at any time e.g. for negotiated early release).
-- The process moves through four fixed stages:
--   1. Exit interview & discussion (employee may be retained, ending the process)
--   2. Handover of responsibilities
--   3. First level exit documents
--   4. Delivery of final exit documents (NOC, last salary) to the employee's personal email

CREATE TABLE public.employee_offboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  initiated_by UUID REFERENCES public.users(id) NOT NULL,
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  notice_period_days INTEGER NOT NULL DEFAULT 60 CHECK (notice_period_days > 0),
  last_working_date DATE NOT NULL,

  personal_email TEXT,

  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Retained', 'Completed', 'Cancelled')),

  -- Stage 1: Exit interview & discussion / retention
  stage1_completed_at TIMESTAMP WITH TIME ZONE,
  stage1_notes TEXT,
  retained BOOLEAN DEFAULT FALSE,

  -- Stage 2: Handover of responsibilities
  stage2_completed_at TIMESTAMP WITH TIME ZONE,
  stage2_notes TEXT,

  -- Stage 3: First level exit documents
  stage3_completed_at TIMESTAMP WITH TIME ZONE,
  stage3_notes TEXT,

  -- Stage 4: Final exit documents (NOC, last salary) sent to personal email
  stage4_completed_at TIMESTAMP WITH TIME ZONE,
  stage4_notes TEXT,

  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES public.users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one active offboarding process per employee at a time
CREATE UNIQUE INDEX idx_one_active_offboarding_per_employee
  ON public.employee_offboarding(employee_id)
  WHERE status = 'Active';

CREATE INDEX idx_employee_offboarding_employee_id ON public.employee_offboarding(employee_id);
CREATE INDEX idx_employee_offboarding_status ON public.employee_offboarding(status);

ALTER TABLE public.employee_offboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own offboarding record"
  ON public.employee_offboarding FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR-Finance and Admins can view all offboarding records"
  ON public.employee_offboarding FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

CREATE POLICY "HR-Finance and Admins can manage offboarding records"
  ON public.employee_offboarding FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

CREATE TRIGGER update_employee_offboarding_updated_at
  BEFORE UPDATE ON public.employee_offboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
