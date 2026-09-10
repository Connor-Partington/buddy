# Buddy leaderboard backend

Provisioned project: **Buddy**, reference `btfheebiolwadzktxspk`, Sydney (`ap-southeast-2`).

This backend belongs in a dedicated **Free-plan** Supabase project. Do not deploy it into Love Battery. Its database is isolated, but organization egress allowances are shared.

## Deployment

1. Create Buddy with Data API enabled and automatic table exposure disabled.
2. Run the SQL files in `migrations/` in filename order in its SQL Editor. They are idempotent and do not delete existing data.
3. Put the project URL and **publishable** key in `src/leaderboard.ts` (`leaderboardBackend`). Never put a secret/service-role key, database password, or personal access token in the extension.
4. Compile and test. No Edge Function, Realtime subscription, Storage bucket or Supabase Auth account is needed.

`buddy.leaderboard` uses the native VS Code picker. It uploads only after joining. Guests can explicitly view rankings through the read-only `buddy_leaderboard_public` RPC without an identity or token. Guest responses share the monthly admission budget and are cached locally for six hours; there is no per-identity server throttle for anonymous reads. A random 256-bit capability in SecretStorage authorizes that installation's operations. The database hashes it with SHA-256; API responses never include tokens/hashes. Nicknames are not unique identities. Reinstalling without the stored secret creates a new identity; there is no recovery or cross-device login in this version.

Tables are in an unexposed private schema, with RLS and revoked client privileges. Member operations use the narrowly scoped `buddy_leaderboard` RPC, running with an empty search path. Its shared budget row locks registration, reads and submissions atomically. No client-supplied row identifier can select another user's private record. Initial scores are self-reported; subsequent growth is bounded by elapsed server time. This is not anti-cheat verification.

## Limits and operations

- 100,000 admitted RPC requests per UTC calendar month (includes invalid/rate-limited operations with well-formed tokens).
- 50 registrations per UTC day; at most 5,000 stored entries.
- Each identity: one upload per 24 hours, one leaderboard read per six hours.
- Top 50 plus the caller; bounded nickname length, integer scores, no media downloads.
- Inactive records disappear from rankings after 30 days but remain deletable and count toward the member cap.
- Deletion is permitted even when community sync is paused. The client stops uploads immediately if deletion cannot finish.
- No rolling request logs or unbounded score history in our schema.

Inspect or reduce limits using the SQL Editor:

```sql
select month, requests, request_limit, registration_day, registrations,
       member_limit, enabled from buddy_private.budget;
select count(*) as stored_entries from buddy_private.entries;
-- Pause community sync (privacy deletion remains available):
update buddy_private.budget set enabled = false where id = true;
-- Resume:
update buddy_private.budget set enabled = true where id = true;
```

These are application budgets, **not metered bandwidth caps**. Rejected requests, API infrastructure/logs, malformed requests, deletion requests and other projects still consume resources. Public endpoints can be abused; monitor organization Usage and reduce/disable admission before approaching allowances. Calendar-month admission reset is independent of Supabase billing-cycle reset. Keep the organization on Free to avoid usage charges; do not assume a Pro spend cap covers every cost. Free projects may pause or be restricted.

## Validation

`npm test` covers client consent, tokens, throttling, caching, offline behavior and deletion. For database execution tests, install `@electric-sql/pglite` in a temporary directory and run:

```sh
NODE_PATH=/tmp/buddy-leaderboard-qa/node_modules node scripts/test-leaderboard-sql.cjs
```

This runs a real PostgreSQL-compatible engine locally, covering permissions, rate limits, score bounds, ties, registration capacity, monthly reset and deletion during exhaustion. Use a disposable nickname for production smoke checks and remove its entry afterwards.
