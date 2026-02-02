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

## Email Templates

### Password Reset Email

**Location**: Supabase Dashboard → Authentication → Email Templates → Reset Password

**Update the Reset Link** to use your production domain:

```
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

The `{{ .ConfirmationURL }}` will automatically use the Site URL configured above.

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
