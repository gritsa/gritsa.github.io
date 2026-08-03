# Architecture

## Repo layout

This repository serves two purposes at once: it's the source for a React app, and it's the
GitHub Pages site itself. That's why the layout looks unusual:

```
gritsa.github.io/              <- GitHub Pages serves from here (repo root)
├── index.html                 <- built output (committed, not hand-written)
├── assets/                    <- built output (JS/CSS bundles, committed)
├── sw.js                      <- built output: PWA service worker (committed, stable filename)
├── manifest.webmanifest       <- built output: PWA manifest (committed, stable filename)
├── registerSW.js              <- built output: SW registration snippet (committed)
├── pwa-*.png                  <- PWA icons, generated once from favicon.ico via `sips`
├── CNAME                      <- custom domain: portal.gritsa.com
├── .nojekyll                  <- disables Jekyll processing on GH Pages
├── .github/workflows/deploy.yml
│
└── portal-app/                <- actual application source
    ├── src/
    │   ├── pages/              <- one file per route/screen, grouped by role
    │   ├── components/         <- shared components (Layout, ProtectedRoute, modals)
    │   ├── contexts/           <- AuthContext (Supabase session + user row)
    │   ├── config/supabase.ts  <- Supabase client singleton
    │   ├── types/index.ts      <- shared TypeScript types, mirrors DB schema
    │   ├── sw.js               <- PWA service worker SOURCE (compiled to root sw.js on build)
    │   └── utils/              <- notifications, push notifications, secure document URLs
    ├── supabase/
    │   ├── migrations/         <- numbered SQL migrations, source of truth for schema
    │   └── functions/          <- Edge Functions (Deno)
    └── vite.config.ts          <- outDir points at repo root; also configures vite-plugin-pwa
```

**Important:** there is no separate backend service. "Backend" means a Supabase project
(Postgres + Auth + Storage + Edge Functions), configured entirely through
`portal-app/supabase/migrations/*.sql` and `portal-app/supabase/functions/*`.

## Tech stack

| Layer | Choice |
|---|---|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 5 |
| Component library | Chakra UI v2 (+ Emotion, Framer Motion) |
| Routing | React Router v7 |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Hosting | GitHub Pages (static files served from repo root) |
| CI | GitHub Actions (`.github/workflows/deploy.yml`) |

## How a request flows

1. Browser loads `portal.gritsa.com` → GitHub Pages serves the committed `index.html` + `assets/*.js`.
2. React Router handles all client-side routing (the `spa-github-pages` redirect trick in
   `index.html`/`404.html` makes deep links work on a static host).
3. `AuthContext` (`src/contexts/AuthContext.tsx`) checks for a Supabase session on mount and
   subscribes to `onAuthStateChange`.
4. `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) gates each route on `currentUser`,
   `userData.role`, and `userData.profileCompleted`.
5. Pages talk directly to Supabase via the client in `src/config/supabase.ts` — there is no
   custom REST/GraphQL API layer. Authorization is enforced by Postgres Row Level Security (RLS)
   policies (see [data-model.md](data-model.md)), not by application code.
6. Two things can't be done safely from the browser and go through Edge Functions instead:
   sending email (needs a secret API key) and serving private documents (needs to verify the
   requester's role server-side before streaming a file). See [edge-functions.md](edge-functions.md).

## Roles

Defined in `src/types/index.ts` as `UserRole = 'Employee' | 'Manager' | 'Administrator' | 'HR-Finance'`,
mirrored by the Postgres `user_role` enum. Role-specific pages live under
`src/pages/admin/`, `src/pages/manager/`, `src/pages/hr-finance/`, and are wired up in
`App.tsx` with `<ProtectedRoute requiredRoles={[...]}>`. See
[auth-and-roles.md](auth-and-roles.md) for the full breakdown.

## Feature areas (`src/pages`)

- **Onboarding**: `Login`, `Signup`, `ForgotPassword`, `ResetPassword`, `CompleteProfile`
- **Employee self-service**: `Dashboard`, `EmployeeProfile`, `MySpace` (personal documents),
  `Timesheet`, `Expenses`, `LeaveManagement`, `NationalHolidays`, `Policies` (review and digitally
  sign policies assigned to you, using a reusable drawn signature)
- **Admin** (`pages/admin/`): `UserManagement`, `ProjectManagement`, `OrgChart`,
  `TimesheetReview`, `HolidayManagement`
- **Manager** (`pages/manager/`): `ManagerDashboard` (team view), `ExpenseApprovalsTab`
- **HR-Finance** (`pages/hr-finance/`): `HRFinanceDashboard` tabs for payroll (`PayrollTab`),
  employee documents, timesheets, expenses, employee offboarding (`OffboardingTab`), and
  per-employee policy tracking (`HRPoliciesTab`) across the whole org; `PoliciesManagement`
  (author policies with a Tiptap rich-text editor, group them into reusable sets, **Assign** them
  to employees with a due date, and **Track** signing progress — split into separate tabs since
  they're different jobs)

## PWA & push notifications

The app is an installable PWA (`vite-plugin-pwa`, `injectManifest` strategy — not the default
`generateSW`, because web push needs custom handlers a generated service worker can't provide).
`portal-app/src/sw.js` is the service worker source; it precaches only the build's own static
assets via Workbox (`precacheAndRoute(self.__WB_MANIFEST)`) — it registers **no runtime-caching
routes**, so every Supabase API call still goes straight to the network, uncached. This is
deliberate: it means the service worker can never serve stale employee data, at the cost of the
app shell (not the data) being available offline.

Push notifications (`src/utils/pushNotifications.ts`, the `send-push` Edge Function — see
[edge-functions.md](edge-functions.md)) are built on top of this service worker's `push` and
`notificationclick` listeners, and run **alongside** the existing email notifications
(`send-notification`), not instead of them — see [data-model.md](data-model.md) for the
`push_subscriptions` table. iOS only supports web push from a home-screen-installed PWA (Safari
alone won't do it), which is why the PWA conversion had to land before push notifications could.
