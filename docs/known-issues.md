# Known Issues & Tech Debt

Things worth knowing before you touch related code, roughly in order of how likely they are to
bite you.

## Build artifacts accumulate at the repo root

`.github/workflows/deploy.yml` runs `git add index.html assets/` after every build, but never
removes stale files first. Vite content-hashes output filenames (`index-<hash>.js`), so every
deploy adds a new bundle without deleting the previous one. As of this writing, 16 stale JS
bundles (~16MB) had piled up in `assets/` and were removed as part of a cleanup pass — but the
CI workflow itself wasn't changed, so this **will recur** on every future deploy.

Fix options, if you want to close this properly:
- Add a `git rm` (or `rm -rf assets && git add -A assets/`) step to `deploy.yml` before the
  build/commit step, mirroring what `build-and-deploy.sh` already does locally.
- Or point `vite.config.ts`'s `build.outDir` at a subfolder and have CI sync only that folder's
  current contents into the root, deleting anything no longer present.

## `send-notification` silently falls back to a fake success on failure

If the Resend API call fails for any reason (bad/missing API key, Resend outage, rate limit),
the function catches the error and returns `{ success: true, fallback: true, ... }` with a
200 status instead of surfacing an error. The calling code
(`src/utils/notifications.ts`) already treats notification failures as non-blocking (by design —
a broken email shouldn't stop a leave approval), but this specific fallback means **you cannot
tell from the frontend, or from a non-2xx response, that email delivery is broken** — you have to
go read the Edge Function logs. If email notifications seem to have silently stopped working,
check Supabase Edge Function logs for `send-notification` before assuming the code is fine.

## Types are hand-maintained, not generated

`src/types/index.ts` mirrors the Postgres schema by hand. There's no `supabase gen types
typescript` step in the build or CI. When you add/change a column in a migration, you must
remember to update the matching interface yourself — nothing will fail loudly if you forget
(you'll just get `any`-flavored surprises at runtime).

## Legacy Firebase references (mostly cleaned up)

The project originally used Firebase and fully migrated to Supabase. The leftover
`firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, and
`portal-app/storage.rules` files (dead — no `firebase` package dependency, no CI step
referencing them) were removed in the same cleanup that produced this `docs/` folder.
`portal-app/README.md`, `DEPLOYMENT.md`, and `QUICKSTART.md` were updated to stop describing a
Firebase setup that no longer exists — if you find other stale Firebase mentions (e.g. in
`CHANGELOG.md`), treat them as historical, not instructional.

## `supabase/docs/` is a changelog, not a docs folder

`portal-app/supabase/docs/*.md` (e.g. `SESSION_FIX_SUMMARY.md`, `LOGIN_FIX_v2.md`,
`AUTH_RECOVERY_IMPROVEMENTS.md`) are point-in-time write-ups of specific bugs and fixes, mostly
around session/auth issues — several of them are reflected as comments in
`AuthContext.tsx`/`ProtectedRoute.tsx` today. They're useful historical context for *why* the
auth code has the retry/timeout logic it does, but they are not current-state documentation and
can drift from what the code actually does. This `docs/` folder (specifically
[auth-and-roles.md](auth-and-roles.md)) is the up-to-date version of that story; treat
`supabase/docs/` as an archive.

## No environment-based config

`src/config/supabase.ts` hardcodes the Supabase URL and anon key rather than reading them from
`import.meta.env`. There's only one environment (production) — there's no staging/dev Supabase
project, so this hasn't mattered in practice, but it means you cannot point a local dev build at
a different backend without editing this file directly.

## Bundle size warning on every build

The Vite build warns that `index-*.js` is >500KB minified. Nothing broken, but if the app grows
much further, code-splitting (dynamic `import()` per route, or `manualChunks`) is worth revisiting
— `vite.config.ts` currently disables manual chunking entirely (`manualChunks: undefined`).
