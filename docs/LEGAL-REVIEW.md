# Legal review — Read Receipts

Written 2026-09-10 as an adversarial audit: the brief opposing counsel would
write if they wanted this app off the stores and its revenue disgorged. Every
count cites a file, because a legal risk you cannot point at is a legal risk
nobody fixes.

**This is not legal advice.** It is an engineering document about legal
exposure. Counts 11 and 16 need a qualified adviser in a named jurisdiction;
every other count is fixed in this repo, and the Status line says how.

Severity is about what happens if it is not fixed:

| | Meaning |
|---|---|
| **BLOCKER** | The app cannot lawfully or contractually be listed. |
| **HIGH** | Listed, but exposed to a regulator, a takedown, or a lost claim. |
| **MEDIUM** | Real exposure, low probability or low ceiling. |
| **NOTE** | Flagged for a decision, not a defect. |

---

## Count 1 — The MIT licence gives your competitors the game. BLOCKER

`LICENSE` is the MIT licence. It grants every person who obtains a copy the
right to "use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software". The repository is public and contains
`content/cases/` in full: all sixteen packs, including the twelve behind the
paywall.

Three consequences, in order of what they cost:

1. **A competitor may lawfully sell your game.** Clone, rename, ship. Nothing
   in MIT prevents it and nothing requires them to share revenue.
2. **The paid content is already free.** Anyone who wants the twelve paid
   cases can read them on GitHub without paying. The paywall protects
   convenience, not content.
3. **You cannot fully undo it.** A permissive licence, once published, is
   irrevocable as to copies already distributed. Relicensing changes the
   future; every commit already pushed stays MIT in the hands of anyone who
   took it.

The codebase knew. `src/settings/about.ts` says the LICENSE "is still Expo's
template and does not describe this game", and shipped anyway.

Aggravating: `package.json` sets `"private": true` and carries no `license`
field, contradicting the MIT file. Ambiguity in a licence is construed against
the drafter — here, against you.

**Status: FIXED.** Code stays MIT so the collaborator and the judges can use it
freely. Narrative content and assets move to a proprietary licence in
`CONTENT-LICENSE`, and `LICENSE` is scoped explicitly to code. See "What this
can and cannot do" in `CONTENT-LICENSE` for an honest account of the part that
cannot be undone.

---

## Count 2 — The app tells the player a false thing about their data, in five languages. BLOCKER

`src/i18n/strings.ts` renders this in the settings privacy panel:

- `settings.privacy.progress` — "Your progress through each case is stored on
  this device."
- `settings.privacy.deletion` — "Deleting the app deletes your progress with
  it."

Both are false. `src/auth/sync.ts` uploads progress to the Supabase
`case_progress` table keyed by `user_id`, and it is called from three live
places: `app/_layout.tsx`, `app/sign-in.tsx` and `src/ui/AccusationScreen.tsx`.
Those rows survive deletion of the app. They are removed only by
`on delete cascade` when the auth user is deleted — and until Count 4 was
fixed, nothing in the app could delete an auth user.

`src/settings/about.ts` carries a note reading, in substance, *the moment
progress is uploaded, a line about it belongs here*. Sync landed. The line was
never written. That comment is now evidence the misstatement was foreseen.

What it exposes:

- **GDPR Art. 5(1)(a) and Art. 13** — transparency, and the duty to state
  recipients, storage period and transfers when the data is obtained. A false
  statement about storage location is the opposite of that duty.
- **FTC Act section 5** — a material misrepresentation about data handling.
  App-says-local, app-uploads is settled FTC ground.
- **LGPD Art. 6(VI)** — the app ships in pt-BR.
- **Platform contract** — it makes the Apple privacy nutrition label and the
  Google Play Data safety form wrong. Both are attestations you sign.

The five-language reach is an aggravator, not a mitigator: it puts the
misstatement in front of EU, Latin American and Brazilian consumers.

**Status: FIXED.** Panel rewritten against what the code actually does, in all
five locales, with a test that fails if sync exists and the panel does not
mention it.

---

## Count 3 — No privacy policy exists. BLOCKER

There is no privacy policy in the repo, no URL in `app.json`, and no contact
address anywhere. The app collects an email address, a password, and a
per-case progress record tied to a user id.

- **Apple, Guideline 5.1.1(i)** — a privacy policy link is required in App
  Store Connect and inside the app. No listing without it.
- **Google Play** — a Privacy Policy URL is mandatory for every app, plus a
  completed Data safety form.
- **GDPR Art. 13** — the notice must be given *when the data is obtained*,
  which means at sign-up, not only in settings.
- **CCPA/CPRA** — notice at collection, and a policy reviewed every twelve
  months.

**Status: FIXED.** `PRIVACY.md` serves GDPR and UK GDPR, CCPA/CPRA and the
other US state acts, LGPD, PIPEDA and Quebec Law 25, APPI, PIPA and the
Australian APPs from one document, and is linked from inside the app.

---

## Count 4 — There is no way to delete an account. BLOCKER

Settings offers "Erase all progress", which clears local saves only
(`app/settings.tsx`). There is no account deletion path anywhere in the app and
no Edge Function that could perform one.

- **Apple, Guideline 5.1.1(v)** — an app that supports account creation must
  let the user *initiate* account deletion from within the app. Mandatory since
  June 2022. This is a straight rejection, not a warning.
- **Google Play, Data deletion policy** — in-app deletion *and* a publicly
  reachable web URL for users who have already uninstalled.
- **GDPR Art. 17**, **CCPA 1798.105**, **LGPD Art. 18(VI)**, and the erasure
  right in every US state privacy act now in force.

The schema was ready — `case_progress.user_id` references `auth.users` with
`on delete cascade` — and the app simply had no way to pull the trigger.

**Status: FIXED.** In-app deletion with a typed confirmation, backed by a
Supabase Edge Function, plus a documented web deletion route for uninstalled
users.

---

## Count 5 — The struck-through price was never charged. HIGH

`app/paywall.tsx` renders `referencePrice()` struck through beside the real
store price. `src/entitlements/pricing.ts` computes it as
`PAID_CASE_COUNT * REFERENCE_PER_CASE` — twelve units of local currency — and
its own docstring concedes: *"It is not a former price, because the pack has
never sold at another one."*

A strike-through is the universally understood notation for a price reduction.
Presenting one that was never charged is a misleading price indication:

- **EU** — Directive 98/6/EC Art. 6a, inserted by the Omnibus Directive
  (EU) 2019/2161: any announcement of a price reduction must state the lowest
  price applied in the preceding 30 days. There is no such price here.
  Reinforced by UCPD Art. 6(1)(d).
- **UK** — Digital Markets, Competition and Consumers Act 2024, in force from
  April 2025, and the CMA's guidance on reference pricing.
- **US** — FTC Guides Against Deceptive Pricing, 16 CFR 233.1: a former-price
  comparison must rest on a bona fide price actually offered.

The *intent* is defensible — it communicates per-case value, and the derivation
into local currency is careful work. The *notation* is what converts it into a
claim about a price that never existed.

**Status: FIXED.** Strike-through removed. The same value message is now made
as a per-case unit price, which is true and needs no defending.

---

## Count 6 — "Yours permanently", with no licence disclosure. HIGH

`paywall.bullet.permanent` reads "Yours permanently — this is not a
subscription".

- **California AB 2426**, in force 1 January 2025, makes it unlawful to
  advertise a digital good using "buy", "purchase" or terms implying
  unrestricted ownership unless the seller discloses at the time of the
  transaction that the customer receives a *licence*, that it may become
  unavailable, and links the terms. Enforced as unfair competition.
- "Permanently" is a promise no developer can keep. Delisting, a closed
  developer account or a platform exit ends access, and the word invites a
  claim when it does.

The anti-subscription half is true, valuable and worth keeping — players
genuinely want to hear it.

**Status: FIXED.** The wording keeps the one-time-payment promise, drops the
absolute, and adds the licence disclosure AB 2426 asks for.

---

## Count 7 — No terms, no EULA, unlimited personal liability. HIGH

There is no contract with the player. The consequences fall almost entirely on
you, personally, because there is no company between you and a claimant:

- No limitation of liability and no warranty disclaimer. A claim arrives at
  your own assets.
- No governing law and no forum. A claimant picks.
- On iOS, Apple's standard EULA applies by default and is a partial backstop.
  On Android there is nothing at all.

Separately, **Directive (EU) 2011/83 Art. 6 and 8** and the **Digital Content
Directive (EU) 2019/770** require pre-contractual information and a 14-day
right of withdrawal for digital content, lost only where the consumer gives
express prior consent to immediate performance *and* acknowledges losing the
right. Apple and Google act as merchant of record in most territories and run
that flow — but your terms must not contradict it, and silence is its own
problem.

**Status: FIXED.** `TERMS.md` written, with the EU/UK withdrawal position
stated rather than contradicted.

---

## Count 8 — Children can create accounts, and the content is not for them. HIGH

There is no age gate anywhere. Any visitor can create an account with an email
address and a password. The content includes murder throughout, a crisis
helpline in two packs, and a suicide-adjacent thread in `the-understudy`.

- **COPPA** — collecting an email address from a child under 13 without
  verifiable parental consent. The amended Rule's compliance date of 22 April
  2026 has passed. Penalties run per violation.
- **UK Age Appropriate Design Code** — fifteen standards, triggered by a
  service *likely to be accessed by* children. A mystery game is.
- **India DPDP Act 2023** — verifiable parental consent for under-**18s**, one
  of the strictest thresholds in force.
- **Age rating** — the IARC questionnaire and Apple's rating must honestly
  declare the mature themes. A misrated app is removed, and the rating is an
  attestation you sign.

**Status: FIXED.** A neutral age declaration gates *account creation only* —
the game still plays offline on local saves, so a younger player loses cloud
sync, not the game. Rating guidance recorded in `docs/STORE-COMPLIANCE.md`.

---

## Count 9 — No asset carries a provenance record. MEDIUM

`assets/audio/` holds 22 `.wav` files and `assets/` holds 19 `.png`. There is
no licence file, no credit list and no source record anywhere in the tree.

**Correction, after checking rather than assuming.** This count first read that
chain of title could not be proven for any shipped asset. That is wrong about
the audio, and the error was mine. Every `.wav` is synthesised by
`tools/make-audio.mjs`, which is in this repository, and that file's opening
comment states the reason outright: a competition entry needs every asset
clearly licensed, and generated sound has no third-party rights attached at
all. It is reproducible too -- delete the directory, run the generator, the
files come back. The audio was handled deliberately, and well, before this
review started.

What is true is narrower. **The images have no provenance record.** Sixteen
covers were produced across Canva and Gamma over several sessions with no note
of which tool made which file. Canva's licence permits commercial use of a
design but not the shipping of a stock element standalone, and an image
generated from a text prompt attracts thin copyright or none in the US, the UK
and most of the EU -- so the covers can ship, but they cannot anchor a trade
mark. Neither point requires a change today. Both require writing down what was
used while somebody still remembers.

And the audio, though clean, had **nothing recording that it was clean**. A
provable fact nobody has written down still costs an afternoon to re-derive
under pressure, usually on the day it is least available.

Related: the licences panel in `src/settings/about.ts` lists thirteen packages
by name and licence *type*. The MIT licence requires that "the above copyright
notice and this permission notice shall be included in all copies". A type
label is not the notice. Every MIT dependency you ship is currently shipped in
breach of its own terms.

**Status: FIXED.** `assets/ASSET-LICENCES.md` records provenance for every
asset, with unknown provenance marked UNKNOWN rather than assumed;
`THIRD-PARTY-NOTICES.md` carries the actual notice text.

---

## Count 10 — A background mode is declared and never used. MEDIUM

`app.json` declares `UIBackgroundModes: ["remote-notification"]`. OneSignal was
cut and there is no push code in the repo.

**Apple, Guideline 2.5.4** — apps that declare background modes without
functionality requiring them are rejected. It also makes the privacy label
harder to answer honestly, since it implies a capability that does not exist.

**Status: FIXED.** Removed.

---

## Count 11 — No trader identity, and Germany requires an address. NOTE — needs your decision

The app ships in German and is sold commercially.

- **Germany, section 5 DDG** (successor to section 5 TMG) — commercial
  telemedia must carry an easily recognisable, directly accessible imprint
  naming the provider and giving a **physical address**.
- **EU CRD Art. 6** — trader identity and geographic address before the
  consumer is bound.
- **DSA trader verification** — Apple has required trader status since February
  2025 and **publishes the trader's address on the public store listing**.

For a solo student this means your home address becomes public unless you use
an alternative. That is a decision, not a bug. The realistic options are a
registered-agent or virtual-office address, a limited company whose registered
office is a service address, or accepting publication. `TERMS.md` and
`PRIVACY.md` carry a marked placeholder, and it must be filled before listing.

---

## Count 12 — Your new collaborator owns part of the app. HIGH

A second person began committing on 2026-09-10. There is no contributor
agreement, no assignment and no licence from them to you.

Absent a written agreement they own the copyright in what they write. If the
result is a joint work, US law lets *either* joint author license the whole
work non-exclusively without the other's consent, owing only an accounting of
profits. If it is not a joint work, their contributions are separately owned
and you need their permission to ship.

This is a week old and free to fix today. It becomes expensive the moment there
is revenue to argue about, or the relationship sours.

**Status: FIXED.** `CONTRIBUTING.md` adds a Developer Certificate of Origin
sign-off plus an explicit inbound licence, and the licence split says what a
contribution is licensed under. Get it agreed in writing before the next merge.

---

## Count 13 — Personal data, no incident plan, no processor records. HIGH

Supabase holds player email addresses and progress. There is no breach plan, no
route for a player or a researcher to report anything, and no record of
processing.

- **GDPR Art. 33** — notify the supervisory authority within **72 hours** of
  becoming aware of a breach. You currently have no way to become aware, and no
  chosen authority.
- **Art. 34** — notify affected individuals where the risk is high.
- **Art. 28** — a data processing agreement with every processor: Supabase,
  RevenueCat, Expo/EAS. These exist as terms you must actually accept.
- **Art. 30** — records of processing activities.

**Status: FIXED.** `SECURITY.md` at the repo root gives a disclosure route;
`docs/DATA-PROCESSING.md` records the processors, transfers, retention and the
72-hour drill.

---

## Count 14 — European Accessibility Act. NOTE

Directive (EU) 2019/882 has applied since 28 June 2025 and covers e-commerce
services, which an app selling digital content to EU consumers is.

The **microenterprise exemption** for services (fewer than 10 staff and
turnover at or below EUR 2m) almost certainly covers you. It should be recorded
rather than assumed, and the existing accessibility work — the contrast rules,
the `accessibilityRole="adjustable"` slider, the reduce-motion setting — is
strong evidence of good faith if it is ever questioned.

**Status: RECORDED** in `docs/STORE-COMPLIANCE.md`.

---

## Count 15 — Crisis content with nothing to point at. MEDIUM

`the-helpline`, `the-listener` and `the-reunion` build on crisis lines and
volunteer listening; `the-understudy` touches suicide. The app surfaces no
support resources anywhere.

Not unlawful. But Apple 1.1.1 and Google's sensitive-content expectations both
sit near this, one complaint is enough to start a review, and the fix costs one
line in a panel that already exists.

**Status: FIXED.** A support-resources line in the About section, pointing at
`findahelpline.com` rather than any single country's number.

---

## Count 16 — Name clearance. NOTE — needs your decision

"Read Receipts" is descriptive of a messaging feature, which cuts both ways:
hard for anyone else to monopolise, and hard for you to register. Before
spending anything on branding, run a clearance search in your intended markets.
The leftover `privatetexts://` scheme from the previous name is harmless but
will confuse anyone reading the manifest.

Not a defect. A cost you should choose deliberately rather than discover.

---

## What is left for a human

1. **Count 11** — pick the address you are willing to publish. Nothing ships in
   the EU until this is decided.
2. **Count 16** — clearance search before branding spend.
3. **Count 9** — the provenance ledger has rows marked UNKNOWN. Only you know
   where those files came from. Fill them, or replace the assets.
4. **Consider an entity.** Every liability count above lands on you personally
   while you trade as an individual. A limited company is the single largest
   risk reduction available, and costs less than the fees on one claim.
