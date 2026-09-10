# Orientation

You are joining a project that is about three weeks from its deadline. This
page is the shortest path to being useful. It is written to be read once,
start to finish, in about ten minutes.

The README covers what the game is, how the code is arranged, and the working
rules. This page covers the things you only learn by having been here: what is
already decided, what is still open, and what will confuse you on day one.

---

## The deadline is real

Submission closes **2026-09-30, 23:45 PDT**. We submit on **2026-09-28**, not
the 30th. It is 2026-09-10 today.

The prize is the RevenueCat Shipaton **Next Gen** (student) award. That
category needs a two-minute video and an open-source repo. It does **not**
need an App Store listing, which is the single fact that makes this build
affordable — no paid Apple or Google developer account anywhere in the
pipeline.

There is one hard eligibility requirement: the RevenueCat SDK must power at
least one real in-app purchase. **A purchase completed on a device on
2026-09-10.** That box is ticked. Do not break it.

---

## The one loop

Everything in the game is this, and it is worth holding in your head before
you read any code:

```
read a thread
  -> long-press a message
     -> put a statement on the record        (a typed Claim)
        -> pin two claims on the board
           -> COMPARE                        (checkContradiction)
              -> contradiction confirmed     (a locked thread unlocks)
                 -> accuse
```

A **claim** is a typed assertion attached to a message: this person was at
this place, in this window, and this person said so. `checkContradiction` in
`src/engine/` is a pure function over two claims. It returns why they do not
contradict as often as it returns that they do — different people, different
times, same place under two names — and that explanation is what turns a wrong
guess into a lesson instead of a dead end.

Nothing outside `src/engine/` decides whether anything contradicts anything.
If you find yourself writing that logic in a screen, stop.

---

## What is done, and what is not

Done and seen working on a device: the whole loop above, the evidence board,
the accusation screen, the paywall, a completed purchase, sign-in and
cross-device sync, autosave and resume, the landing and onboarding flow, and
all sixteen case packs in five languages.

Not done, and honest about it:

| Thing | State |
|---|---|
| Audio | 22 files, all synthesised. Structurally verified. **No human has ever heard them.** Android specifically, because the bug was an Android audio-session flag. Oldest unverified thing in the project. |
| Android on a handset | The APK builds. Nobody has installed it. |
| The four translations | Complete for all 16 packs. **No native speaker has read a word of it.** |
| Screenshots, video, APK | Not started. All three need a physical device, so none can be done from the build machine. |
| OneSignal push | Zero code. Deliberately cut. Not a dependency — ignore the `.env.example` placeholder. |
| Two case covers | `sunday-service` and `the-reunion` are owed. Blocked on design credits. |

---

## Four things that will confuse you

**1. The Release build cannot open twelve of the sixteen cases.** This is not
a bug and please do not "fix" it. A RevenueCat Test Store key only works in a
Debug build — the SDK checks the `test_` prefix at `configure()` and
*terminates the app* if it sees one in Release. So `src/entitlements/keyPolicy.ts`
decides before the SDK is ever touched: in a Release build it returns
`disabled`, purchases stay off, and the twelve paid cases resolve to blocked.
The four free ones (`tutorial`, `the-lighthouse`, `the-night-round`,
`the-understudy`) play normally. The home grid still draws all sixteen tiles
either way.

Which build you want depends on what you are checking:

```bash
npm run build:play       # Release. Fast, standalone, no Metro. 4 free cases.
npm run build:purchase   # Debug. All 16 cases + purchases. Needs Metro:
                         #   npx expo start --tunnel --dev-client
```

**The Debug build lags.** That is the profile, not the code. Never judge how
the app feels on it — a Debug build once went out as the one to judge speed on
and cost a round of false bug reports.

**2. The entitlement identifier is a security boundary.** It is `all_cases`,
and it must match the RevenueCat dashboard character for character. Get it
wrong and nothing throws: the purchase succeeds, the receipt is valid, and the
player pays for nothing with no error on any screen. The full story is in the
docstring in `src/entitlements/ids.ts`. `diagnoseEntitlements()` is the only
thing that proves what the dashboard actually grants.

**3. A green suite is not a playthrough.** `./check.cmd` runs 4935 tests. They
prove no case is unsolvable, no thread unreachable, no contradiction undeclared
and no translation missing an id. They prove nothing about whether a case is
enjoyable, whether a screen looks right, or whether a purchase completes.

Every content defect found so far was found by a person reading for sense —
stale character names, three shapes of player-gender leak, a place name spoken
nowhere. None of them by the suite.

**4. The player has no gender, age or face.** `playerNeutral.test.ts` guards
the English, because the English is what forces a translator's hand: one
`You are Ivy's godson` made three languages gender a person the game keeps
blank, and it shipped through fifteen packs because in English it reads
perfectly naturally. Read that test's `WHAT THIS CANNOT SEE` block before you
trust it — it is blind to the player in the third person.

---

## Which document answers what

| Question | File |
|---|---|
| What is this, how is it built, how do I run it | `README.md` |
| How do we work — the rules that have teeth | `AGENTS.md` |
| What happened, what is open, why a decision was made | `HANDOFF.md` |
| Why the build pipeline is shaped this way | `docs/BUILDING.md` |
| Threat model, and why `npm audit fix` is forbidden here | `docs/SECURITY.md` |
| RevenueCat dashboard setup | `docs/REVENUECAT-SETUP.md` |
| Supabase schema, RLS, and how it was verified | `docs/SUPABASE.md` |
| Every case written out as the player receives it | `docs/storybook.md` |
| Why no two cases share the same shape of lie | `docs/pack-ledger.md` |

`HANDOFF.md` is 1,600 lines because it is a running log, not a manual. Read
the section you need. Its section 7 series is chronological — newest work is
not at the bottom.

One warning about it, which the file makes about itself: **treat any number in
a handoff as a claim to re-check, not a fact.** The test count in there has
been wrong twice. A number in a document does not fail a build.

---

## Where to start

Read `docs/storybook.md` for one case — `the-lighthouse` is free and is Pack 1
— so you know what the thing you are building actually feels like to receive.
Then `src/engine/contradiction.ts`, 140 lines that are the whole game.

Then run it:

```bash
npm install
cp .env.example .env      # a RevenueCat Test Store key is optional
./check.cmd               # typecheck + 4935 tests, plain Node, ~25s
```

If `check.cmd` is green you have a working checkout. If it is not, say so
before changing anything — the suite has been green continuously and a red one
means something real.
