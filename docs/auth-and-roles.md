# Authentication & Roles

## Identity: Supabase Auth + a `users` profile row

Supabase Auth (`auth.users`) handles credentials, sessions, and password reset. The app then
keeps a parallel `public.users` row (see [data-model.md](data-model.md)) keyed by the same UUID,
holding app-specific fields: `role`, `display_name`, `profile_completed`, `manager_id`,
`project_ids`.

A trigger (`handle_new_user`, in `migrations/004_fix_trigger_permissions.sql`) auto-creates the
`public.users` row when someone signs up via `auth.users`, defaulting to role `Employee`.

`AuthContext` (`portal-app/src/contexts/AuthContext.tsx`) is the single place that:
- calls `supabase.auth.getSession()` on mount and subscribes to `onAuthStateChange`
- fetches the matching `public.users` row (`fetchUserData`) and exposes it as `userData`
- exposes `signIn`, `signOut`, `refreshUserData`

Session storage key is `gritsa-portal-auth` in `localStorage` (see `src/config/supabase.ts`).
`detectSessionInUrl` is deliberately `false` — commit history (`Prevent duplicate auth events...`,
`Fix tab switching session loss...`) shows this caused real session bugs; don't re-enable it
without re-reading that history.

### Why `fetchUserData` has a retry loop and a timeout race

Two defensive patterns worth understanding before you touch this file:

- **Retry on `PGRST116`** (row not found): right after signup, the client can query
  `public.users` before the `handle_new_user` trigger has committed the row. It retries up to
  3 times with a 1s delay.
- **8s timeout race** around the query: an earlier RLS policy on `users` caused queries to hang
  rather than error, silently freezing the login screen. The `Promise.race` against a timeout
  turns a hang into a visible error. If you see `"Query timeout - likely RLS policy blocking
  access"` in the console, check the RLS policies on `public.users` first
  (`migrations/005_fix_rls_recursion.sql` is the relevant fix).

## Route protection

`ProtectedRoute` (`src/components/ProtectedRoute.tsx`) wraps routes in `App.tsx` and enforces,
in order:
1. Redirect to `/login` if `currentUser` is null
2. Redirect to `/login` if the `public.users` row (`userData`) failed to load
3. Redirect to `/unauthorized` if `requiredRoles` is set and the user's role isn't in it
4. Redirect to `/profile/complete` if `requireProfileComplete` and `!userData.profileCompleted`

It also has a 30s loading-timeout failsafe that clears `gritsa-portal-auth` and forces a
redirect to `/login` if `loading` never resolves — a guard against the same class of RLS-hang
bug described above recurring for other queries.

## Role → route map (from `App.tsx`)

| Path | Roles allowed | Notes |
|---|---|---|
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | public | — |
| `/`, `/profile`, `/my-space`, `/timesheet`, `/expenses`, `/leaves`, `/holidays` | any authenticated user | requires `profileCompleted` |
| `/profile/complete` | any authenticated user | the only route that doesn't require `profileCompleted` |
| `/hr-finance` | `HR-Finance`, `Administrator` | |
| `/admin/*` | `Administrator` | nested routes inside `AdminDashboard` |
| `/manager/*` | `Manager`, `Administrator` | nested routes inside `ManagerDashboard` |

Note `Administrator` is layered onto every restricted route — admins can reach manager and
HR-Finance views too.

## Adding a new role-gated page

1. Add the page component under the relevant `src/pages/<role>/` folder.
2. Register it either as a new top-level `<Route>` in `App.tsx` (wrapped in `ProtectedRoute`
   with the right `requiredRoles`), or as a nested route/tab inside the existing role dashboard.
3. If it needs its own table, add a migration (see [data-model.md](data-model.md)) with RLS
   policies matching the role — there is no app-layer authorization check beyond `ProtectedRoute`
   deciding whether to render the page. The database is the real enforcement boundary.
