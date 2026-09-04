# Build & Deployment

The site is static-hosted on **GitHub Pages** at the repo root, with a custom domain
(`portal.gritsa.com`, via `CNAME`). There is no server to deploy to — "deploying" means
committing a fresh production build to the repo root on `main`.

## Why the build output lives in the repo root

`portal-app/vite.config.ts` sets `build.outDir` to `path.resolve(__dirname, '..')` — i.e. the
repo root, not `portal-app/dist`. Combined with `emptyOutDir: false`, a build writes
`index.html` and `assets/*` straight into the repo root alongside the source. This is what lets
GitHub Pages serve the app with zero extra hosting config, at the cost of the build output being
committed to git.

`.nojekyll` at the root disables GitHub's Jekyll processing (needed because Vite output can
include files/paths Jekyll would otherwise mangle). The `spa-github-pages` redirect script
embedded in `index.html` / `404.html` is what makes client-side routes (e.g. `/timesheet`)
resolve correctly on a static host that doesn't know about React Router.

## Automatic deploy: `.github/workflows/deploy.yml`

On every push to `main`:
1. Checks out the repo, sets up Node 20.
2. `npm ci` + `npm run build` inside `portal-app/`.
3. `git add index.html assets/` at the repo root, commits as `github-actions[bot]`
   (`Deploy: Update build artifacts [skip ci]`), and pushes back to `main`.

So a typical change flow is: edit `portal-app/src/**`, commit, push to `main` → CI builds and
pushes a *second* commit with the refreshed `index.html`/`assets/`. You'll see these
`[skip ci]` commits interleaved with real source commits in `git log`.

**Known gap:** step 3 only ever *adds* files — it never removes stale bundle files from
`assets/` from previous builds. Since Vite hashes filenames per build
(`index-<hash>.js`), every deploy leaves the previous build's JS/CSS files behind, and they
accumulate indefinitely (this was cleaned up once already — see
[known-issues.md](known-issues.md) for the recurring nature of this and a suggested fix).

## Manual build: `build-and-deploy.sh`

A local alternative to the CI path, for when you want to build and push yourself:
```bash
./build-and-deploy.sh
```
It removes old root-level `*.html`/`*.js`/`*.css` and `assets/` *before* building (so it doesn't
have the CI workflow's accumulation problem), then runs `npm install`/`npm run build` inside
`portal-app/`, creates `.nojekyll` if missing, and prints the `git add`/`commit`/`push` steps
for you to run manually — it does not commit or push itself.

If you run this, you don't need to also let CI redo the build; either path produces the same
committed output.

## `portal.gritsa.com` sits behind Cloudflare — PWA updates can lag hours behind a deploy

The custom domain is proxied through Cloudflare (not just GitHub Pages' own CDN) — confirmed via
`cf-cache-status`/`cf-nel` response headers. Cloudflare edge-caches `sw.js` (and `registerSW.js`)
for `max-age=14400` (4 hours). This matters specifically for the PWA service worker: a browser's
update check fetches `/sw.js` to byte-compare against the currently installed version, and for up
to 4 hours after a deploy that fetch can be served Cloudflare's **stale** cached copy — so an
already-installed PWA won't even detect that a new service worker exists, let alone install it.
`index.html` and `manifest.webmanifest` showed `cf-cache-status: DYNAMIC` (not cached this way)
when last checked, so this is specifically a `sw.js`/`registerSW.js` problem, not a general one.

If you need a service worker change to reach installed users immediately rather than within the
next few hours, purge Cloudflare's cache for `sw.js` (and `registerSW.js`) after deploying — via
the Cloudflare dashboard's "Purge Cache" (custom URL) for the zone, or by setting up a Cache Rule
that bypasses cache for those two paths so this stops being a manual step. Neither of those is
something this repo or its CI can do — it requires Cloudflare dashboard access, which lives
outside this codebase.

## Supabase side (not part of this CI)

Schema migrations and Edge Function deploys are **not** automated — see
[data-model.md](data-model.md) and [edge-functions.md](edge-functions.md). Applying a new
migration or deploying a function change is a manual `supabase db push` /
`supabase functions deploy <name>` step against the linked project (`ivdbejjgekbbetzaghkj`,
per `portal-app/supabase/config.toml`).
