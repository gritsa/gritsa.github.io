# Supabase Storage Setup for Documents

## Issue
"Storage bucket not found" error when uploading documents via Profile screen.

## Root Cause
The `documents` storage bucket hasn't been created in your Supabase project yet.

## Solution

### Option 1: Run the Migration (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Open `portal-app/supabase/migrations/002_storage_policies.sql`
3. Copy and paste the entire contents
4. Click "Run"

This will:
- Create the `documents` bucket
- Set up all the necessary security policies

### Option 2: Manual Setup via Supabase UI

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name it: `documents`
4. Set "Public bucket": **OFF** (unchecked)
5. Click "Create bucket"

Then run the policies from `002_storage_policies.sql` in SQL Editor to set up permissions.

## Verify Setup

After running the migration, verify in Supabase Dashboard:

1. **Storage → Buckets**
   - You should see a bucket named `documents`
   - Public: No

2. **Storage → Policies (select documents bucket)**
   - You should see 6 policies:
     - ✅ Users can upload their own documents (INSERT)
     - ✅ Users can read their own documents (SELECT)
     - ✅ Admins and managers can read all documents (SELECT)
     - ✅ Users can update their own documents (UPDATE)
     - ✅ Users can delete their own documents (DELETE)
     - ✅ Admins can delete any document (DELETE)

## How Document Storage Works

### Upload Structure
Documents are uploaded to paths like:
```
documents/
  └── {user_id}/
      ├── resume.pdf
      ├── id_proof.jpg
      └── address_proof.pdf
```

### Security
- Users can only access their own documents folder
- Admins and Managers can view all documents
- Only Admins can delete any document
- Users can delete their own documents

### File Types Allowed
Currently configured to allow common document types:
- PDF (.pdf)
- Images (.jpg, .jpeg, .png)
- Word docs (.doc, .docx)
- Max file size: Check your Supabase project settings (default is usually 50MB)

## Troubleshooting

### "Bucket not found" error persists
1. Verify the bucket was created: Storage → Buckets
2. Check the bucket name is exactly `documents` (lowercase, no spaces)
3. Verify you're looking at the correct Supabase project (check project ref in URL)

### "Permission denied" errors
1. Go to SQL Editor
2. Run this query to check if policies exist:
```sql
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%document%';
```
3. If no results, re-run the `002_storage_policies.sql` migration

### Files upload but can't view them
1. Check browser console for errors
2. Verify the file path format matches: `{user_id}/filename.ext`
3. Check that the signed URL generation is working in the Profile component

## Related Files
- Migration: `portal-app/supabase/migrations/002_storage_policies.sql`
- Profile Upload: `portal-app/src/pages/EmployeeProfile.tsx`
- Supabase Config: `portal-app/src/config/supabase.ts`
