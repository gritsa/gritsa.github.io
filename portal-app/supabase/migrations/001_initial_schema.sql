-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('Employee', 'Manager', 'Administrator');
CREATE TYPE leave_type AS ENUM ('Paid', 'Sick', 'National Holiday');
CREATE TYPE leave_status AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE timesheet_day_type AS ENUM ('Full Day', 'Half Day', 'Leave');
CREATE TYPE timesheet_status AS ENUM ('Draft', 'Submitted');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'Employee' NOT NULL,
  display_name TEXT,
  profile_completed BOOLEAN DEFAULT FALSE,
  manager_id UUID REFERENCES public.users(id),
  project_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee Profiles table
CREATE TABLE public.employee_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT NOT NULL,
  alternate_contact TEXT,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_relationship TEXT NOT NULL,
  pan_card_url TEXT,
  aadhaar_card_url TEXT,
  employee_id TEXT,
  joining_date DATE,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timesheets table
CREATE TABLE public.timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 0 AND month <= 11),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  days JSONB DEFAULT '{}',
  status timesheet_status DEFAULT 'Draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- Leave Balances table
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  paid_and_sick INTEGER DEFAULT 18,
  national_holidays INTEGER DEFAULT 10,
  used_paid_and_sick INTEGER DEFAULT 0,
  used_national_holidays INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- Leave Requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  employee_name TEXT NOT NULL,
  manager_id UUID REFERENCES public.users(id),
  leave_type leave_type NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status leave_status DEFAULT 'Pending',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.users(id),
  review_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- National Holidays table
CREATE TABLE public.national_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_manager_id ON public.users(manager_id);
CREATE INDEX idx_employee_profiles_user_id ON public.employee_profiles(user_id);
CREATE INDEX idx_timesheets_employee_id ON public.timesheets(employee_id);
CREATE INDEX idx_timesheets_month_year ON public.timesheets(month, year);
CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX idx_leave_requests_manager_id ON public.leave_requests(manager_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_balances_user_id_year ON public.leave_balances(user_id, year);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read their own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins and managers can read all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Administrator', 'Manager')
    )
  );

CREATE POLICY "Users can update their own profile (except role)"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );

-- RLS Policies for employee_profiles table
CREATE POLICY "Users can read their own profile"
  ON public.employee_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can read all profiles"
  ON public.employee_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Administrator', 'Manager')
    )
  );

CREATE POLICY "Users can manage their own profile"
  ON public.employee_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON public.employee_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );

-- RLS Policies for projects table
CREATE POLICY "Anyone authenticated can read projects"
  ON public.projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage projects"
  ON public.projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Administrator', 'Manager')
    )
  );

-- RLS Policies for timesheets table
CREATE POLICY "Users can read their own timesheets"
  ON public.timesheets FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Admins and managers can read all timesheets"
  ON public.timesheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Administrator', 'Manager')
    )
  );

CREATE POLICY "Users can manage their own timesheets"
  ON public.timesheets FOR ALL
  USING (auth.uid() = employee_id);

-- RLS Policies for leave_balances table
CREATE POLICY "Anyone authenticated can read leave balances"
  ON public.leave_balances FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage leave balances"
  ON public.leave_balances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Administrator', 'Manager')
    )
  );

-- RLS Policies for leave_requests table
CREATE POLICY "Users can read their own leave requests"
  ON public.leave_requests FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Managers can read their team's leave requests"
  ON public.leave_requests FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Admins can read all leave requests"
  ON public.leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );

CREATE POLICY "Users can create their own leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can update their pending leave requests"
  ON public.leave_requests FOR UPDATE
  USING (auth.uid() = employee_id AND status = 'Pending');

CREATE POLICY "Managers and admins can update leave requests"
  ON public.leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Administrator', 'Manager')
    )
  );

-- RLS Policies for national_holidays table
CREATE POLICY "Anyone authenticated can read holidays"
  ON public.national_holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage holidays"
  ON public.national_holidays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Administrator'
    )
  );

-- Function to automatically create user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, profile_completed, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email LIKE '%@gritsa.com' THEN 'Employee'::user_role
      ELSE 'Employee'::user_role
    END,
    FALSE,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create default admin user
CREATE OR REPLACE FUNCTION public.create_default_admin()
RETURNS void AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Check if admin already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@gritsa.com') THEN
    -- Create admin user in auth.users (you'll need to set password manually in Supabase dashboard)
    -- This function just creates the user record, password must be set via Supabase Auth
    admin_id := gen_random_uuid();

    -- Insert into users table
    INSERT INTO public.users (id, email, role, display_name, profile_completed, created_at)
    VALUES (admin_id, 'admin@gritsa.com', 'Administrator', 'Default Admin', TRUE, NOW())
    ON CONFLICT (email) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_profiles_updated_at BEFORE UPDATE ON public.employee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_national_holidays_updated_at BEFORE UPDATE ON public.national_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
