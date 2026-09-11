# Security policy

## Reporting a vulnerability

Open a **private** security advisory:
<https://github.com/armaanawesome/read-receipts/security/advisories/new>

Please do not open a public issue for anything that affects player data.

You will get a first response within **72 hours**. That number is not
decorative: GDPR Art. 33 gives 72 hours from *becoming aware* of a personal data
breach to notify the supervisory authority, and a report that sits unread is the
usual reason that clock is missed.

If you would rather not use GitHub, the contact address in `PRIVACY.md` reaches
the same person.

## What is in scope

The app holds very little, and knowing what is worth your time is half of it:

| Data | Where | Why it matters |
|---|---|---|
| Email address | Supabase `auth.users` | The only directly identifying field in the system |
| Progress per case | Supabase `public.case_progress` | Message ids and case ids. Low sensitivity, but still personal data tied to an account |
| Session token | Device, AsyncStorage | App-private, unencrypted. See the note in `src/auth/client.ts` |

In scope: anything that reads or writes another player's rows, anything that
lets an unauthenticated caller reach the database, authentication bypass,
account takeover, and anything that lets a caller delete an account other than
their own.

Particularly welcome: attacks on
`supabase/functions/delete-account/index.ts`. It runs with the service role, so
a flaw there is the highest-value bug in this repository. It takes the user id
from the verified JWT and never from the request — if you find a path where that
is not true, that is a critical finding.

## What is not

- The RevenueCat Test Store key and the Supabase anon key are **published on
  purpose**. Every `EXPO_PUBLIC_*` value is extractable from any build. The anon
  key carries no authority of its own; row-level security decides what it can
  reach. Finding one in a bundle is not a vulnerability. Finding one that
  bypasses RLS very much is.
- Reading the case scripts. The repository is public. They are readable, they
  are proprietary (`CONTENT-LICENSE`), and neither of those is a security bug.
- Progress tampering by the account's own owner. A player editing their own save
  is playing their own game.

## If a breach happens

The drill is in `docs/DATA-PROCESSING.md`: the 72-hour clock, who has to be
told, and what the notification has to contain. It is written down because
nobody composes that from scratch on the day.

## Thanks

There is no bounty — this is a student project with no revenue. Credit in the
release notes, gladly, and a genuinely fast response.
