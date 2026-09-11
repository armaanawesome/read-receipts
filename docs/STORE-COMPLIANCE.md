# Store compliance

The answers to give App Store Connect and Google Play Console, worked out once
so they are not improvised at midnight on the deadline.

Every answer here is an attestation. A wrong one is not a typo — it is a false
statement to the platform, and both stores treat it as grounds for removal.

Companion to `PRIVACY.md`. Where a question maps onto something the code does,
the file is named so it can be checked rather than believed.

---

## 1. Apple — App Privacy ("nutrition label")

| Question | Answer | Why |
|---|---|---|
| Contact Info → Email Address | **Collected. Linked to identity. App Functionality.** Not used for tracking | Account sign-up |
| User Content → Other | **Collected. Linked to identity. App Functionality** | Case progress is user-generated in the loosest sense; declaring it is safer than arguing it is not |
| Purchases | **Collected. Linked to identity. App Functionality** | RevenueCat entitlements |
| Identifiers → User ID | **Collected. Linked to identity. App Functionality** | The Supabase UUID sent to RevenueCat |
| Identifiers → Device ID | **Not collected** | Nothing in the build reads one |
| Usage Data, Diagnostics, Location, Contacts, Health, Financial | **Not collected** | No analytics, no crash SDK, no permission for any of it |
| Tracking | **No.** No ATT prompt needed | Nothing is shared with a data broker or used for cross-app advertising |

If a player never signs in, none of the above is collected at all. Apple's form
has no way to say that, which is why the label looks heavier than the app is.

## 2. Google Play — Data safety

Same content, their vocabulary:

- **Collected:** email address; app activity (case progress); purchase history;
  user IDs.
- **Shared:** none. Sending data to your own processor is not "sharing" under
  Google's definition.
- **Encrypted in transit:** yes, TLS throughout.
- **Users can request deletion:** yes — **in-app and by a web route**. Both are
  required.
  - In-app: Settings → Account → Delete account
  - Web: the "Delete my account" email route in `PRIVACY.md` section 5
- **Committed to the Play Families policy:** no. This app is not aimed at
  children.

## 3. Account deletion — the URL Google asks for

Google requires a link reachable **without installing the app**. Until there is
a website, use the privacy policy's deletion section:

```
https://github.com/armaanawesome/read-receipts/blob/master/PRIVACY.md#deleting-your-account-if-you-have-already-uninstalled
```

That satisfies the requirement — public, permanent, and it states the route. A
dedicated page is nicer and is not a blocker.

## 4. Age rating

Be honest here. The content is murder throughout, grief in several packs, a
crisis line in two, and a suicide-adjacent thread in `the-understudy`.

**Apple:** expect **12+ or 17+** depending on the answers. Declare
*Infrequent/Mild Realistic Violence* and *Infrequent/Mild Mature or Suggestive
Themes* at minimum. If the questionnaire asks about suicide or self-harm
references, say yes — `the-understudy` has one.

**Google / IARC:** the questionnaire is generated per territory. Declare
violence references and the suicide theme. Expect PEGI 12–16, ESRB Teen.

Under-rating is the single most common reason a narrative game is pulled after
launch, and re-rating an app that has already been downloaded is worse than
rating it correctly on day one.

## 5. Encryption declaration

`app.json` sets `ITSAppUsesNonExemptEncryption: false`.

Correct: the app uses HTTPS/TLS and the platform's own crypto and nothing else.
No proprietary or non-standard encryption is implemented. That is the exemption
this flag declares, and it means no annual self-classification report and no
French import declaration.

Revisit only if the app ever ships its own crypto — which it should not.

## 6. EU Digital Services Act — trader status

Apple has required trader verification since February 2025 and **publishes the
trader's name and address on the public store listing** for anyone distributing
in the EU.

**This is a decision, not a checkbox.** For a solo developer it means a home
address becomes public unless a service address is arranged first. See
`docs/LEGAL-REVIEW.md`, Count 11. Nothing ships in the EU until it is resolved.

## 7. European Accessibility Act

Directive (EU) 2019/882 has applied since 28 June 2025 and covers e-commerce
services, which an app selling digital content to EU consumers is.

**The microenterprise exemption for services applies** — fewer than 10 staff and
turnover at or below EUR 2m. Read Receipts is one person.

Recorded rather than assumed, and worth noting the app would be in decent shape
regardless: WCAG-checked contrast tokens with a documented non-text-only colour,
`accessibilityRole="adjustable"` on the volume control, a reduce-motion setting,
and hit targets held to a minimum size in `theme.hit`. If the exemption is ever
questioned, that is the evidence.

## 8. Apple guidelines this app has specifically been checked against

| Guideline | Status |
|---|---|
| 2.5.4 — background modes without functionality | **Fixed.** `UIBackgroundModes` removed; OneSignal was cut and nothing used it |
| 3.1.1 — in-app purchase for digital content | Compliant. All purchases via StoreKit through RevenueCat |
| 3.1.2 — subscriptions | n/a. One-time purchase, and the paywall says so |
| 5.1.1(i) — privacy policy | **Fixed.** `PRIVACY.md`, linked in-app |
| 5.1.1(v) — account deletion | **Fixed.** Settings → Account → Delete account |
| 5.1.2 — data minimisation | Compliant. Email and progress, nothing else |
| 1.1.1 — objectionable content | Fiction, rated honestly, with a support-resources note in Settings |
| 2.3.3 — screenshots must show the real app | **Not yet done.** Screenshots are outstanding. Do not stage anything the app does not do |

## 8a. Third-party sign-in

The app offers Continue with Google and Continue with Apple
(`src/ui/AuthProviderButtons.tsx`). Two store requirements follow from that, and
neither is satisfied yet.

**Apple, Guideline 4.8 -- Sign in with Apple.** Required wherever a third-party
sign-in is offered. The app offers it, so this is met in principle. It is only
genuinely met once Apple is enabled in the Supabase dashboard, which needs a
paid Apple Developer account.

**Brand assets -- NOT done, deliberately.** Google requires their "G" mark on a
white or blue field with approved wording; Apple requires their mark and one of
their approved strings. This project ships no SVG library and no brand assets,
so the buttons use the app's own type and colours instead. That is the right
call for now -- a hand-drawn approximation is a trademark problem *and* looks
wrong beside the real thing -- but it is not submittable.

Before submission: fetch the official assets from Google Identity's branding
guidelines and Apple's Sign in with Apple resources, and replace the labels.
The component is deliberately one file with a `PROVIDERS` array so this is a
contained change.

**Apple's order rule.** Sign in with Apple must be presented no less
prominently than other options. `PROVIDERS` is ordered Apple first for exactly
this reason; keep it that way.

## 9. Before submitting

- [ ] Contact email and postal address filled into `PRIVACY.md` and `TERMS.md`
- [ ] Supabase region recorded in `docs/DATA-PROCESSING.md`
- [ ] Both DPAs accepted and dated
- [ ] `delete-account` Edge Function deployed and tested against a throwaway account
- [ ] Age rating questionnaire answered honestly, both stores
- [ ] Privacy policy URL entered in both consoles
- [ ] Account deletion URL entered in Play Console
- [ ] DSA trader address decided (EU only)
- [ ] Screenshots taken from the real app
- [ ] Google and Apple providers enabled in Supabase, redirect URL allow-listed
- [ ] Official Google and Apple button artwork in place (section 8a)
