# Supabase — accounts and progress sync

What the app expects a Supabase project to look like. **Nothing here has been run
against a live project.** No project is provisioned yet, so treat this as the
spec to build from, not a record of what exists.

Accounts are **optional**. The game is fully playable signed out on local saves,
and every case is reachable without an account. Sync is the only thing an
account buys, so nothing below may become a requirement to play.

---

## 1. Environment

Two variables, read in `src/auth/config.ts`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<the anon / publishable key>
```

**Only the anon key.** `EXPO_PUBLIC_*` values are inlined into the JavaScript
bundle at build time and are extractable from any shipped app — this project has
already been bitten once by assuming otherwise. The `service_role` key bypasses
row-level security entirely; if it ever reaches a client bundle, every player can
read and rewrite every other player's rows. `decideSupabaseConfig` refuses a key
that looks like a service key rather than letting it through.

If either variable is missing the app does **not** crash. `getSupabase()` returns
`{ kind: 'unavailable' }`, sign-in reports that accounts are unavailable, and the
game carries on with local saves. That degradation is deliberate: this project
has already shipped one launch crash caused by configuring a client with a bad
key, so an absent or wrong key must never take the app down on startup.

## 2. Auth settings

Email/password only. **Do not enable Google or Apple.** Apple's App Store
guideline 4.8 requires Sign in with Apple wherever a third-party social login is
offered, and that needs a paid Apple Developer membership this project does not
have. Adding Google would make the iOS build unshippable.

In **Authentication → Providers**: leave Email enabled, disable everything else.

In **Authentication → Sign In / Providers → Email**, decide on confirmation:

- **Confirm email ON** (default) — the player must click a link before the
  session works. Safer, but they cannot sync until they leave the app and come
  back, which is a poor first run and a poor demo.
- **Confirm email OFF** — sign-up returns a usable session immediately.

For the hackathon build, **off** is the honest choice: the account exists only to
carry save data between two phones, there is nothing to abuse, and a demo that
requires an inbox round trip is a demo that fails on stage. Turn it on before any
real public release.

## 3. Schema

One table. Column names are snake_case because that is Postgres convention;
`src/auth/sync.ts` maps them to the app's camelCase blob and then validates the
result through `saveBlobSchema` — the *same* schema local saves use — so a row
written by a newer build or hand-edited in the dashboard is never trusted blind.

```sql
create table public.case_progress (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  case_id     text        not null,
  read_message_ids            text[] not null default '{}',
  confirmed_contradiction_ids text[] not null default '{}',
  last_thread_id  text,
  last_message_id text,
  updated_at  timestamptz not null default now(),

  -- Load-bearing. sync.ts upserts with { onConflict: 'user_id,case_id' }, and
  -- without this exact composite key every sync inserts duplicate rows instead
  -- of updating, so a player accumulates one row per sync per case.
  primary key (user_id, case_id)
);
```

Notes on the column choices:

- **`text[]`, not `jsonb`.** The client sends real JavaScript arrays of ids and
  reads them back the same way. `jsonb` would work but would put a second
  encoding step between two things that are already arrays on both sides.
- **`on delete cascade`** — deleting the auth user takes their progress with it,
  which is what a player asking to delete their account means.
- **`last_thread_id` / `last_message_id` are nullable.** A save written before
  the resume feature existed has neither, and the local schema treats them as
  optional for exactly that reason: making them required would have deleted
  every existing playthrough on upgrade as though it were corrupt.
- **No `id` surrogate key.** The natural key is the pair, and adding a serial
  would let two rows exist for one (user, case).

## 4. Row-level security

> **These policies are now a runnable migration:**
> [`supabase/migrations/0001_case_progress.sql`](../supabase/migrations/0001_case_progress.sql).
> That file is the authority — apply it rather than copying SQL out of this
> document. It also adds size limits this section never had: RLS decides *whose*
> rows a player may write, not *how much*, and an account holder can call the
> REST API directly. See `docs/SECURITY.md` finding 4.

**This is the part that matters.** Without it, the anon key — which ships in the
bundle and is readable by anyone — grants every player read and write access to
every other player's rows.

```sql
alter table public.case_progress enable row level security;

create policy "read own progress"
  on public.case_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own progress"
  on public.case_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "update own progress"
  on public.case_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete own progress"
  on public.case_progress for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

Two details in there are not stylistic, and both come from Supabase's own
Postgres guidance:

**`(select auth.uid())`, not bare `auth.uid()`.** Wrapped in a subselect,
Postgres evaluates it once as an InitPlan and reuses the result. Bare, it is
re-evaluated **for every row scanned**. On a table that grows with players ×
cases that is the difference between one function call and thousands per query.

**`to authenticated` on every policy.** Without a `TO` clause a policy is also
evaluated for the `anon` role, which can never satisfy it — wasted work on every
anonymous request. It also states the access model out loud. Note that `TO
authenticated` *alone* would be authentication without authorisation: it checks
the role, not the row. It is only safe here because it is paired with the
ownership predicate in `using` / `with check`.

Do not reach for `auth.role() = 'authenticated'` instead — Supabase has
deprecated it, and it breaks silently if anonymous sign-ins are ever enabled,
because anonymous users carry the `authenticated` Postgres role and would pass.

Both `using` and `with check` are needed on update: `using` decides which rows
you may target, `with check` decides what you may leave behind. With only
`using`, a player could take one of their own rows and rewrite its `user_id` to
somebody else's.

The upsert in `sync.ts` needs **insert and update** policies, because an upsert
is whichever one the row turns out to need.

`sync.ts` also filters `.eq('user_id', user.id)` on read even though RLS already
does that. It is redundant on purpose — it costs nothing and it states at the
call site that the query is per-user, so the intent survives someone later
reading the query without knowing the policies exist.

### Indexes

None needed for the access path. Every query filters on `user_id`, and the
composite primary key `(user_id, case_id)` has it as the leading column, so the
PK index already serves both the RLS predicate and `sync.ts`'s
`.eq('user_id', …)`. Adding a separate index on `user_id` would be a second copy
of the same thing for Postgres to maintain on every write.

### Verified against a live project — 2026-08-12

Run end to end with two real accounts on one machine, which is the check a
single account can never give you:

| | |
|---|---|
| A writes its own row | `201` |
| A reads it back | 1 row |
| **B reads** | **`[]`** — B cannot see A's progress |
| Anonymous reads | `[]` |
| **B inserts a row with A's `user_id`** | **`403`, "new row violates row-level security policy"** |
| A deletes its own row | `204` |

The fifth line is the one worth keeping. It proves `with check` is doing its job:
without it, B could have written a row and assigned it to A.

Note the legacy `anon` JWT key was used. A `sb_publishable_…` key was rejected
with "Invalid API key" against this project; the legacy keys keep working and
`src/auth/config.ts` accepts either, so this is not blocking. Supabase deprecates
legacy keys at the end of 2026, so it is worth revisiting before then.

## 4a. Google and Apple sign-in

The buttons exist in the app (`src/auth/oauth.ts`, `src/ui/AuthProviderButtons.tsx`).
They do nothing until the providers are switched on here, and until then they
say so in the player's language rather than failing silently -- Supabase answers
"Unsupported provider", which `isUnconfigured()` maps to
`auth.provider.unconfigured`.

**Three things, in the dashboard.**

1. **Authentication > URL Configuration > Redirect URLs.** Add:

   ```
   privatetexts://auth/callback
   ```

   Also add the `exp://` form Expo prints when the dev server starts, if you
   want the buttons to work under `dev.cmd` rather than only in a build. They
   are genuinely different addresses; `Linking.createURL` produces whichever
   one is right at runtime, which is why the app does not hardcode either.

2. **Authentication > Providers > Google.** Enable it, then paste a client ID
   and secret from a Google Cloud OAuth 2.0 Web application credential. The
   authorised redirect URI on the Google side is the Supabase callback, NOT the
   app scheme:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   This trips people up every time. Google redirects to Supabase; Supabase
   redirects to the app.

3. **Authentication > Providers > Apple.** Enable it, then supply the Services
   ID, Team ID, Key ID and the `.p8` key from an Apple Developer account. Same
   redirect rule as Google.

   **Apple needs a paid Apple Developer account.** Google does not. If there is
   no Apple account yet, leave Apple switched off: the button is still there,
   it explains itself, and Apple's Guideline 4.8 -- which requires Sign in with
   Apple wherever another third-party sign-in is offered -- only bites at store
   submission, not in a demo.

**Why the flow is PKCE.** `src/auth/client.ts` sets `flowType: 'pkce'`. The
implicit default hands back the access and refresh tokens in the URL fragment
of the redirect, which on a phone means real credentials travelling through the
OS link handler and into logs. PKCE sends a single-use code and keeps the
verifier on the device. Do not change it back.

**Password reset is unaffected.** That flow verifies a six-digit OTP token
(`verifyRecoveryCode`), not a magic link, and OTP verification does not depend
on the flow type.

## 5. Verifying it

Row-level security is the thing most likely to be silently wrong, and a wrong
policy looks exactly like a working one from a single account. Check it with
two:

1. Sign up as A on one device, play a case, sync.
2. Sign up as B on another (or a simulator). Sync.
3. B must see **none** of A's progress. If B sees A's rows, RLS is off or the
   policies did not apply — stop and fix it before shipping.
4. Sign in as A on B's device. A's progress must arrive.

Then the merge behaviour, which is the part that can lose real work:

5. Play case 1 offline on both devices, reading *different* messages on each.
6. Sync both.
7. Both devices must end with the **union** of the two sets. Losing a read
   message is the failure this design exists to prevent — `planSaveSync` in
   `src/state/saveMerge.ts` unions rather than overwrites, and it is unit-tested,
   but this is the end-to-end proof.

## 6. What is not built

- **No profile table.** There is nothing to store beyond the auth user; the
  player has no display name, avatar, or friends in this game.
- **No entitlement sync.** Purchases are RevenueCat's job and RevenueCat already
  restores them per store account. Duplicating that here would create two
  sources of truth about who has paid.
- **No realtime.** Sync is explicit, on sign-in and from settings. A deduction
  game played alone has nothing to push live.
