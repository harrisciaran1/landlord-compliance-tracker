# Pull Requests

Conventions for submitting and reviewing changes.

---

## Branching

- Never commit directly to `main`. It's the deployed branch (Vercel deploys from it).
- Branch off an up-to-date `main`:
  ```bash
  git checkout main && git pull origin main
  git checkout -b feat/short-description
  ```
- Naming: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/` + short kebab-case description.
  - `feat/tenant-management`
  - `fix/snooze-route-typo`
  - `docs/contributing-guide`

---

## Before Opening a PR

Run locally and confirm all pass:

```bash
npm run lint
npm run type-check
npm run build
```

Plus any relevant automated tests (`npm test`, if configured — see `testing.md`) and manual testing of the affected flow.

---

## Opening the PR

```bash
git push -u origin feat/short-description
gh pr create --base main
```

**Title:** under ~70 characters, imperative mood — `Add tenant management with PII encryption`, not `Added tenant stuff`.

**Description template:**

```markdown
## Summary
- What changed and why, as bullet points

## Testing
- What you ran (lint/type-check/build/tests)
- What you manually verified
- Any scenarios intentionally not covered

## Notes
- Anything a reviewer should know: migrations included, env vars added,
  follow-up work deferred, etc.
```

Keep each PR focused on one feature or fix. If you notice unrelated issues while working, note them for a follow-up PR rather than bundling them in.

---

## Secrets and Sensitive Files

Before pushing, double check you haven't staged:

- `.env.local` or any `.env*` file with real values
- Files containing API keys, service role keys, or the encryption key
- Database dumps or exports containing real tenant data

```bash
git diff --staged --name-only   # review before committing
```

If a secret is committed accidentally, do not just delete it in a new commit — the old value is still in history. Rotate the credential immediately and flag it so history can be cleaned up if needed.

---

## CI

Every push to a PR branch triggers `.github/workflows/ci.yml`:

```
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

All must be green before merge. If CI fails, reproduce the exact failing command locally, fix, and push a new commit — don't force-push over review history unless a reviewer asks for it.

---

## Review

- Address feedback with new commits on the same branch.
- Reply to comments explaining what changed, especially if you didn't take the suggestion as-is.
- Migrations, RLS policy changes, auth changes, and anything touching production data or encryption deserve extra scrutiny — call these out explicitly in the PR description so reviewers know to look closely.

---

## Merging

- Default: squash merge via the GitHub UI, keeping `main` history one commit per PR.
- Delete the branch after merge.
- Don't merge your own PR without at least one review, except for trivial fixes (typos, docs) where you've been told self-merge is fine.

---

## After Merge

- Confirm the Vercel deployment for the merged commit builds and deploys cleanly.
- If the PR added new environment variables, add them to Vercel's production environment (this is a production change — confirm with the project owner before touching live env vars).
- If the PR added a Supabase migration, confirm it's been applied to the production project.
