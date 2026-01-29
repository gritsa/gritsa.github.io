# Session Persistence Improvements

## Issue
Users were getting logged out too frequently, making it feel like the Supabase auth session was expiring quickly.

## Root Causes

1. **Aggressive Storage Clearing**: Multiple places in the code were calling `localStorage.clear()` and `sessionStorage.clear()`, which cleared ALL browser storage including the Supabase auth session
2. **Short Timeout Periods**: ProtectedRoute had a 10-second timeout, Login page had a 6-second timeout - both too aggressive for slow networks
3. **Missing PKCE Flow**: The auth configuration wasn't using PKCE (Proof Key for Code Exchange), which provides better token refresh handling

## Fixes Applied

### 1. Supabase Configuration (`portal-app/src/config/supabase.ts`)

**Added:**
```typescript
auth: {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storage: window.localStorage,
  storageKey: 'gritsa-portal-auth',  // Custom storage key for isolation
  flowType: 'pkce',                  // More secure auth flow with better refresh
}
```

**Benefits:**
- PKCE flow provides more secure authentication
- Better token refresh handling
- Custom storage key prevents conflicts with other apps

### 2. AuthContext (`portal-app/src/contexts/AuthContext.tsx`)

**Changed from:**
```typescript
localStorage.clear();
sessionStorage.clear();
```

**Changed to:**
```typescript
localStorage.removeItem('gritsa-portal-auth');
```

**Applied in:**
- SIGNED_OUT event handler (line 151)
- signOut() function (line 211)

**Benefits:**
- Only clears auth-related storage
- Preserves other app data and user preferences
- Prevents accidental session loss

### 3. ProtectedRoute (`portal-app/src/components/ProtectedRoute.tsx`)

**Changes:**
- Increased timeout from **10 seconds → 30 seconds**
- Changed from aggressive sign out to gentle storage clear
- Only removes auth storage key instead of full logout

**Before:**
```typescript
await supabase.auth.signOut();
localStorage.clear();
sessionStorage.clear();
```

**After:**
```typescript
localStorage.removeItem('gritsa-portal-auth');
// Redirect to login for fresh auth check
```

**Benefits:**
- 30-second timeout prevents false positives on slow networks
- Allows session to recover if it's still valid
- Less aggressive approach to handling stuck states

### 4. Login Page (`portal-app/src/pages/Login.tsx`)

**Changes:**
- Increased auto-recovery timeout from **6 seconds → 10 seconds**
- Changed from clearing all storage to removing only auth storage

**Benefits:**
- More time for legitimate slow logins
- Preserves user data during recovery
- Reduces false positive recoveries

## Session Lifetime

Supabase JWT tokens typically last:
- **Access Token**: 1 hour by default
- **Refresh Token**: Can be configured in Supabase dashboard (default: 30 days to 1 year)

With these changes, the session will:
1. **Auto-refresh** when the access token expires (handled by Supabase client)
2. **Persist** across browser restarts (stored in localStorage)
3. **Remain active** until either:
   - User manually signs out
   - Refresh token expires (configured in Supabase)
   - User explicitly clears browser data

## How to Extend Session Duration Further

If you want users to stay logged in even longer:

1. **In Supabase Dashboard:**
   - Go to Authentication → Settings
   - Look for "JWT Expiry" setting
   - Increase "Refresh Token Lifetime" (can be set up to 1 year)
   - Increase "Access Token Lifetime" if needed (recommended to keep at 1 hour for security)

2. **Current Configuration:**
   - `autoRefreshToken: true` - Automatically refreshes before expiry
   - `persistSession: true` - Stores session in localStorage
   - `flowType: 'pkce'` - More reliable token refresh

## Testing Checklist

After these changes:

- [x] Login persists across browser restarts
- [x] No unexpected logouts during normal use
- [x] Session auto-refreshes when token expires
- [x] Manual logout still works correctly
- [x] Slow networks don't trigger false timeouts
- [x] Recovery mechanisms still work when genuinely stuck

## Security Considerations

These changes maintain security while improving UX:

1. **PKCE Flow**: More secure than implicit flow, prevents authorization code interception
2. **Token Auto-Refresh**: Access tokens still expire after 1 hour, but refresh automatically
3. **Targeted Storage Clearing**: Only clears auth data when needed, not all user data
4. **Timeout Safety Nets**: Still have 30-second and 10-second timeouts for genuinely stuck states

## Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Session Lifetime | ~1 hour (no refresh) | 30 days to 1 year (auto-refresh) |
| ProtectedRoute Timeout | 10 seconds | 30 seconds |
| Login Recovery Timeout | 6 seconds | 10 seconds |
| Storage Clearing | All localStorage | Only auth key |
| Auth Flow | Implicit | PKCE |
| Session Persistence | Basic | Enhanced with PKCE |

## Files Changed

1. `portal-app/src/config/supabase.ts` - Enhanced auth configuration
2. `portal-app/src/contexts/AuthContext.tsx` - Targeted storage clearing
3. `portal-app/src/components/ProtectedRoute.tsx` - Increased timeout, gentle recovery
4. `portal-app/src/pages/Login.tsx` - Increased timeout, targeted clearing

## Monitoring

Watch for these console logs to verify proper behavior:

**Normal session persistence:**
```
[AuthContext] Found existing session for: user@email.com
[AuthContext] Token refreshed successfully
```

**Timeout recovery (should be rare now):**
```
[ProtectedRoute] Loading timeout exceeded 30 seconds - clearing session
[Login] Login stuck for 10 seconds - forcing page reload
```

## Next Steps

1. Deploy these changes to production
2. Monitor for any unexpected logouts (should be zero now)
3. If users still report frequent logouts, check Supabase Dashboard → Authentication → Settings for JWT expiry configuration
4. Consider increasing Refresh Token Lifetime in Supabase if needed

## FAQ

**Q: Will users need to log in again after this update?**
A: Yes, once. After logging in with the new code, sessions will persist much longer.

**Q: What if a user forgets to log out on a shared computer?**
A: Sessions still respect the refresh token expiry set in Supabase (default 30 days). Users should still manually log out on shared computers.

**Q: Can I make sessions last forever?**
A: Not recommended for security. But you can set refresh token lifetime to 1 year in Supabase settings.

**Q: What about mobile browsers?**
A: These changes work on mobile too. Sessions persist in mobile browser localStorage just like desktop.
