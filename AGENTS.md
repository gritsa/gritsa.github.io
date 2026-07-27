# AGENTS.md — operating guide for the Gritsa Employee Portal

How to work in this repo: build, test, ship frontend changes, and push Supabase changes.
Read this first; it's the operational layer. For *how the system works*, the authoritative
reference is [`docs/`](docs/README.md) — don't duplicate it here, link to it.

| Question | Read |
|---|---|
| What is this thing, how do the pieces fit? | [docs/architecture.md](docs/architecture.md) |
| Who can see what, how does login work? | [docs/auth-and-roles.md](docs/auth-and-roles.md) |
| What tables/columns exist? | [docs/data-model.md](docs/data-model.md) |
| Edge Functions (email, document proxy) | [docs/edge-functions.md](docs/edge-functions.md) |
| Deploy pipeline details | [docs/deployment.md](docs/deployment.md) |
| Traps and tech debt — **read before debugging anything weird** | [docs/known-issues.md](docs/known-issues.md) |

---

## 1. Shape of the repo (this trips people up)

This repo is **both the app source and the published GitHub Pages site**.

```
gritsa.github.io/          <- GitHub Pages document root
├── index.html, assets/    <- BUILD OUTPUT, committed to git. Never hand-edit.
├── 404.html, CNAME, .nojekyll
├── docs/                  <- engineering docs (source of truth)
├── build-and-deploy.sh    <- local build helper
└── portal-app/            <- ALL SOURCE LIVES HERE
    ├── src/               <- React app
    └── supabase/          <- migrations/ + functions/ (the "backend")
```

`portal-app/vite.config.ts` sets `outDir` to the repo root with `emptyOutDir: false`, so a build
writes `index.html` + `assets/*` straight into the root next to the source. That's deliberate —
it's what makes GitHub Pages work with no extra hosting config.

Consequences you must internalise:
- **Editing root `index.html` is always wrong.** Edit `portal-app/index.html` and rebuild.
- Build output showing up in `git status` is normal and expected, not accidental damage.
- Vite prints two warnings on every build (`build.outDir must not be the same directory of
  root...` and `The public directory feature may not work correctly...`). Both are expected
  side-effects of this layout. Ignore them; they are not regressions.

There is **no separate backend service**. "Backend" = a Supabase project (Postgres + Auth +
Storage + Edge Functions), project ref `ivdbejjgekbbetzaghkj`, reached at the custom domain
`https://api.gritsa.com` (see `portal-app/src/config/supabase.ts`).

---

## 2. Setup and everyday commands

```bash
cd portal-app
npm install            # npm 11 prints "allow-scripts" warnings for esbuild/fsevents — harmless, build still works
npm run dev            # http://localhost:5173 — hot reload against the LIVE production Supabase
npm run build          # tsc -b && vite build; writes into the repo root
npm run lint           # see the warning below
```

Node 20+ (CI uses 20; Node 24 works locally). There is no `.env` and no test suite.

### `npm run dev` talks to production

`src/config/supabase.ts` hardcodes the Supabase URL and anon key, and there is only one Supabase
project — no staging. **A local dev server reads and writes real company data.** Log in as a
throwaway/test account, and be deliberate about anything that mutates payroll, leave balances,
offboarding, or user roles. The anon key is safe to have in the bundle (authorization is
enforced by Postgres RLS, not the key), so don't "fix" it by moving it to an env var without
a reason.

### Lint is not a gate — the build is

`npm run lint` **exits 1 on a clean checkout** with ~98 errors and ~17 warnings already present
on `main` (mostly `no-explicit-any` and unused vars). Do not try to fix them all; that's an
unrelated cleanup. The rule: **don't add new lint errors in files you touch.** Check by
comparing lint output before and after your change.

The real quality gate is `npm run build`, because `tsc -b` runs first with `strict: true` and
will fail the build on type errors. If the build passes, you're good to ship.

### Types are hand-maintained

`src/types/index.ts` mirrors the Postgres schema by hand — there's no `supabase gen types`
step. **Any migration that adds or changes a column requires a matching edit to
`src/types/index.ts`.** Nothing will fail loudly if you forget.

---

## 3. Shipping a frontend change

Two paths produce identical output. Pick one; don't do both.

### Path A — let CI build (preferred for source-only changes)

Commit `portal-app/**` changes and push to `main`. `.github/workflows/deploy.yml` runs
`npm ci && npm run build`, then commits `index.html` + `assets/` back to `main` as
`github-actions[bot]` with the message `Deploy: Update build artifacts [skip ci]`.
Those bot commits interleaved in `git log` are normal.

### Path B — build locally, commit source + artifacts together (preferred when you want to verify)

```bash
./build-and-deploy.sh     # cleans stale root artifacts, then builds. Does NOT commit or push.
git status                # review: source changes + index.html + assets/
git add -A
git commit -m "<message>"
git push origin main
```

`build-and-deploy.sh` deletes root-level `*.html`/`*.js`/`*.css` and `assets/` *before* building,
which the CI workflow does not — so Path B also cleans up stale bundles. CI's step is
`git add index.html assets/`, which only ever adds, so old hashed bundles accumulate forever
(see [docs/known-issues.md](docs/known-issues.md)). Prefer Path B if `assets/` has grown stale
entries. The push triggers CI, which will find nothing to commit and no-op on the build artifacts.

The build is deterministic: rebuilding unchanged source reproduces the same content hashes, so
a clean `git status` after a build means the committed artifacts are already current.

---

## 4. Pushing Supabase changes

**Supabase is not covered by CI.** Migrations and Edge Functions are deployed manually, from
this machine, and must be pushed as an explicit step in the same piece of work as the frontend
change that depends on them.

The CLI is **not installed globally** — use `npx supabase@latest`, or install it
(`brew install supabase/tap/supabase`). Auth is required and interactive: if you get
`Access token not provided`, ask the user to run `! npx supabase@latest login` (or export
`SUPABASE_ACCESS_TOKEN`) — you cannot complete an interactive browser login yourself.

### Migrations

Live in `portal-app/supabase/migrations/`, numbered and applied in order (currently 001 → 014).
Conventions to follow:
- Filename `NNN_short_snake_case_description.sql`, next number in sequence.
- **Never edit an already-applied migration.** Add a new one that alters.
- Lead with a comment block explaining *why*, not just what — read
  `014_employee_offboarding.sql` for the house style.
- Every new table needs `ENABLE ROW LEVEL SECURITY` plus explicit policies. **The database is
  the only real authorization boundary** — `ProtectedRoute` only decides what to render. A table
  without correct RLS is a data leak, not a cosmetic bug.
- Model role policies on an existing table with the same access shape (`salary_structures` and
  `employee_offboarding` for HR-Finance/Administrator; `leave_balances` for
  employee-owns-their-row).

Apply:
```bash
cd portal-app
npx supabase@latest link --project-ref ivdbejjgekbbetzaghkj   # once per machine; prompts for DB password
npx supabase@latest db push                                    # applies pending migrations
```
Confirm with the user before running `db push` — it mutates the production database, and there
is no staging project to rehearse against. `supabase db reset` is destructive here; never run it
against the linked remote.

### Edge Functions

```bash
cd portal-app
npx supabase@latest functions deploy document-proxy
npx supabase@latest functions deploy send-notification
```
Secrets (`RESEND_API_KEY`, `EMAIL_FROM_NAME`, `EMAIL_FROM_EMAIL`) live in the Supabase dashboard,
not this repo. Note `send-notification` **returns a fake success when Resend fails**, so a broken
email pipeline is invisible from the frontend — diagnose it in the Supabase Edge Function logs.
Details in [docs/edge-functions.md](docs/edge-functions.md).

### Ordering

Push the migration **before** the frontend build that queries the new columns, or the live site
will error for users during the gap.

---

## 5. Testing

There is no automated test suite. Verification is: build passes → manual check locally →
manual check live.

### Local

`npm run dev` at http://localhost:5173. A launch config exists at `.claude/launch.json`
(`portal-dev`). Exercise the change under **each role it touches** — `Employee`, `Manager`,
`Administrator`, `HR-Finance` — because `Administrator` is layered onto every restricted route
and role-specific bugs hide easily. Watch the browser console: `src/config/supabase.ts` enables
Supabase `debug` logging in dev.

If a page hangs on a spinner rather than erroring, suspect an RLS policy before suspecting React
— that failure mode is why `AuthContext` has a retry loop and an 8s timeout race. See
[docs/auth-and-roles.md](docs/auth-and-roles.md).

### Live

The deployed build is testable at **https://portal.gritsa.com** — use the Playwright browser
tools to drive it. Confirm you're actually testing your build, not a cached one:

```bash
curl -s https://portal.gritsa.com/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
grep -o 'assets/index-[A-Za-z0-9_-]*\.js' index.html    # local; hashes should match
```

If they differ, the deploy hasn't landed yet (CI takes a minute or two after push) or you're
seeing a stale CDN/browser cache — hard-reload.

Live testing hits production data with real credentials. Ask the user for a test account rather
than assuming one, and don't submit, approve, or delete real records to "see if it works."

---

## 6. Commit and push conventions

- **Never mention Claude, Anthropic, or any AI assistant in a commit message, PR body, code
  comment, or doc.** No `Co-Authored-By: Claude ...` trailer, no "generated with" footer, no
  emoji attribution. Commits must read as ordinary work by the repo's author. (Older commits in
  the history do carry such trailers; leave them alone — don't rewrite published history to
  clean them up.)
- Message style, per existing history: a single imperative-ish sentence describing the change
  and, where useful, the symptom fixed. Real examples:
  - `Add employee offboarding process to HR-Finance dashboard`
  - `Fix leave balance showing 18 regardless of approved leave`
  - `Remove stale dead code and build artifacts`
  Some older commits use `feat:`/`fix:` prefixes; the recent convention drops them. Match recent.
- **Check the git identity before your first commit.** This machine has no `~/.gitconfig`, so git
  falls back to `Abi <abi@Gritsas-iMac.local>`, which does not match the history
  (`Abi <achatterjee@gritsa.com>`). Verify with `git var GIT_AUTHOR_IDENT` and, if it's wrong,
  commit with the right identity:
  ```bash
  git -c user.name='Abi' -c user.email='achatterjee@gritsa.com' commit -m "..."
  ```
- Work happens on `main` and pushes go straight to `main` — that's what triggers the deploy.
  Confirm with the user before pushing; a push is a production deploy.
- `CHANGELOG.md` is a historical narrative that stopped being maintained per-commit. Don't feel
  obliged to update it for routine changes.

---

## 7. Adding a feature — the standard loop

1. **Read** [docs/known-issues.md](docs/known-issues.md) and the relevant `docs/` page first.
2. **Schema**: new migration in `portal-app/supabase/migrations/` with RLS policies.
3. **Types**: update `portal-app/src/types/index.ts` to match, by hand.
4. **UI**: page under `src/pages/<role>/`, wired in `App.tsx` inside `<ProtectedRoute
   requiredRoles={[...]}>`, or as a tab in the existing role dashboard. Chakra UI v2 components;
   match the surrounding file's patterns.
5. **Notifications** (if the feature should email anyone): add a type to the union in
   `src/utils/notifications.ts` and call `sendNotification`. Be aware emails currently render
   generic boilerplate and ignore the `data` payload — see
   [docs/known-issues.md](docs/known-issues.md) before promising a user that the email will say
   something specific.
6. **Verify**: `npm run build` passes, no new lint errors, exercised locally per affected role.
7. **Ship**: push the migration (§4), then build + commit + push (§3), then verify live (§5).
8. **Document**: if the change alters schema, roles, deploy, or introduces a gotcha, update the
   matching file in `docs/`. Keeping `docs/` true is part of the change, not a follow-up.

---

## 8. Files and directories to leave alone

| Path | Why |
|---|---|
| root `index.html`, `assets/` | build output — regenerate, don't edit |
| `portal-app/supabase/docs/` | archive of point-in-time bug write-ups; historical context only, not current state |
| `portal-app/README.md`, `QUICKSTART.md`, `DEPLOYMENT.md` | predate the Firebase→Supabase migration; superseded by `docs/` |
| `CHANGELOG.md` | historical; contains stale Firebase-era content |
| `portal-app/create-admin.js` | one-off admin bootstrap script, needs `SUPABASE_SERVICE_ROLE_KEY` |
| `CNAME`, `.nojekyll`, the `spa-github-pages` script in `index.html`/`404.html` | load-bearing for GitHub Pages routing and the custom domain |
