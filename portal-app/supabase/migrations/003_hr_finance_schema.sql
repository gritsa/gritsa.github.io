-- Add HR-Finance role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'HR-Finance';

-- Add new columns to employee_profiles table
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS employment_type TEXT CHECK (employment_type IN ('Intern', 'Permanent', 'Contract'));
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Create salary_structures table
CREATE TABLE IF NOT EXISTS public.salary_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  effective_from DATE NOT NULL,
  basic_salary DECIMAL(12, 2) NOT NULL,
  hra DECIMAL(12, 2) DEFAULT 0,
  special_allowance DECIMAL(12, 2) DEFAULT 0,
  other_allowances JSONB DEFAULT '{}',
  deductions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, effective_from)
);

-- Create payslips table
CREATE TABLE IF NOT EXISTS public.payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  salary_structure_id UUID REFERENCES public.salary_structures(id) ON DELETE SET NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  gross_salary DECIMAL(12, 2) NOT NULL,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  net_salary DECIMAL(12, 2) NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('Draft', 'Submitted', 'Paid')) DEFAULT 'Draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- Create employee_documents table (for HR uploaded documents)
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  financial_year TEXT,
  uploaded_by UUID REFERENCES public.users(id) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personal_documents table (for employee uploaded documents)
CREATE TABLE IF NOT EXISTS public.personal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_name TEXT NOT NULL,
  document_category TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salary_structures_employee_id ON public.salary_structures(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_effective_from ON public.salary_structures(effective_from);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON public.payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON public.payslips(month, year);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON public.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_financial_year ON public.employee_documents(financial_year);
CREATE INDEX IF NOT EXISTS idx_personal_documents_user_id ON public.personal_documents(user_id);

-- Enable Row Level Security
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_structures
CREATE POLICY "Employees can view their own salary structures"
  ON public.salary_structures FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR-Finance and Admins can view all salary structures"
  ON public.salary_structures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

CREATE POLICY "HR-Finance and Admins can manage salary structures"
  ON public.salary_structures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

-- RLS Policies for payslips
CREATE POLICY "Employees can view their own payslips"
  ON public.payslips FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR-Finance and Admins can view all payslips"
  ON public.payslips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

CREATE POLICY "HR-Finance and Admins can manage payslips"
  ON public.payslips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

-- RLS Policies for employee_documents
CREATE POLICY "Employees can view their own documents"
  ON public.employee_documents FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR-Finance and Admins can view all employee documents"
  ON public.employee_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

CREATE POLICY "HR-Finance and Admins can manage employee documents"
  ON public.employee_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

-- RLS Policies for personal_documents
CREATE POLICY "Users can manage their own personal documents"
  ON public.personal_documents FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "HR-Finance and Admins can view all personal documents"
  ON public.personal_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('HR-Finance', 'Administrator')
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_salary_structures_updated_at BEFORE UPDATE ON public.salary_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personal_documents_updated_at BEFORE UPDATE ON public.personal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update employee_profiles RLS to allow HR-Finance to manage profiles
CREATE POLICY "HR-Finance can manage all employee profiles"
  ON public.employee_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'HR-Finance'
    )
  );
