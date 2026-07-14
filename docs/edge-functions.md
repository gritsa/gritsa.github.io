# Supabase Edge Functions

Location: `portal-app/supabase/functions/`. Both are Deno functions deployed to Supabase (not
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

## Deploying a change to either function

```bash
cd portal-app
supabase functions deploy document-proxy
supabase functions deploy send-notification
```

There's no CI step for this — Edge Function deploys are manual. Migrations are also applied
manually/via `supabase db push`; there's no migration-on-deploy automation in
`.github/workflows/deploy.yml` (that workflow only builds and publishes the frontend — see
[deployment.md](deployment.md)).
