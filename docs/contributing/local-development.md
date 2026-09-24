# Local Development

How to run the app and its dependencies locally.

---

## Requirements

- Node.js 20 (matches CI in `.github/workflows/ci.yml`)
- npm (comes with Node)
- A Supabase project (cloud, or local via Supabase CLI — see below)
- `openssl` (for generating the encryption key)

---

## Install

```bash
npm install
```

---

## Environment Variables

Create `.env.local` in the project root (never commit this file):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# 64 hex characters — generate with:
#   openssl rand -hex 32
ENCRYPTION_KEY=

CRON_SECRET=<any-random-string>

# Optional until you're testing notifications
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

Get the Supabase values from the Supabase dashboard: Project Settings → API.

The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — treat it like a production secret even in development. Never log it, never expose it to the client, never commit it.

---

## Database

### Option A: Use the shared cloud Supabase project

If you've been given access to the existing Supabase project, just point `.env.local` at it. Migrations in `supabase/migrations/` should already be applied — confirm with the project owner.

### Option B: Run Supabase locally

```bash
# Install the CLI if you don't have it
npm install -g supabase

supabase init      # if not already initialized
supabase start     # starts local Postgres, Auth, Storage, etc.
```

This prints local URLs and keys — use those in `.env.local` instead of the cloud project's.

Apply migrations:

```bash
supabase db push
```

Migrations live in `supabase/migrations/`, applied in filename order (`00001_...`, `00002_...`). When adding a new migration, create a new numbered file — never edit an already-applied migration.

---

## Running the App

```bash
npm run dev
```

Visit `http://localhost:3000`. Uses Next.js 16 with Turbopack — changes hot-reload.

---

## Other Useful Commands

| Command | Purpose |
|---|---|
| `npm run build` | Production build (same as CI) |
| `npm run start` | Run the production build locally (`npm run build` first) |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |

---

## Testing Notification Channels Locally

Email and SMS sending are stubbed/real depending on whether their API keys are set:

- **Email:** requires `RESEND_API_KEY`. Without it, `src/lib/notifications/channels/email.ts` will fail — expected in local dev unless you're specifically testing email.
- **SMS:** `src/lib/notifications/channels/sms.ts` is currently a stub that logs to console instead of calling Twilio (see project status notes) — safe to leave unset.

Use `/api/notifications/test` (see `src/app/api/notifications/test/route.ts`) to trigger a test notification without waiting for the cron schedule.

---

## Cron Jobs Locally

Production cron routes (`/api/cron/check-expiration`, `/api/cron/update-statuses`) are protected by `CRON_SECRET`. To trigger them manually in dev:

```bash
curl -X POST http://localhost:3000/api/cron/check-expiration \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Troubleshooting

**Build fails with module not found** — check for stale import paths after renames (this has happened before, e.g. `@/lib/document` vs `@/lib/documents`). Run `npm run type-check` to catch these before `npm run build`.

**RLS errors / empty query results** — confirm the logged-in user's `org_id` in `auth.jwt() -> 'user_metadata'` matches the data you're querying. Check via Supabase Studio → Authentication → Users.

**Decryption errors** — `ENCRYPTION_KEY` must be exactly 64 hex characters and must match the key used to encrypt existing data. If you regenerate the key, previously encrypted tenant data becomes unreadable.
