# Supabase Edge Functions

Location: `portal-app/supabase/functions/`. All are Deno functions deployed to Supabase (not
part of the Vite build — deployed separately via the Supabase CLI, e.g.
`supabase functions deploy <name>`).

## `document-proxy`

**Purpose:** serve private files from the `documents` storage bucket without exposing a signed
URL the client could reshare, and without letting the client fetch storage directly (which would
require weakening storage RLS to something app-code would have to re-check).

**Called from:** `src/utils/documentUrl.ts` (`getSecureDocumentUrl` /
`buildSecureDocumentUrl`), which builds a URL like:
```
{SUPABASE_URL}/functions/v1/document-proxy?bucket=documents&path=<file path>&token=<access token>
```
That URL is then used directly as an `<img src>` / link href / iframe src (see
`DocumentViewer.tsx`, `MySpace.tsx`) — the access token travels as a query param because it's
loaded as a resource, not fetched via `fetch()` with an Authorization header.

**What it does, in order:**
1. Reads the bearer token from the query string or `Authorization` header.
2. Verifies it against Supabase Auth using the **service role key** (`supabaseAdmin.auth.getUser(token)`)
   — this is why it must run server-side; the service role key is never sent to the client.
3. Looks up the requesting user's `role` from `public.users`.
4. Permission check: allow if the requester owns the document, OR is `HR-Finance`, OR is
   `Administrator`. (Ownership is inferred from the storage path prefix matching `auth.uid()`.)
5. Downloads the file from the `documents` bucket via the admin client and streams it back with
   a MIME type derived from the file extension.

**If you're debugging a "file not found" or "forbidden" error:** the function logs each step
(`console.log`) — check the Edge Function logs in the Supabase dashboard first. Most failures are
either an expired token or the permission check in step 4 not matching the caller's actual role.

## `send-notification`

**Purpose:** send transactional emails (leave submitted/reviewed, expense submitted/reviewed,
payslip generated, document uploaded) via [Resend](https://resend.com). Called from
`src/utils/notifications.ts` (`sendNotification`), which fire-and-forgets — a failed
notification is logged and swallowed, never blocks the calling UI action.

**Required environment variables** (set via Supabase dashboard / CLI secrets, not in this repo):
`RESEND_API_KEY`, `EMAIL_FROM_NAME`, `EMAIL_FROM_EMAIL`.

**Behavior:** builds a fixed HTML email template (`createDefaultHtmlEmail`), sends via a direct
`fetch` to the Resend API. If Resend fails (e.g. missing/invalid API key, Resend outage), it
**falls back to a mock "success" response** rather than surfacing an error — meaning if email
silently stops arriving, check the Edge Function logs, not the frontend, since callers will see
success either way. See [known-issues.md](known-issues.md) for why this fallback should
probably be revisited.

**History note:** earlier revisions used `denomailer` for direct SMTP (commit
`4093144 fix: switch send-notification to denomailer for reliable Deno SMTP`) before moving to
Resend. If you find references to SMTP/denomailer elsewhere, they're stale — the current
function only talks to Resend.

## `send-push`

**Purpose:** deliver web push notifications, self-hosted (no third-party push service) using the
`web-push` npm package (imported via `esm.sh?target=deno`) and VAPID keys. Runs **alongside**
`send-notification`, not instead of it — `sendNotification()` in `src/utils/notifications.ts`
fires both channels independently (each in its own try/catch, so a failure in one never blocks
the other).

**Called from:** `src/utils/notifications.ts`'s `sendNotification()`, which builds a
human-readable `{ title, body, url }` client-side via `buildPushContent()` (the email channel's
template ignores this kind of content — see the `send-notification` note below — so this is the
first place these notifications get real, readable text) and POSTs
`{ user_id, title, body, url }`.

**What it does:** loads every `push_subscriptions` row for `user_id` (service role key, bypasses
RLS — see [data-model.md](data-model.md)), sends to each via `web-push`, and deletes any
subscription that comes back 404/410 (the browser unsubscribed or cleared its data) so dead
endpoints don't accumulate.

**Required secrets:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:`
address). The public key is duplicated in frontend source
(`src/utils/pushNotifications.ts`) — that's expected, VAPID public keys are meant to be exposed.

**Frontend opt-in:** `EmployeeProfile.tsx` has a "Push Notifications" toggle calling
`subscribeToPush`/`unsubscribeFromPush` from `src/utils/pushNotifications.ts`. This is
deliberately a manual, user-initiated control (a button/switch), not an automatic permission
prompt on login — browsers expect a user gesture before asking for notification permission, and
prompting on every login would be poor UX regardless. Requires the PWA's service worker
(`src/sw.js`) to be registered first — see [architecture.md](architecture.md).

## Deploying a change to any function

```bash
cd portal-app
supabase functions deploy document-proxy
supabase functions deploy send-notification
supabase functions deploy send-push
```

There's no CI step for this — Edge Function deploys are manual. Migrations are also applied
manually/via `supabase db push`; there's no migration-on-deploy automation in
`.github/workflows/deploy.yml` (that workflow only builds and publishes the frontend — see
[deployment.md](deployment.md)).
