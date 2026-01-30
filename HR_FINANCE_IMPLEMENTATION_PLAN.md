# HR & Finance Feature Implementation Plan

## Overview
This document outlines the implementation of comprehensive HR & Finance features including payroll management, employee document management, and enhanced employee profiles.

## Components Implemented

### 1. Database Schema (`003_hr_finance_schema.sql`)
✅ **Created tables:**
- `salary_structures` - Employee salary configurations with effective dates
- `payslips` - Monthly payslips (Draft/Submitted/Paid status)
- `employee_documents` - HR-uploaded documents (Form-16B, etc.)
- `personal_documents` - Employee-uploaded documents

✅ **Extended `employee_profiles` table with:**
- `designation` - Job title
- `employment_type` - Intern/Permanent/Contract
- `bank_name`, `ifsc_code`, `account_number`, `account_name`, `upi_id` - Banking details

✅ **Added HR-Finance role** to `user_role` enum

✅ **Row Level Security (RLS)** configured for all new tables

### 2. Document Proxy Edge Function
**File:** `supabase/functions/document-proxy/index.ts`

**Purpose:** Secure document access with permission validation

**Permissions:**
- Users can access their own documents
- HR-Finance role can access any employee documents
- Administrators can access all documents

**Features:**
- CORS support
- Content-type detection (PDF, images, Word docs)
- Inline display with proper headers
- 401/403/404 error handling

**Usage:**
```typescript
const url = `${SUPABASE_URL}/functions/v1/document-proxy?bucket=documents&path=${userId}/${filename}`
// Pass Authorization header with user's JWT
```

### 3. Type Definitions
**File:** `portal-app/src/types/index.ts`

Added types for:
- `HR-Finance` role
- `EmploymentType` enum
- `SalaryStructure` interface
- `Payslip` interface
- `EmployeeDocument` interface
- `PersonalDocument` interface

## Implementation Files to Create

### 1. HR-Finance Dashboard (`/hr-finance`)
**File:** `portal-app/src/pages/hr-finance/HRFinanceDashboard.tsx`

**Structure:**
```
HRFinanceDashboard
├── Tabs: Payroll | HR
├── Left Sidebar: Employee List
└── Main Area: Selected Employee Details
```

#### Payroll Tab Features:
1. **Salary Structure Management**
   - Form: Basic Salary, HRA, Special Allowance, Other Allowances, Deductions
   - Effective From date picker
   - Save button
   - History of all salary structures

2. **Payslip Management**
   - Month/Year selector
   - Auto-calculate: Gross = Basic + HRA + Special + Others
   - Net = Gross - Deductions
   - Status: Draft → Submit → Paid workflow
   - View/Edit/Print payslip

3. **Document Upload**
   - Upload PDF/Image/DOCX for employees
   - Track financial year
   - Document type selector (Form-16B, Salary Certificate, etc.)
   - Upload date/time tracking

#### HR Tab Features:
1. **Profile Management**
   - View/Edit all employee profile fields
   - Set designation
   - Set employment type (dropdown)
   - Set reporting manager (dropdown of managers)
   - Banking details (read-only here, editable by employee)

2. **Employment History**
   - Track designation changes
   - Track manager changes
   - Track employment type changes

### 2. My Space (Renamed Profile)
**File:** `portal-app/src/pages/MySpace.tsx`

**Structure:**
```
MySpace (Tabs)
├── Profile Tab
│   ├── Personal Details (existing)
│   ├── Banking Information (NEW)
│   │   ├── Bank Name
│   │   ├── IFSC Code
│   │   ├── Account Number
│   │   ├── Account Name (auto-fill from name)
│   │   └── UPI ID
│   ├── Employment Details (READ-ONLY)
│   │   ├── Designation
│   │   ├── Employment Type
│   │   └── Reporting Manager
│   └── Document Uploads (existing)
│
├── Payroll Tab (NEW)
│   ├── View Payslips by month/year
│   ├── Download payslip as PDF
│   └── View salary structure history
│
└── Documents Tab (NEW)
    ├── Filter by Financial Year
    ├── Document List (uploaded by HR)
    │   ├── Document Name
    │   ├── Uploaded Date
    │   └── Download button (uses document-proxy)
    └── Personal Documents Upload Section
        ├── Upload documents for HR review
        ├── Document category selector
        └── View uploaded personal documents
```

### 3. Navigation Updates
**File:** `portal-app/src/components/Layout.tsx`

Add navigation items:
- "My Space" (renamed from Profile)
- "HR & Finance" (only for HR-Finance role)

### 4. Routing Updates
**File:** `portal-app/src/App.tsx`

Add routes:
- `/my-space` - MySpace component
- `/hr-finance/*` - HRFinanceDashboard (requires HR-Finance or Administrator role)

## Implementation Priority

### Phase 1: Core Infrastructure ✅
1. ✅ Database schema migration
2. ✅ Type definitions
3. ✅ Document proxy edge function
4. ✅ Add holidays limit message

### Phase 2: My Space Refactoring
1. Create MySpace component with tabs
2. Add banking information form
3. Add read-only employment details section
4. Create Payroll tab (view-only for employees)
5. Create Documents tab with financial year filter
6. Add personal documents upload section

### Phase 3: HR-Finance Dashboard
1. Create HRFinanceDashboard component structure
2. Implement employee list sidebar
3. Create Payroll tab:
   - Salary structure form
   - Payslip management interface
   - Document upload for employees
4. Create HR tab:
   - Profile editing interface
   - Designation/employment type/manager selectors
   - Change tracking

### Phase 4: Integration & Testing
1. Update navigation and routing
2. Integrate document proxy for all document views
3. Test permissions and RLS policies
4. End-to-end testing

## Key Implementation Notes

### Document Upload Flow
```typescript
// Upload to storage
const filePath = `${userId}/${Date.now()}_${filename}`
const { data, error } = await supabase.storage
  .from('documents')
  .upload(filePath, file)

// Save record in employee_documents table
await supabase.from('employee_documents').insert({
  employee_id: userId,
  document_type: 'Form-16B',
  document_name: filename,
  file_path: filePath,
  file_size: file.size,
  financial_year: '2025-26',
  uploaded_by: currentUser.id
})
```

### Document View Flow
```typescript
// Instead of direct storage URL, use edge function
const viewUrl = `${process.env.SUPABASE_URL}/functions/v1/document-proxy?bucket=documents&path=${filePath}`

// Fetch with auth header
const response = await fetch(viewUrl, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})
const blob = await response.blob()
const url = URL.createObjectURL(blob)
window.open(url) // or display in iframe
```

### Salary Calculation
```typescript
const gross = basic_salary + hra + special_allowance + sumOfOtherAllowances
const net = gross - sumOfDeductions

// Example allowances structure
other_allowances: {
  "Transport Allowance": 1000,
  "Medical Allowance": 1250,
  "Food Allowance": 2000
}

// Example deductions structure
deductions: {
  "Provident Fund": 1800,
  "Professional Tax": 200,
  "TDS": 5000
}
```

### Payslip Generation Workflow
1. HR selects employee and month/year
2. System finds active salary structure for that period
3. Auto-populate gross salary calculation
4. HR adds/edits deductions
5. System calculates net salary
6. HR saves as Draft
7. HR submits payslip → Status becomes 'Submitted'
8. After payment, mark as 'Paid'

## Security Considerations

1. **RLS Policies:** All new tables have RLS enabled
2. **Document Access:** Edge function validates permissions
3. **Banking Info:** Encrypted at rest (Supabase default)
4. **Audit Trail:** All tables track created_by, created_at, updated_at
5. **Role Validation:** ProtectedRoute components enforce role-based access

## Deployment Steps

1. **Run migrations:**
   ```sql
   -- Execute in Supabase SQL Editor
   -- File: 003_hr_finance_schema.sql
   ```

2. **Deploy edge function:**
   ```bash
   supabase functions deploy document-proxy
   ```

3. **Update environment variables:**
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Build and deploy frontend:**
   ```bash
   npm run build
   git push
   ```

## Testing Checklist

### HR-Finance Role
- [ ] Can view all employees
- [ ] Can create salary structures
- [ ] Can generate payslips
- [ ] Can upload documents for employees
- [ ] Can edit employee profiles
- [ ] Can set designations
- [ ] Can set employment types
- [ ] Can assign managers
- [ ] Cannot access Admin-only features

### Employee
- [ ] Can view own payslips
- [ ] Can download own payslips
- [ ] Can view HR-uploaded documents by financial year
- [ ] Can upload personal documents
- [ ] Can update banking information
- [ ] Can view (but not edit) designation/employment type/manager
- [ ] Cannot view other employees' data

### Document Proxy
- [ ] Employee can access own documents
- [ ] Employee cannot access other employees' documents
- [ ] HR-Finance can access any employee documents
- [ ] Admin can access all documents
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 403 for unauthorized access
- [ ] Returns 404 for non-existent files

## Next Steps

The schema and infrastructure are ready. The implementation now needs:

1. **MySpace component** - Refactored profile with tabs
2. **HRFinanceDashboard component** - Complete HR/Finance interface
3. **Document viewer components** - Using the proxy function
4. **Navigation updates** - Add new menu items
5. **Routing updates** - Add new protected routes

All components should follow the existing design patterns:
- Chakra UI for styling
- Supabase for backend
- TypeScript for type safety
- RLS for security
- Edge functions for computed/proxy operations
