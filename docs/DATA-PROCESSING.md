# Data processing record

GDPR Art. 30 requires a controller to keep a record of processing activities.
The exemption for organisations under 250 people does not help here, because it
falls away when processing is regular — and syncing a player's progress is
regular.

This is that record, plus the breach drill, because nobody composes a
notification from scratch on the day they need one.

Companion to `PRIVACY.md`, which is the player-facing version. If the two ever
disagree, `PRIVACY.md` is the promise and this is the plumbing — fix whichever
one is wrong about the code.

---

## 1. Controller

| | |
|---|---|
| Controller | Armaan Ebrahim, trading as an individual |
| Contact | `[FILL IN]` — see `PRIVACY.md` |
| DPO | None. Not required: no large-scale processing, no systematic monitoring, no special category data |
| EU/UK representative | **Not appointed. Decide before an EU launch** — Art. 27 requires one for a controller outside the EU offering goods to people in it, unless the processing is occasional and low-risk. Arguable here; get advice |

## 2. Processing activities

### 2.1 Account and authentication

| | |
|---|---|
| Purpose | Let a player sign in and recover a password |
| Categories of data | Email address; salted password hash; account created and last sign-in timestamps |
| Categories of subject | Players who chose to make an account. 16+ only |
| Legal basis | Art. 6(1)(b), performance of a contract the player asked for |
| Recipients | Supabase (processor) |
| Retention | Life of the account; deleted immediately on request |
| Transfers | See section 3 |

### 2.2 Progress sync

| | |
|---|---|
| Purpose | Carry a player's progress between their own devices |
| Categories of data | Case ids, message ids read, contradiction ids confirmed, solved flag, last position, updated-at timestamp. All in `public.case_progress` |
| Legal basis | Art. 6(1)(b) |
| Recipients | Supabase (processor) |
| Retention | Life of the account. `on delete cascade` from `auth.users`, so account deletion removes it in the same transaction |
| Security | Row-level security restricting every row to its owner — `supabase/migrations/0001_case_progress.sql` |

### 2.3 Purchases

| | |
|---|---|
| Purpose | Know what the player has bought so the app unlocks it |
| Categories of data | An opaque Supabase user UUID, and store receipts. **No email, no name, no payment data** |
| Legal basis | Art. 6(1)(b) |
| Recipients | RevenueCat (processor); Apple and Google (independent controllers as sellers) |
| Retention | RevenueCat's own retention. We hold no local copy |

### 2.4 Things that are NOT processing activities

Recorded because their absence is the point, and someone will eventually ask:
no analytics, no advertising, no profiling, no automated decision-making, no
location, no device identifiers, no crash reporting, no email marketing.

## 3. Processors and transfers

| Processor | Role | Location | Transfer mechanism | DPA |
|---|---|---|---|---|
| Supabase | Database, auth | Project region — **record the region here once chosen** | SCCs + UK Addendum, in their DPA | `supabase.com/legal/dpa` — **confirm accepted** |
| RevenueCat | Entitlements | United States | SCCs + UK Addendum | `revenuecat.com/dpa` — **confirm accepted** |
| Expo / EAS | Builds only. **No player data** | United States | n/a — no personal data | Not a processor of player data |
| Apple / Google | Sellers of record | Global | Their own terms | Independent controllers, not our processors |

**Action before an EU launch:** accept each DPA in writing and note the date
here. A DPA that exists on a vendor's website but was never accepted is not an
Art. 28 contract.

**Choose the Supabase region deliberately.** An EU region removes most of the
transfer question for account data outright. It is a project setting, and it
cannot be changed afterwards without a migration.

## 4. Breach drill

GDPR Art. 33: **72 hours from becoming aware**, not from confirming. The clock
starts at "we have reason to think this happened".

**Hour 0 — contain.** Rotate the Supabase service role key and the anon key.
Revoke sessions if tokens may be exposed. Do not delete logs; they are the
evidence.

**Hour 0–4 — establish scope.** Which table, how many rows, whose. For this app
the worst realistic case is `auth.users` (email addresses) plus `case_progress`.
Write down what you know and what you do not — the notification has a place for
both.

**Hour 4–24 — decide whether it is notifiable.** Notify unless the breach is
"unlikely to result in a risk". Email addresses plus a game history is low risk
but not no risk. If unsure, notify: a needless notification costs an afternoon;
a missed one is a separate infringement on top of the breach.

**Within 72 hours — notify the supervisory authority.** Include: what happened,
categories and approximate number of people and records, contact point, likely
consequences, and measures taken. If you do not have it all, send what you have
and say the rest is to follow. Art. 33(4) expressly allows that.

**Then — tell the players**, if the risk to them is high (Art. 34). Plain
language: what happened, what to do, who to contact. Their email address is the
only route we have, and it is also the thing most likely to have been exposed —
consider a store update note as well.

**Afterwards — write it down.** Art. 33(5) requires a record of *every* breach,
including ones that were not notified, and the reasoning for not notifying.

### Where to notify

- **UK:** ICO, `ico.org.uk/for-organisations/report-a-breach/`
- **EU:** the lead supervisory authority for the main establishment, or each
  affected member state's authority absent one. **Determine which before launch**
- **Brazil:** ANPD
- **US states:** state breach notification laws apply on top, most keyed to
  residents' details. Check the states with affected players

## 5. Review

Re-read this whenever a processor is added, a data category changes, or a new
market opens. Otherwise once a year.

| Date | Change |
|---|---|
| 2026-09-10 | Created. See `docs/LEGAL-REVIEW.md`, Count 13 |
