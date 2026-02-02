# Supabase Setup Instructions

## Step 1: Run Database Migrations

1. Go to your Supabase project: https://supabase.com/dashboard/project/ivdbejjgekbbetzaghkj

2. Navigate to **SQL Editor**

3. Copy and paste the content of `supabase/migrations/001_initial_schema.sql` and click **RUN**
   - This will create all tables, indexes, RLS policies, and triggers

4. Copy and paste the content of `supabase/migrations/002_storage_policies.sql` and click **RUN**
   - This will create the storage bucket and policies

## Step 2: Enable Email Auth

1. Go to **Authentication** > **Providers**
2. Make sure **Email** provider is enabled
3. **Important**: Disable email confirmation for testing:
   - Go to **Authentication** > **Settings**
   - Under "Email Auth", toggle OFF "Enable email confirmations"
   - This allows the default admin to be created automatically

## Step 3: Configure Email Domain Restrictions (Optional)

To restrict signups to @gritsa.com emails only:

1. Go to **Authentication** > **Settings**
2. Scroll to "Email Domain Filtering"
3. Add `gritsa.com` to allowed domains

## Step 4: Create Default Admin User

The app will try to auto-create the admin user, but if it fails:

1. Go to **Authentication** > **Users**
2. Click **Add user** > **Create new user**
3. Email: `admin@gritsa.com`
4. Password: `123@gritsa`
5. Auto Confirm User: **Yes**
6. Click **Create user**

7. Then go to **SQL Editor** and run:
```sql
UPDATE public.users
SET role = 'Administrator',
    display_name = 'Default Admin',
    profile_completed = true
WHERE email = 'admin@gritsa.com';
```

## Step 5: Verify Storage Bucket

1. Go to **Storage**
2. You should see a bucket named **documents**
3. Click on it and verify the policies are set:
   - Users can upload their own documents
   - Users can read their own documents
   - Admins/Managers can read all documents

## Step 6: Test the Application

1. Build and run the app:
```bash
cd portal-app
npm run build
```

2. Access the app at https://gritsa.github.io

3. Login with:
   - Email: `admin@gritsa.com`
   - Password: `123@gritsa`

## Troubleshooting

### Issue: Admin user can't be created automatically

**Solution**: Create manually as shown in Step 4

### Issue: RLS policies blocking access

**Solution**: Check that the user exists in the `public.users` table:
```sql
SELECT * FROM public.users WHERE email = 'admin@gritsa.com';
```

If not, the trigger might not have fired. Insert manually:
```sql
INSERT INTO public.users (id, email, role, display_name, profile_completed)
SELECT id, email, 'Administrator', 'Default Admin', true
FROM auth.users
WHERE email = 'admin@gritsa.com';
```

### Issue: Storage uploads failing

**Solution**: Verify the storage bucket exists and policies are active:
```sql
SELECT * FROM storage.buckets WHERE id = 'documents';
```

Check policies:
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'documents';
```

## Database Schema Reference

### Tables Created

- `public.users` - User accounts with roles
- `public.employee_profiles` - Employee detailed information
- `public.projects` - Project management
- `public.timesheets` - Monthly timesheets
- `public.leave_balances` - Leave balance tracking
- `public.leave_requests` - Leave applications
- `public.national_holidays` - Configurable holidays

### Enums Created

- `user_role`: Employee, Manager, Administrator
- `leave_type`: Paid, Sick, National Holiday
- `leave_status`: Pending, Approved, Rejected
- `timesheet_day_type`: Full Day, Half Day, Leave
- `timesheet_status`: Draft, Submitted

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data unless they're Admin/Manager
- Storage is private by default
- Document uploads limited to user's own folder
- 10MB file size limit enforced
