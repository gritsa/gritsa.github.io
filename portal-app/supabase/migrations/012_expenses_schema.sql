-- Expenses schema
-- Employees submit expense claims → Manager approves/rejects → HR-Finance views approved expenses
-- Approved expenses link to the payslip month

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,            -- e.g. Travel, Food, Accommodation, Equipment, Other
  expense_date DATE NOT NULL,        -- Date the expense was incurred
  receipt_url TEXT,                  -- Storage path for uploaded receipt
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  payslip_month INTEGER,             -- 0-indexed month to include in payslip (set on approval)
  payslip_year INTEGER,              -- Year to include in payslip (set on approval)
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_employee_id ON public.expenses(employee_id);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_payslip ON public.expenses(payslip_month, payslip_year);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Employees can view their own expenses
CREATE POLICY "Employees can view own expenses"
  ON public.expenses FOR SELECT
  USING (employee_id = auth.uid());

-- Employees can insert their own expenses
CREATE POLICY "Employees can submit expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Employees can update their own PENDING expenses (to edit before manager review)
CREATE POLICY "Employees can update own pending expenses"
  ON public.expenses FOR UPDATE
  USING (employee_id = auth.uid() AND status = 'Pending')
  WITH CHECK (employee_id = auth.uid());

-- Managers can view expenses of their direct reports
CREATE POLICY "Managers can view team expenses"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('Manager', 'Administrator')
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = expenses.employee_id
        AND u.manager_id = auth.uid()
    )
  );

-- Administrators can view all expenses
CREATE POLICY "Administrators can view all expenses"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );

-- Managers can approve/reject expenses of their direct reports
CREATE POLICY "Managers can review team expenses"
  ON public.expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Manager', 'Administrator')
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = expenses.employee_id
        AND u.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Manager', 'Administrator')
    )
  );

-- Administrators can update any expense
CREATE POLICY "Administrators can update any expense"
  ON public.expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );

-- HR-Finance can view all expenses
CREATE POLICY "HR-Finance can view all expenses"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

-- HR-Finance can update expense payslip month/year assignment
CREATE POLICY "HR-Finance can update expense payslip assignment"
  ON public.expenses FOR UPDATE
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

-- Employees can delete their own PENDING expenses
CREATE POLICY "Employees can delete own pending expenses"
  ON public.expenses FOR DELETE
  USING (employee_id = auth.uid() AND status = 'Pending');

-- HR-Finance storage policy for expense receipts is handled by the existing documents bucket policies

-- Updated_at trigger
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
