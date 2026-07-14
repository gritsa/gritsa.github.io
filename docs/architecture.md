# Architecture

## Repo layout

This repository serves two purposes at once: it's the source for a React app, and it's the
GitHub Pages site itself. That's why the layout looks unusual:

```
gritsa.github.io/              <- GitHub Pages serves from here (repo root)
├── index.html                 <- built output (committed, not hand-written)
├── assets/                    <- built output (JS/CSS bundles, committed)
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
    │   └── utils/              <- notifications, secure document URLs
    ├── supabase/
    │   ├── migrations/         <- numbered SQL migrations, source of truth for schema
    │   └── functions/          <- Edge Functions (Deno)
    └── vite.config.ts          <- outDir points at repo root (see deployment.md)
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
  `Timesheet`, `Expenses`, `LeaveManagement`, `NationalHolidays`
- **Admin** (`pages/admin/`): `UserManagement`, `ProjectManagement`, `OrgChart`,
  `TimesheetReview`, `HolidayManagement`
- **Manager** (`pages/manager/`): `ManagerDashboard` (team view), `ExpenseApprovalsTab`
- **HR-Finance** (`pages/hr-finance/`): `HRFinanceDashboard` tabs for payroll (`PayrollTab`),
  employee documents, timesheets, and expenses across the whole org
