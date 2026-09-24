# Testing

Current state: **no automated test runner is configured** in this repo (`package.json` has no `test` script, no Jest/Vitest dependency). Verification today relies on type-checking, linting, the production build, and manual testing against the dev server. This document covers what exists now and how to add automated tests when a change needs them.

---

## What Runs Today (and in CI)

These three commands are what `.github/workflows/ci.yml` runs on every push/PR to `main`:

```bash
npm run lint          # ESLint
npx tsc --noEmit      # Type check (npm run type-check does the same)
npm run build         # Next.js production build
```

Run all three before pushing. A change is not done until these pass.

---

## Manual Testing

For any change to a server action, page, or component, manually exercise the flow against `npm run dev`:

1. **Happy path** — the feature works as intended end to end.
2. **Auth boundaries** — log in as a second account in a different org and confirm you cannot see or modify the first org's data (RLS should block this at the database level, but verify the UI/action layer doesn't leak anything first).
3. **Role boundaries** — if the change touches create/update/delete, confirm a `viewer`-role user is blocked (server action should return `{ error }`, not throw an unhandled exception).
4. **Empty/edge states** — missing optional fields, zero results, very long input, invalid dates.

Document what you tested in the PR description (see `pull-requests.md`).

---

## Database-Level Verification

For anything touching `tenants` or other PII-bearing tables:

- Open Supabase Studio → Table Editor → `tenants`.
- Confirm `name_encrypted` / `email_encrypted` / `phone_encrypted` contain base64 ciphertext, not plaintext.
- Confirm decrypting via the app (viewing the tenant in the UI) correctly returns the original plaintext.

For RLS changes, test with two different user accounts in two different orgs and confirm cross-org queries return empty, not an error that could leak existence.

---

## Adding Automated Tests

If your change introduces logic worth covering with unit tests (crypto, date/expiry math, validation, dispatch logic), set up a test runner as part of the change rather than skipping coverage. Vitest is the recommended choice here since it works cleanly with Next.js/TypeScript with minimal config:

```bash
npm install -D vitest
```

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

Add a minimal `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

Place test files next to the module they cover, e.g. `src/lib/crypto.test.ts` for `src/lib/crypto.ts`.

Example (encryption round-trip, matching the design in `week 4/week4-encryption-architecture.md`):

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./crypto";

describe("crypto", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  it("round-trips a plaintext value", () => {
    const ciphertext = encrypt("John Smith");
    expect(ciphertext).not.toBe("John Smith");
    expect(decrypt(ciphertext)).toBe("John Smith");
  });

  it("returns null for null input", () => {
    expect(encrypt(null)).toBeNull();
    expect(decrypt(null)).toBeNull();
  });

  it("throws on tampered ciphertext", () => {
    const ciphertext = encrypt("sensitive")!;
    const tampered = ciphertext.slice(0, -4) + "XXXX";
    expect(() => decrypt(tampered)).toThrow();
  });
});
```

Run it:

```bash
npm test
```

If you add a test runner, update `.github/workflows/ci.yml` to run `npm test` as part of CI, and mention the toolchain change clearly in your PR — it affects everyone who contributes after you.

---

## What Not to Do

- Don't commit real Supabase credentials, API keys, or the encryption key in test fixtures — use fixed dummy values (e.g. `"a".repeat(64)` for a test key) as shown above.
- Don't write tests that hit the real production Supabase project. Use a local Supabase instance (`supabase start`) or mock the client for unit tests.
- Don't skip manual testing just because `npm run build` passed — the build only checks compilation, not runtime correctness.
