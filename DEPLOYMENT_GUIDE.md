# Complete Deployment Guide - HR & Finance Features

## ✅ Build Status
**Application built successfully!** All components are ready for deployment.

## 📋 Pre-Deployment Checklist

### 1. Run Database Migration
**CRITICAL:** Must be done before deploying the app

```bash
# Go to Supabase Dashboard → SQL Editor
# Copy and paste the contents of:
portal-app/supabase/migrations/003_hr_finance_schema.sql

# Click "Run" to execute the migration
```

**What this does:**
- Adds HR-Finance role
- Creates salary_structures, payslips, employee_documents, personal_documents tables
- Extends employee_profiles with banking and employment fields
- Sets up all RLS policies

### 2. Deploy Document Proxy Edge Function
**Required for document viewing**

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ivdbejjgekbbetzaghkj

# Deploy the edge function
cd /Users/abidev/dev/gritsa.github.io
supabase functions deploy document-proxy

# Test the deployment
curl "${SUPABASE_URL}/functions/v1/document-proxy?bucket=documents&path=test.pdf" \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

### 3. Create Storage Bucket (if not exists)
```bash
# In Supabase Dashboard → Storage
# Bucket should already exist from previous setup
# If not, create "documents" bucket
```

## 🚀 Deployment Steps

### Step 1: Commit Changes
```bash
cd /Users/abidev/dev/gritsa.github.io

git add .
git commit -m "feat: Add HR & Finance system with payroll and employee management"
git push origin main
```

### Step 2: Verify Build Artifacts
```bash
# Check that these files exist:
ls -la index.html
ls -la assets/

# The build created:
# - index.html
# - assets/index-C981Fb4a.js (911 KB)
# - assets/index-DNrsL-t8.css
```

### Step 3: Wait for GitHub Pages Deployment
- GitHub Actions will automatically deploy
- Check: https://github.com/gritsa/gritsa.github.io/actions
- Wait for green checkmark
- App will be live at: https://portal.gritsa.com

## 🔧 Post-Deployment Configuration

### 1. Create HR-Finance Test User
```sql
-- In Supabase Dashboard → SQL Editor
-- Update an existing user to HR-Finance role
UPDATE public.users
SET role = 'HR-Finance'
WHERE email = 'hr@gritsa.com';
```

### 2. Test Document Proxy
```javascript
// In browser console after logging in
const token = (await supabase.auth.getSession()).data.session.access_token
const url = `https://ivdbejjgekbbetzaghkj.supabase.co/functions/v1/document-proxy?bucket=documents&path=test.pdf`

fetch(url, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => console.log(r.status)) // Should be 404 if test.pdf doesn't exist, or 200 if it does
```

### 3. Load Default Holidays (if not done)
```bash
# Login to portal
# Navigate to "Holidays" page
# Click "Load 2026 Defaults"
```

## 📱 Testing Guide

### Test as Employee
1. Login with employee account
2. **My Space**:
   - Navigate to /my-space
   - Update Profile tab (personal info + banking)
   - Check Payroll tab (should be empty initially)
   - Check Documents tab (should be empty initially)
3. **Timesheets**:
   - Fill timesheet
   - Download CSV/PDF
   - Submit and test Undo Submission
4. **Leaves**:
   - Apply for paid leave
   - Avail national holiday
5. **Holidays**:
   - View holidays list
   - Confirm 10 holidays message

### Test as HR-Finance
1. Update user role to HR-Finance
2. **HR & Finance Dashboard**:
   - Navigate to /hr-finance
   - Select an employee from sidebar
   - **Payroll Tab**:
     - Create salary structure
     - Generate payslip
     - Submit payslip
   - **HR Tab**:
     - Update designation
     - Set employment type
     - Assign manager

### Test as Administrator
1. Login as admin
2. All features should be accessible
3. Test national holidays management
4. Test HR-Finance features

## 🐛 Troubleshooting

### Issue: "Cannot find module MySpace"
**Solution:** Build succeeded, just redeploy

### Issue: Document proxy returns 401
**Solution:**
- Check edge function is deployed: `supabase functions list`
- Verify auth token is being passed correctly
- Check RLS policies in Supabase

### Issue: HR-Finance role not showing
**Solution:**
```sql
-- Check if enum was updated
SELECT enum_range(NULL::user_role);
-- Should show: {Employee,Manager,Administrator,HR-Finance}

-- If not, run migration again
```

### Issue: Salary structure save fails
**Solution:**
- Check table exists: `SELECT * FROM salary_structures LIMIT 1;`
- Check RLS policies allow insert for HR-Finance role
- Verify user has HR-Finance or Administrator role

### Issue: Payslip modal doesn't show salary
**Solution:**
- Create salary structure first with effective date before selected month
- Ensure salary structure is marked as active

## 📊 Features Summary

### New Pages
1. **My Space** (`/my-space`)
   - Profile tab: Personal info + banking + employment details (read-only)
   - Payroll tab: View payslips, download
   - Documents tab: View HR docs by financial year

2. **HR & Finance** (`/hr-finance`)
   - Employee list sidebar
   - Payroll tab: Salary structures + payslips
   - HR tab: Employee profile management

### New Roles
- **HR-Finance**: Access to HR & Finance dashboard

### New Database Tables
- `salary_structures`: Employee salary configurations
- `payslips`: Monthly payslips (Draft/Submitted/Paid)
- `employee_documents`: HR-uploaded documents
- `personal_documents`: Employee-uploaded documents

### Enhanced Tables
- `employee_profiles`: Added banking info + employment details
- `users`: Now supports HR-Finance role

## 🔐 Security Features

1. **Row Level Security**: All new tables have RLS enabled
2. **Document Proxy**: Validates permissions before serving files
3. **Role-based Access**: HR-Finance/Admin only for sensitive features
4. **Audit Trail**: All tables track created_by, created_at, updated_at

## 📝 Next Steps After Deployment

1. ✅ Run database migration
2. ✅ Deploy edge function
3. ✅ Commit and push to GitHub
4. ✅ Create HR-Finance test user
5. ✅ Test all features
6. ✅ Load default holidays for 2026
7. Document any production issues

## 📞 Support

If issues arise:
1. Check browser console for errors
2. Check Supabase logs in Dashboard → Logs
3. Check edge function logs: `supabase functions logs document-proxy`
4. Verify database schema matches migration file

---

**Deployment Ready!** 🎉

All files are built and ready to deploy. Follow the steps above to complete the deployment.
