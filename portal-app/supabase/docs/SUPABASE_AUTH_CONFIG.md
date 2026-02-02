# Supabase Auth Configuration

## Session Duration Settings

To extend session duration and improve user experience, configure these settings in your Supabase Dashboard:

### 1. JWT Expiry (Access Token)

**Location**: Supabase Dashboard → Authentication → Settings → JWT expiry

**Current**: 3600 seconds (1 hour)
**Recommended**: 14400 seconds (4 hours) or 28800 seconds (8 hours)

This controls how long the access token is valid before requiring a refresh.

### 2. Refresh Token Rotation

**Location**: Supabase Dashboard → Authentication → Settings

**Setting**: Ensure "Refresh Token Rotation" is **ENABLED**

This enhances security while allowing long-lived sessions.

### 3. Site URL Configuration

**Location**: Supabase Dashboard → Authentication → URL Configuration

**Add these URLs**:
- `https://portal.gritsa.com` (Production)
- `http://localhost:5173` (Development)

This ensures password reset emails and OAuth redirects work correctly.

### 4. Redirect URLs

**Location**: Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

**Add**:
- `https://portal.gritsa.com/**` (Production - wildcard)
- `http://localhost:5173/**` (Development - wildcard)

This allows the password reset flow to redirect back to your app.

## CRITICAL: Password Reset Flow Type

**Location**: Supabase Dashboard → Authentication → Settings

**Setting**: Flow Type

**IMPORTANT**: Change the flow type from "PKCE" to "Implicit" for password reset to work correctly.

The PKCE flow requires a code verifier that is stored when the flow is initiated. However, password reset emails are sent from Supabase's server, not from your app, so there's no code verifier available. The implicit flow uses hash fragments in the URL which work perfectly for email-based password resets.

**Steps to configure**:
1. Go to Supabase Dashboard
2. Navigate to Authentication → Settings
3. Find "Auth Flow Type" or similar setting
4. Change from "PKCE" to "Implicit" (or "implicit_grant")
5. Save changes

Alternatively, you can keep PKCE for regular login and only use implicit for password reset by configuring the email template to use the implicit flow URL format.

## Email Templates

### Password Reset Email

**Location**: Supabase Dashboard → Authentication → Email Templates → Reset Password

**CRITICAL**: The email template needs to use a token-based URL, not the confirmation URL.

**Use this template format**:

```html
<a href="{{ .SiteURL }}/reset-password?token={{ .TokenHash }}&type=recovery">Reset Password</a>
```

**Important notes**:
- Use `{{ .TokenHash }}` NOT `{{ .Token }}`
- Use query parameters (`?token=`) NOT hash fragments (`#access_token=`)
- The `type=recovery` parameter is required
- DO NOT use `{{ .ConfirmationURL }}` as it may use PKCE flow which doesn't work for email-based recovery

If `{{ .TokenHash }}` doesn't work, try `{{ .Token }}` as the variable name may differ in your Supabase version.

## Testing Checklist

After configuring:

- [ ] Test login stays active when switching tabs
- [ ] Test login stays active when switching pages
- [ ] Test token refresh happens automatically before expiry
- [ ] Test password reset email goes to correct URL
- [ ] Test password reset flow completes successfully
- [ ] Verify no unexpected logouts during normal usage

## Monitoring

Watch for these events in browser console (when `debug: true`):
- `TOKEN_REFRESHED` - Should happen automatically before expiry
- `SIGNED_OUT` - Should only happen on explicit logout
- `USER_UPDATED` - Normal during profile updates

If you see frequent `SIGNED_OUT` events without user action, there's a refresh issue to investigate.
