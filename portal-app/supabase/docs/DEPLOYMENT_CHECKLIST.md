# Deployment Checklist for portal.gritsa.com

## Pre-Deployment (Complete These First)

### 1. Supabase Storage Setup
**Status:** ⚠️ REQUIRED - Storage bucket not created yet

**Action Required:**
```sql
-- Run this in Supabase Dashboard → SQL Editor
-- Copy from: portal-app/supabase/migrations/002_storage_policies.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Then copy and run all the CREATE POLICY statements from that file
```

**Verification:**
- [ ] Go to Storage → Buckets → You see `documents` bucket
- [ ] Go to Storage → Policies → You see 6 policies for documents

**Why:** Without this, document uploads on Profile page will fail with "bucket not found" error.

---

### 2. Build and Deploy to GitHub Pages

**Commands:**
```bash
# From repo root
./build-and-deploy.sh

# Review changes
git status

# Commit all changes
git add .
git commit -m "Deploy: Auth fixes, mobile nav, storage setup, SPA routing"

# Push to GitHub Pages
git push origin main
```

**Files being deployed:**
- `index.html` - Main app entry (with SPA routing script)
- `404.html` - SPA routing fallback (NEW - enables direct URL navigation)
- `assets/` - JS, CSS, images, favicon
- `.nojekyll` - Prevents Jekyll from ignoring underscore files

---

## Post-Deployment Testing

### 3. Test SPA Routing (Direct URL Access)

**Why this is important:** GitHub Pages doesn't have server-side routing, so direct URL access needs the 404.html workaround.

**Test these URLs directly:**
- [ ] `https://portal.gritsa.com/dashboard` → Should load Dashboard, not 404
- [ ] `https://portal.gritsa.com/profile` → Should load Profile page
- [ ] `https://portal.gritsa.com/timesheet` → Should load Timesheet page
- [ ] `https://portal.gritsa.com/leaves` → Should load Leaves page

**Expected behavior:**
1. Browser requests `/dashboard`
2. GitHub Pages serves `404.html` (because `/dashboard` doesn't exist as a file)
3. 404.html redirects to `/?/dashboard`
4. index.html script decodes route and uses React Router
5. Dashboard loads correctly

**If routing doesn't work:**
- Check that `404.html` exists in repo root (should be 1.7KB)
- Check that index.html contains the SPA redirect script (lines 11-34)
- Wait 2-3 minutes after push for GitHub Pages to update
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

### 4. Test Authentication Flow

**Normal Login:**
- [ ] Login with valid credentials
- [ ] Completes in < 3 seconds
- [ ] Redirects to Dashboard
- [ ] No console errors

**Auto-Recovery:**
- [ ] If login hangs for 6 seconds
- [ ] Should see toast: "Recovering from timeout - Reloading page..."
- [ ] Page reloads automatically
- [ ] Can retry login successfully

**Session Persistence:**
- [ ] Login successfully
- [ ] Close browser tab
- [ ] Reopen portal.gritsa.com
- [ ] Should still be logged in

---

### 5. Test Navigation

**Desktop Navigation:**
- [ ] Click through: Dashboard → Profile → Timesheet → Leaves
- [ ] All pages load without timeout
- [ ] No forced logouts

**Mobile Navigation:**
- [ ] Hamburger menu appears on mobile/narrow screens
- [ ] Menu opens on click
- [ ] All navigation items visible
- [ ] Menu closes after navigation
- [ ] Sign Out button in red at bottom

**Direct URL Changes:**
- [ ] Login, then manually change URL to `/timesheet`
- [ ] Should load Timesheet page without timeout
- [ ] Try changing to other routes
- [ ] Should work smoothly

---

### 6. Test Document Upload

**Upload Test:**
- [ ] Go to Profile page
- [ ] Click document upload button
- [ ] Select a PDF or image file
- [ ] File uploads successfully
- [ ] Can view/download the uploaded file

**If upload fails with "bucket not found":**
→ Go back to Step 1 and create the storage bucket

**If upload fails with "permission denied":**
→ Run the policies from `002_storage_policies.sql`

---

### 7. Test Mobile Experience

**On actual mobile device or DevTools mobile emulation:**

**Responsive Layout:**
- [ ] Login page fits screen nicely
- [ ] Logo sized appropriately (45px on mobile)
- [ ] Dashboard cards stack vertically
- [ ] Forms are touch-friendly

**Navigation:**
- [ ] Hamburger menu works smoothly
- [ ] Touch targets are big enough (48px height)
- [ ] Drawer opens/closes properly

**Auth Recovery (Critical for Mobile):**
- [ ] If login gets stuck, auto-recovery works
- [ ] Toast notification shows
- [ ] Page reloads automatically
- [ ] No need for browser console (mobile users can't access it!)

---

## Known Issues & Workarounds

### Issue 1: Query Timeout During Login
**Symptom:** Login spinner for 5+ seconds, then recovery toast

**Cause:** Network latency or RLS policy query delay

**Fix Applied:**
- ✅ 5-second query timeout in fetchUserData()
- ✅ 6-second auto-recovery with page reload
- ✅ User can retry immediately after recovery

**Action:** None required - this is working as designed

---

### Issue 2: localStorage Corruption
**Symptom:** Can't login after timeout until manual localStorage.clear()

**Cause:** Corrupted session data persists in browser storage

**Fix Applied:**
- ✅ Auto-clear storage on recovery
- ✅ Force page reload to clear in-memory state
- ✅ Mobile-friendly (no console access needed)

**Action:** None required - auto-recovery handles this

---

## Rollback Plan (If Needed)

If deployment has critical issues:

```bash
# Revert to previous commit
git log --oneline  # Find the commit hash before deployment
git revert <commit-hash>
git push origin main

# Or hard reset (WARNING: loses all changes)
git reset --hard HEAD~1
git push origin main --force
```

---

## Success Criteria

Deployment is successful when:

- ✅ Login works reliably (< 3 seconds normally)
- ✅ Auto-recovery works if login hangs
- ✅ Direct URL access works (via 404.html)
- ✅ Navigation between routes works smoothly
- ✅ Mobile navigation works (hamburger menu)
- ✅ Document upload works (after storage bucket creation)
- ✅ No console errors during normal usage
- ✅ Session persists across browser restarts

---

## Support & Debugging

### Check Browser Console

Look for these messages:

**Normal flow:**
```
[AuthContext] Initializing auth listener...
[AuthContext] Fetching session...
[AuthContext] Found existing session for: user@email.com
[fetchUserData] Starting query for user: xxx
[fetchUserData] Query response: { data: {...} }
```

**Recovery flow:**
```
[fetchUserData] Error: Query timeout after 5 seconds
[Login] Login stuck for 6 seconds - forcing page reload
(page reloads)
```

### Files Changed in This Deployment

Core fixes:
- `portal-app/src/contexts/AuthContext.tsx` - Query timeout
- `portal-app/src/pages/Login.tsx` - Auto-recovery with reload
- `portal-app/src/components/ProtectedRoute.tsx` - Navigation timeout fix
- `portal-app/src/components/Layout.tsx` - Mobile hamburger menu

Routing:
- `portal-app/index.html` - SPA redirect script
- `portal-app/public/404.html` - SPA fallback page (NEW)

Documentation:
- `STORAGE_SETUP.md` - Storage bucket setup guide
- `LOGIN_FIX_v2.md` - Technical details of auth fixes
- `AUTH_RECOVERY_IMPROVEMENTS.md` - Multi-layer recovery system
- `GITHUB_PAGES_ROUTING.md` - How SPA routing works

---

## Next Steps After Successful Deployment

1. **Monitor for issues** - Check for any user reports
2. **Supabase dashboard** - Monitor auth events and errors
3. **Analytics** - Track login success/failure rates if you have analytics
4. **Performance** - Monitor query response times in Supabase
5. **User feedback** - Ask a few users to test all flows

---

## Contact

If issues persist after following this checklist:
- Check browser console for errors
- Check Supabase logs (Dashboard → Logs)
- Review `LOGIN_FIX_v2.md` for technical details
