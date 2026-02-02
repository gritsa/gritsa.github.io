# Password Reset Implementation Methodology
## Solving Email-Based Password Reset with Supabase Auth

This document describes the methodology used to successfully implement password reset functionality in a React/Supabase application, particularly when dealing with PKCE flow conflicts and session management issues.

---

## The Problem

When implementing password reset functionality with Supabase authentication, we encountered several challenges:

1. **PKCE Flow Incompatibility**: The PKCE (Proof Key for Code Exchange) flow requires a code verifier stored during flow initiation. However, password reset emails are sent from Supabase's server, not the client app, resulting in missing code verifiers.

2. **Session Auto-Detection Conflicts**: The `detectSessionInUrl` setting was disabled to fix tab-switching session issues, but this prevented automatic token extraction from password reset URLs.

3. **Complex Token Flow**: Password reset links go through multiple redirects and token transformations before reaching the app.

---

## Initial Attempts and Failures

### Attempt 1: Manual Hash Parameter Extraction
**Approach**: Extract `access_token` and `refresh_token` from URL hash fragments
**Result**: ❌ Failed - Tokens were not in hash format; Supabase was using query parameters

### Attempt 2: Re-enable `detectSessionInUrl` Only for Reset Page
**Approach**: Create separate Supabase client with `detectSessionInUrl: true`
**Result**: ❌ Failed - Session detection is asynchronous and requires event listeners, not immediate query

### Attempt 3: Listen to Auth State Change Events
**Approach**: Use `onAuthStateChange` to listen for `PASSWORD_RECOVERY` event
**Result**: ❌ Failed - Events never fired because URL didn't contain recognizable tokens

### Attempt 4: Exchange PKCE Code
**Approach**: Extract `?code=...` parameter and call `exchangeCodeForSession()`
**Result**: ❌ Failed - "PKCE code verifier not found in storage" error

### Attempt 5: Modify Email Template to Use Hash Fragments
**Approach**: Change template to `{{ .SiteURL }}/reset-password#access_token={{ .Token }}&type=recovery`
**Result**: ❌ Failed - `{{ .Token }}` provided invalid 8-character token, not JWT

---

## The Solution: Token-Based Recovery with verifyOtp

### Key Insight
The password reset email contains a recovery `token` (not a PKCE code, not a JWT), which must be exchanged using Supabase's `verifyOtp()` method.

### Implementation Steps

#### Step 1: Update Supabase Email Template
Configure the password reset email template in Supabase Dashboard:

```html
<a href="{{ .SiteURL }}/reset-password?token={{ .TokenHash }}&type=recovery">Reset Password</a>
```

**Critical points**:
- Use `{{ .TokenHash }}` NOT `{{ .Token }}` (variable naming may vary by Supabase version)
- Use query parameters (`?token=`) NOT hash fragments (`#access_token=`)
- Include `type=recovery` parameter
- DO NOT use `{{ .ConfirmationURL }}` as it may default to PKCE flow

#### Step 2: Create Dedicated Reset Password Client
```typescript
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../config/supabase';

const resetPasswordClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
```

**Why a separate client?**
- Isolates password reset flow from main app authentication
- Prevents interference with app's session management
- Allows temporary session for password update only

#### Step 3: Implement Token Exchange in Reset Password Page
```typescript
useEffect(() => {
  const exchangeTokenForSession = async () => {
    try {
      // Extract recovery token from URL
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (token && type === 'recovery') {
        // Exchange token for session using verifyOtp
        const { data, error } = await resetPasswordClient.auth.verifyOtp({
          token_hash: token,
          type: 'recovery',
        });

        if (error) throw error;

        if (data.session) {
          setValidSession(true);
          return;
        }
      }

      // Show error if no valid token
      toast({
        title: 'Invalid or expired link',
        description: 'Please request a new password reset link.',
        status: 'error',
      });
      navigate('/forgot-password');
    } catch (error: any) {
      // Error handling
    }
  };

  exchangeTokenForSession();
}, [navigate, toast]);
```

#### Step 4: Update Password and Sign Out
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    // Update password using the reset client (which has the session)
    const { error } = await resetPasswordClient.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    // Sign out from reset client (doesn't affect main app)
    await resetPasswordClient.auth.signOut();

    toast({
      title: 'Password updated!',
      description: 'Please login with your new password.',
      status: 'success',
    });

    navigate('/login');
  } catch (error: any) {
    // Error handling
  }
};
```

---

## Critical Concepts

### 1. Token Types in Supabase Auth

| Token Type | Source | Usage | Exchange Method |
|------------|--------|-------|----------------|
| **Recovery Token** | Email link `?token=xxx` | Password reset | `verifyOtp()` |
| **PKCE Code** | OAuth redirect `?code=xxx` | Login flow | `exchangeCodeForSession()` |
| **JWT Access Token** | Hash `#access_token=xxx` | Direct auth | `setSession()` |

### 2. verifyOtp vs exchangeCodeForSession

**Use `verifyOtp()`** when:
- Token comes from email (password reset, magic link, email confirmation)
- URL has `?token=xxx&type=recovery`
- No code verifier was stored in client

**Use `exchangeCodeForSession()`** when:
- Code comes from OAuth redirect
- PKCE flow was initiated in the same browser/session
- Code verifier exists in storage

### 3. Email Template Variables

Common Supabase template variables:
- `{{ .SiteURL }}` - Your configured site URL
- `{{ .TokenHash }}` - Recovery token for email-based flows
- `{{ .Token }}` - May be shortened hash (not JWT) in some versions
- `{{ .ConfirmationURL }}` - Full URL with proper flow (may use PKCE)

**Always test which variables your Supabase version provides!**

---

## Troubleshooting Guide

### Error: "Invalid JWT structure"
- **Cause**: Using `{{ .Token }}` which provides 8-character hash, not JWT
- **Fix**: Use `{{ .TokenHash }}` or construct URL with query parameters

### Error: "PKCE code verifier not found"
- **Cause**: Trying to use `exchangeCodeForSession()` with email token
- **Fix**: Use `verifyOtp()` instead

### Error: "Session not detected" / No tokens in URL
- **Cause**: Email template using wrong format or confirmation URL
- **Fix**: Use explicit token-based URL format in template

### Error: User gets signed out before password change
- **Cause**: Session set in useEffect triggers AuthContext data fetch, which times out
- **Fix**: Delay session setting until form submission, or use separate client

---

## Testing Checklist

- [ ] Request password reset from forgot password page
- [ ] Check email contains correct URL format with `?token=...&type=recovery`
- [ ] Click reset link opens reset password page
- [ ] Console shows successful token exchange
- [ ] Can enter new password and submit
- [ ] Password successfully updated
- [ ] Redirected to login page
- [ ] Can login with new password
- [ ] Old password no longer works

---

## Lessons Learned

1. **Email-based flows != OAuth flows**: Don't assume PKCE patterns work for email magic links
2. **Read the URL structure**: Examining actual email URLs reveals the token format
3. **Separate clients help isolation**: Dedicated clients prevent session conflicts
4. **Template variables vary**: Test which variables your Supabase version provides
5. **Console logging is critical**: Detailed logs help trace token flow through system

---

## Code Repository Structure

```
src/
├── pages/
│   ├── ForgotPassword.tsx        # Request password reset
│   └── ResetPassword.tsx         # Handle reset with verifyOtp()
├── config/
│   └── supabase.ts               # Main Supabase client (detectSessionInUrl: false)
└── docs/
    └── PASSWORD_RESET_METHODOLOGY.md  # This document

supabase/
└── (Dashboard Configuration)
    └── Email Templates → Reset Password
        # Update with token-based URL format
```

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PKCE Flow Explanation](https://oauth.net/2/pkce/)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)

---

## Conclusion

The key to successful email-based password reset with Supabase is:
1. **Use query parameters** (`?token=...`) in email template
2. **Extract token** on reset page
3. **Call `verifyOtp()`** with token and type
4. **Update password** once session established
5. **Sign out** to clear temporary session

This methodology avoids PKCE complexity and works reliably across browsers and sessions.

---

**Document Version**: 1.0
**Last Updated**: February 2026
**Author**: Claude Sonnet 4.5 with Gritsa Development Team
