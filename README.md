# Read Receipts

A murder mystery told entirely through text threads. You have the victim's
phone. You win only by pinning two messages that can't both be true, and
proving it.

No dialogue trees, no inventory, no gut-feeling "who did it" button. The
accusation screen is gated by a rules engine that checks your evidence, not
your vibes.

Built for the **RevenueCat Shipaton 2026, Next Gen award**.

<!--
  PLACEHOLDER: animated GIF of the COMPARE interaction (~10s loop).
  Pin two claims on the evidence board, tap COMPARE, watch the connector line
  and the revelation type out. Task 18 in HANDOFF.md. Not recorded yet.
-->
> `[ GIF: the COMPARE interaction (not recorded yet) ]`

---

## What makes it different

Most mystery games script the "aha" moment: tap the right dialogue option,
watch a cutscene. Here the aha moment is computed. Every message that matters
emits a typed **claim** ("Nadia was at the studio, 21:40-22:20"), and a pure
function decides whether any two claims can both be true:

```ts
// src/engine/contradiction.ts
checkContradiction(ctx, claimA, claimB)
// → { ok: true,  reason: "One person, two places, same moment." }
// → { ok: false, reason: "These describe different times." }
// → { ok: false, reason: "These are about different people." }
```

When a player pins the wrong pair, the game says why: different people,
different times, same area under a different name. A wrong guess becomes a
lesson instead of a dead end. It's also the clearest evidence on screen that
a real engine is judging the pairing, because the explanation changes with
the claims, not with a script.

There's a story-level layer on top of the mechanical one, too. A background
figure phones the killer in every one of the 15 cases. He only ever
telephones, about ninety seconds a call, so no case file contains a single
word he wrote. The only trace he leaves is a habit: an odd follow-up
question, a phrase only one profession uses, that surfaces in the
confrontation. He has told the truth on every call. Except once, in Pack 1.

## Architecture

`src/engine/` is pure TypeScript. It imports nothing from React Native, Expo,
or React, which is what lets the whole rules layer run as a plain Node test
suite in milliseconds instead of a simulator. The boundary isn't a comment or
a convention; `src/engine/boundary.test.ts` reads every source file under
`src/engine/` and `content/` and fails the build if any of them import a
native module.

```mermaid
flowchart LR
    subgraph pure["pure TypeScript, zero React Native imports (enforced by boundary.test.ts)"]
        content["content/cases/\n16 case scripts"] --> engine["src/engine/\ncontradiction · anchor · motive\nconfrontation · accusation"]
    end
    engine --> state["src/state/\nZustand store"]
    rc["src/entitlements/\nRevenueCat Test Store"] --> state
    state --> app["app/\nexpo-router screens"]
```

`content/` holds data, never logic. A case script is validated at import time
by `loadCase()` (Zod schema plus a manual referential-integrity pass), so a
broken case fails at startup with a specific error instead of failing a
player mid-story. `app/` is thin routing over the store; it does not decide
whether anything contradicts anything.

The accusation screen checks proof before identity: `evaluateAccusation`
first counts how many of the case's required contradictions are confirmed,
and only names a suspect right or wrong once that count is complete.
Otherwise a player could brute-force the killer by tapping every suspect in
turn.

## The sixteen packs

16 packs — a tutorial plus 15 cases — 795 messages, roughly 20,400 words in
the messages alone, before briefings and confessions. Each case ships with its
own test file; a shared contract in `content/cases/caseContract.ts` runs an
exhaustive pairwise scan
of every claim in every case and fails if two claims contradict without the
author declaring it. `docs/pack-ledger.md` is the uniqueness contract behind
them: no two packs share the same shape of lie, and it's checked mechanically
in `content/cases/ledger.test.ts`.

The tutorial and Packs 1–3 are free. The rest unlock through the RevenueCat
entitlement below.

| # | Title | Hook |
|---|---|---|
| 1 | The Lighthouse `FREE` | Your aunt kept the light at Ardnoe Point. They're calling it a fall. You have her phone, and everyone still has their story straight. |
| 2 | The Understudy `FREE` | A lead actress dies in a locked dressing room on press night. One key exists, and two people say they had it. |
| 3 | The Night Round `FREE` | A signature in the night book says somebody looked in on her at eleven. Nobody did. |
| 4 | Deep Field | Six people, four months of darkness, and nobody can leave. The alibi is a timestamp, and the timestamp is in the wrong clock. |
| 5 | The Wake | Forty-one people were in the house and they all tell the same story, word for word. It was built to protect somebody who did not do it. |
| 6 | The Long Course | Eight people in the same kit, on the water, for twenty-two minutes. The photographs prove eight were in that boat. They cannot prove which eight. |
| 7 | The Bothy | Five people walked out of a whiteout into one room, hours apart. They agree on everything except the order. |
| 8 | Sunday Service | The register says there was a wedding that August. The man who reroofed the church says there was no roof on it. |
| 9 | The Cut | A narrowboat does three miles an hour, and everybody on the cut can do that arithmetic. Nobody thought to ask whether he took the boat. |
| 10 | Open Mic | His alibi is on video. Same shirt, same five minutes, same laugh in the same place. It's from the Tuesday before. |
| 11 | The Allotments | Everybody on that site knows whose fork it is. Nobody asked whose shed it had been in for ten days. |
| 12 | The Helpline | Every call is logged by hand and nobody has ever had a reason to check one. His alibi is ninety minutes on a line that was never in use. |
| 13 | The Reunion | Ninety people can tell you who they were standing with. Not one of them can tell you what time it was. |
| 14 | The Night Ferry | He can tell you exactly what he did while the ship was alongside at Kirkwall. The ship never called at Kirkwall. |
| 15 | The Listener | He has told you the truth for fifteen cases. He lied exactly once, to somebody else, and you wrote it down without knowing what it was. |

Every case is written out in full, as delivered in-game, in
[`docs/storybook.md`](docs/storybook.md), the fastest way to read the content
without installing anything.

## RevenueCat integration

The game is free through Pack 3. Packs 4–15 unlock through one non-consumable
entitlement, sold through RevenueCat's **Test Store**, which runs a real
purchase flow with no paid Apple or Google developer account. That's what
makes the Next Gen category reachable without a store listing.

- `src/entitlements/revenuecat.ts`: configure, fetch the offering, purchase,
  restore. Purchase outcomes are a discriminated union
  (`purchased` / `cancelled` / `failed`) rather than a boolean, so a
  cancelled sheet is never confused with a failed transaction in the UI.
- `src/entitlements/ids.ts`: the entitlement identifier, `all_cases`, kept in
  its own zero-import module so case content can reference it without pulling
  `react-native-purchases` into the engine's test suite. The retired
  `case_pack_1` is still honoured, because deleting an id would revoke access
  from anyone who already bought under it.
- `src/entitlements/keyPolicy.ts`: decides whether the SDK gets configured at
  all. A Test Store key only works in a Debug build. This module keeps that
  key from ever reaching a Release build, where the SDK would otherwise show
  a "Wrong API Key" alert and terminate the app.
- `src/entitlements/diagnosis.ts`: reads a customer's full entitlement record
  and states in plain language why a purchase did or didn't unlock content,
  for the case where the receipt is valid but nothing changed.

**For judges:** no payment method or developer account is needed to see the
paid content. On the paywall, completing the Test Store purchase sheet
unlocks Packs 4–15 immediately.

## Running it

```bash
git clone https://github.com/armaanawesome/read-receipts.git
cd read-receipts
npm install
cp .env.example .env
```

Get a free RevenueCat Test Store key at app.revenuecat.com → **Apps and
providers → Test Store**, and put it in `.env` as
`EXPO_PUBLIC_RC_TEST_STORE_KEY`. The app runs with purchases disabled if you
skip this step; everything else still works.

```bash
./check.cmd       # typecheck + the whole suite. Plain Node, no simulator.
```

Run `check.cmd` rather than `npx vitest` directly. It `cd`s to the project root
first, and vitest launched from a parent directory collects unrelated projects
and resolves `tsc` to a squatter package of the same name. Both failures look
alarming and neither is real.

To run the app itself, this project builds on EAS rather than a local
Android SDK or Xcode. Two build profiles do two different jobs:

| Profile | Build type | What it's for |
|---|---|---|
| `preview` | Release | Play the game. Installs standalone, no Metro needed. Purchases are off; a Test Store key cannot run in a Release build. |
| `development` | Debug | Demo a real purchase. Needs Metro running (`expo start --dev-client`). |

```bash
npm run build:play           # iOS, Release  - play the game
npm run build:play:android   # Android, Release
npm run build:purchase       # iOS, Debug    - demo a real purchase
```

The profile is in the script name on purpose. Choosing it by hand on the
command line is how a Debug build once went out as the one to judge the speed
on.

See [`docs/BUILDING.md`](docs/BUILDING.md) for the full build pipeline,
including why those two profiles exist and the failure mode they were built
to avoid.

[`docs/SECURITY.md`](docs/SECURITY.md) records the threat model and the
adversarial review — including why `npm audit` reports vulnerabilities that must
not be "fixed", since `npm audit fix --force` would roll Expo back eleven major
versions.

## Testing

```
./check.cmd
 Test Files  140 passed (140)
      Tests  4935 passed (4935)
```

Coverage on the engine and state layers (`src/engine/`, `src/state/`) is
94.8% statements / 91.9% branches. Every case pack, the contradiction
validator, the accusation gate, and the entitlement key policy each have
their own test file; the full list is under `src/engine/*.test.ts`,
`src/entitlements/*.test.ts`, and `content/cases/*.test.ts`.

## Working on this

Contributing? Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before your first
commit — it is short, and the part about who owns what you write is the part
that is expensive to skip.

New to the project? Read [`docs/ORIENTATION.md`](docs/ORIENTATION.md) first —
ten minutes, and it covers what is decided, what is still open, and the four
things that will otherwise confuse you. This section is the reference you come
back to.

Where things live, and the rule that holds each one in place:

| Path | What it is | The rule |
|---|---|---|
| `src/engine/` | the rules: contradiction, anchor, motive, accusation | Pure TypeScript. Importing react-native, expo or react here fails `boundary.test.ts`. |
| `content/cases/` | the 16 case scripts | Data, never logic. Validated at import by `loadCase()`, so a broken case fails at startup rather than mid-story. |
| `src/state/` | the Zustand store | The only mutable game state. |
| `app/` | expo-router screens | Thin routing. Decides nothing about the mystery. |
| `src/i18n/strings.ts` | the UI string catalogue | `EN` is the source of truth; es, fr, de and pt-BR are `Partial<Catalogue>`. |
| `src/ui/` | components | `.tsx` cannot be unit-tested here (vitest cannot parse react-native), so component invariants are asserted by reading the source as text — see `bubbleMemo.test.ts` for the pattern. |

Four things that have already cost somebody a day. They are tests now, so you
will meet them as a red suite rather than as advice:

- **No visible English outside the catalogue.** `hardcodedText.test.ts` reads
  every screen and fails on a sentence sitting inside a `<Text>` that isn't a
  `t()` call. It shipped one anyway, because the pattern required a capital
  first letter and the string was lowercase.
- **An English fix does not imply a translation fix.** Some locales don't have
  the problem the English had. Mirroring an edit into all four broke a voice
  test once. Check first.
- **A green suite is not a playthrough.** It proves no case is unsolvable and no
  thread unreachable. It proves nothing about whether a case is enjoyable or a
  purchase completes. Every content defect so far was found by reading.
- **Scope commits to explicit paths.** Never `git add -A`; it has swept a
  half-written file into a commit here.

`AGENTS.md` is the long form of this, and the same rules apply to a person.
`HANDOFF.md` is the running project log — current state, open bugs, hard-won
build constraints, what's still owed. It is long because it is a log; read the
section you need, not the whole file.

## Build

<!-- PLACEHOLDER: Codemagic release APK link (Task 19 in HANDOFF.md). Not built yet, EAS-only for now. -->
`[ Downloadable APK: not yet built. See docs/BUILDING.md for EAS instructions in the meantime. ]`

## Screenshots

<!-- PLACEHOLDER: 5 screenshots at 1179×2556, no device frame (Devpost requirement). Not captured yet. -->
`[ Screenshots: not captured yet ]`

## Tech stack

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript 6 (strict,
`noUncheckedIndexedAccess`) · expo-router · Zustand · Zod ·
react-native-reanimated 4 · react-native-purchases · Vitest.

## Licence

Split, on purpose.

| What | Licence |
|---|---|
| **Code** — `src/`, `app/`, `supabase/`, `tools/`, tests, config | [MIT](LICENSE). Take it. |
| **The game** — `content/cases/`, `assets/`, `docs/storybook.*` | [Proprietary](CONTENT-LICENSE). All rights reserved. |

The engine is worth more shared than hoarded. The cases are the product. A
single MIT licence over both granted the world the right to sell the game,
which was a drafting mistake rather than a decision — see
[`docs/LEGAL-REVIEW.md`](docs/LEGAL-REVIEW.md), Count 1, including what the
change cannot undo.

Third-party notice text is in
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md), generated from the
installed tree. Asset provenance is in
[`assets/ASSET-LICENCES.md`](assets/ASSET-LICENCES.md).

## Legal

An adversarial legal review of the whole app — sixteen counts, worst first,
each citing the file it is about — is in
[`docs/LEGAL-REVIEW.md`](docs/LEGAL-REVIEW.md). It is written as the brief
opposing counsel would file, because a friendly audit finds friendly problems.

| Document | What it is for |
|---|---|
| [`PRIVACY.md`](PRIVACY.md) | What the app collects, and every right you have over it |
| [`TERMS.md`](TERMS.md) | Licence to play, refunds, liability |
| [`SECURITY.md`](SECURITY.md) | How to report a vulnerability, and what is in scope |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Sign-off, and what licence your contribution carries |
| [`docs/DATA-PROCESSING.md`](docs/DATA-PROCESSING.md) | Art. 30 record, processors, the 72-hour breach drill |
| [`docs/STORE-COMPLIANCE.md`](docs/STORE-COMPLIANCE.md) | The answers to give Apple and Google, decided in advance |

Short version of the privacy policy: no ads, no analytics, no tracking SDKs,
nothing sold. The game plays fully without an account. With one, a server holds
your email address and which cases you have solved, and you can delete both
from inside the app.
