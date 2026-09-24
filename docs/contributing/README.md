# Contributing Guide

This guide covers the full workflow for making a change to the Landlord Compliance Tracker: local setup, making the change, testing it, and submitting it to GitHub.

Repo: `git@github.com:harrisciaran1/landlord-compliance-tracker.git`
Main branch: `main` (protected — do not push directly, use pull requests)

---

## 1. One-Time Setup

```bash
git clone git@github.com:harrisciaran1/landlord-compliance-tracker.git
cd landlord-compliance-tracker
npm install
```

Copy environment variables:

```bash
cp .env.local.example .env.local   # if example exists, otherwise create manually
```

Required variables (see `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=          # openssl rand -hex 32
CRON_SECRET=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

Never commit `.env.local` — it's already in `.gitignore`. Never paste real secrets into commits, PR descriptions, or issues.

---

## 2. Start a Change

### 2.1 Sync main

```bash
git checkout main
git pull origin main
```

### 2.2 Create a branch

Use a short, descriptive branch name with a type prefix:

```bash
git checkout -b feat/tenant-management
git checkout -b fix/snooze-route-typo
git checkout -b chore/update-deps
```

Prefixes: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`.

---

## 3. Make the Change

- Read the existing code in the area you're touching before writing new code — match existing patterns (see `src/app/dashboard/properties/actions.ts` for the server action style, `src/lib/` for utility module conventions).
- Keep changes scoped to what the task requires. Don't bundle unrelated refactors into the same branch.
- If you're adding a new server action, follow the existing pattern: auth check → org/ownership check → mutation → `revalidatePath()` → return `{ success }` or `{ error }`.
- If you're touching anything that stores tenant PII, encrypt/decrypt via `src/lib/crypto.ts` — never store plaintext names, emails, or phone numbers.
- Update or add types in `src/lib/types/` if the data shape changes.

---

## 4. Test the Change Locally

There is currently **no automated test suite** (no Jest/Vitest configured) — verification relies on type-checking, linting, build, and manual testing against the dev server. If you're adding significant logic (e.g. encryption, expiry calculations), consider adding a test framework as part of your change (see §4.4).

### 4.1 Type check

```bash
npm run type-check
```

### 4.2 Lint

```bash
npm run lint
```

### 4.3 Build

```bash
npm run build
```

All three must pass before pushing — this mirrors exactly what CI runs (`.github/workflows/ci.yml`).

### 4.4 Run the dev server and test manually

```bash
npm run dev
```

Open `http://localhost:3000`. Manually walk through the user flow your change affects. At minimum:

- The happy path works end-to-end (UI → server action → database → UI update).
- Error states are handled (e.g. invalid input, unauthorized access).
- If you touched RLS-sensitive data (tenants, properties, documents), confirm a second org/account cannot see or modify the data.

If no test framework exists yet and your change involves non-trivial logic (crypto, expiry date math, notification dispatch), set one up:

```bash
npm install -D vitest @vitejs/plugin-react
```

Add a `test` script to `package.json` and write tests alongside the module (e.g. `src/lib/crypto.test.ts`). Flag this addition in your PR description since it changes the toolchain for everyone.

### 4.5 Database changes

If your change requires a schema change, add a new numbered migration file under `supabase/migrations/` (don't edit existing migration files). Test it against your local/dev Supabase project before submitting:

```bash
# via Supabase CLI, if installed
supabase db push
```

Never run destructive migrations against production without explicit confirmation — flag this in the PR.

---

## 5. Commit

Stage only the files relevant to your change:

```bash
git add src/lib/crypto.ts src/lib/types/tenants.ts
git status   # double check nothing unintended is staged
```

Write clear commit messages:

```bash
git commit -m "Add AES-256-GCM encryption for tenant PII"
```

Guidelines:
- Present tense, imperative mood ("Add", "Fix", "Update" — not "Added" or "Adds").
- One logical change per commit where practical.
- Don't commit `.env.local`, `node_modules`, `.next`, or any file containing secrets.

---

## 6. Push and Open a Pull Request

```bash
git push -u origin feat/tenant-management
```

Create the PR:

```bash
gh pr create --base main --title "Add tenant management with PII encryption" --body "$(cat <<'EOF'
## Summary
- Adds encrypted tenant CRUD (name/email/phone via AES-256-GCM)
- Links active tenant deposit deadline to deposit_protection compliance item

## Testing
- npm run type-check / lint / build all pass
- Manually created, edited, and deleted a tenant against local Supabase
- Verified name_encrypted/email_encrypted contain ciphertext, not plaintext
- Verified RLS blocks cross-org access with a second test account

## Notes
- No automated tests added (none exist in repo yet)
EOF
)"
```

If `gh` isn't set up, open the PR from the GitHub web UI after pushing.

PR guidelines:
- Title under ~70 characters.
- Description covers what changed, how it was tested, and anything left out or deliberately deferred.
- Keep the PR focused — one feature or fix per PR.

---

## 7. CI and Review

Pushing triggers `.github/workflows/ci.yml`, which runs on `ubuntu-latest` with Node 20:

1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run build`

All four must pass (green check) before merge. If CI fails, reproduce locally with the same commands and fix before pushing again.

Address review comments with new commits on the same branch (don't force-push over review history unless asked).

---

## 8. Merge

- Squash or merge per repo convention (default: squash merge via GitHub UI to keep `main` history clean).
- Delete the branch after merge (GitHub does this automatically if configured).
- Never merge your own PR without review unless it's a trivial docs/typo fix and you've been explicitly told that's acceptable.
- Never push directly to `main`.

```bash
git checkout main
git pull origin main
git branch -d feat/tenant-management   # clean up local branch
```

---

## 9. Post-Merge

- If the change affects environment variables, update the deployment platform (Vercel) with any new variables — this is a production change, confirm with the project owner before modifying live env vars.
- If the change affects the database schema, confirm the migration has been applied to the production Supabase project.
- Watch the Vercel deployment for the merged build to confirm it goes live cleanly.

---

## Quick Reference

| Step | Command |
|------|---------|
| Sync main | `git checkout main && git pull` |
| New branch | `git checkout -b feat/my-change` |
| Type check | `npm run type-check` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Run dev server | `npm run dev` |
| Push branch | `git push -u origin feat/my-change` |
| Open PR | `gh pr create` |

See also:
- `docs/contributing/testing.md` — testing approach in more detail
- `docs/contributing/local-development.md` — running the app and Supabase locally
- `docs/contributing/pull-requests.md` — PR and review conventions
