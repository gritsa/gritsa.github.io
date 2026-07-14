# Gritsa Employee Portal

A comprehensive employee management portal built with React, TypeScript, Supabase, and Chakra UI.

> **Full engineering documentation lives in [`../docs`](../docs/README.md)** — architecture,
> auth/roles, data model, Edge Functions, and deployment. This file is a quick feature overview.

## Features

### For All Employees
- **Profile Management**: Create and update personal profiles with document uploads (PAN Card, Aadhaar Card)
- **Timesheet Management**: Submit monthly timesheets with day-by-day work descriptions
- **Leave Management**: Apply for leaves and track leave balance
  - 18 Paid & Sick Leaves per year
  - 10 National Holidays (configurable by admin)
- **Dashboard**: View assigned projects, leave balance, and quick actions

### For Managers
- **Leave Approvals**: Review and approve/reject leave requests from team members
- **Team Oversight**: View team members and their timesheets
- **Reporting**: Access team member information and project assignments

### For Administrators
- **User Management**: Manage user roles (Employee, Manager, Administrator)
- **Project Management**: Create and assign projects to employees
- **Organization Chart**: Configure reporting structure
- **Timesheet Review**: View all submitted timesheets
- **Holiday Management**: Configure national holidays for the year

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

There's no admin account seeded automatically — create the first `Administrator` via the
`supabase/migrations` schema (sign up normally, then update the `role` column on your `users`
row from the Supabase dashboard).

## Deployment

The app automatically deploys to GitHub Pages via GitHub Actions when pushing to the main
branch — see [`../docs/deployment.md`](../docs/deployment.md) for how the build output ends up
committed to the repo root.

## Backend

The backend is Supabase (Postgres + Auth + Storage + Edge Functions), configured via
`supabase/migrations/` and `supabase/functions/`. See [`../docs/data-model.md`](../docs/data-model.md)
and [`../docs/edge-functions.md`](../docs/edge-functions.md).
