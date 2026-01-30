-- Add attendance fields to payslips table for detailed payslip generation
ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS total_days_in_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_days DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leaves_taken DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lop_days DECIMAL(5, 2) DEFAULT 0;
