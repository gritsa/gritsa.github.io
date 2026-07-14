# Gritsa Employee Portal — Engineering Docs

This is the authoritative technical documentation for the Gritsa Employee Portal, deployed at
[portal.gritsa.com](https://portal.gritsa.com). It's aimed at engineers picking up this codebase —
whether that's you in six months or a new contributor today.

> **Note on other docs in this repo:** `portal-app/README.md`, `DEPLOYMENT.md`, and `QUICKSTART.md`
> predate a migration off Firebase and are largely inaccurate (see [known-issues.md](known-issues.md)).
> Treat this `docs/` folder as the source of truth.

## Contents

- [architecture.md](architecture.md) — tech stack, repo layout, how the pieces fit together
- [auth-and-roles.md](auth-and-roles.md) — authentication flow, roles, route protection
- [data-model.md](data-model.md) — database schema, tables, relationships
- [edge-functions.md](edge-functions.md) — Supabase Edge Functions (notifications, document proxy)
- [deployment.md](deployment.md) — build & deploy pipeline, GitHub Pages, CI
- [known-issues.md](known-issues.md) — stale docs, tech debt, things to watch out for

## At a glance

- **Frontend**: React 19 + TypeScript + Vite, Chakra UI, React Router — lives in `portal-app/`
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **Hosting**: GitHub Pages, serving static build output committed to the repo root
- **Roles**: `Employee`, `Manager`, `Administrator`, `HR-Finance`

## Local development

```bash
cd portal-app
npm install
npm run dev       # http://localhost:5173
npm run build      # builds to repo root (../), used for GitHub Pages
npm run lint
```

There is no `.env` — Supabase URL and anon key are hardcoded in
[`src/config/supabase.ts`](../portal-app/src/config/supabase.ts) (safe to expose; access is
governed by Postgres Row Level Security, not the anon key).
