# Privacy policy — Read Receipts

**Last updated: 10 September 2026.**

> **BEFORE THE FIRST STORE RELEASE, FILL THESE IN.** Both stores reject a policy
> without a working contact, and Germany and the EU require a trader address.
> See `docs/LEGAL-REVIEW.md`, Count 11.
>
> - **Contact email:** `[FILL IN — a dedicated address, not a personal one]`
> - **Postal address:** `[FILL IN — this becomes public on the App Store listing]`
> - **Controller:** Armaan Ebrahim, trading as an individual

---

## The short version

Read Receipts is a single-player mystery game. It has **no ads, no analytics, no
tracking SDKs and no third-party advertising identifiers.** Nothing about you is
sold, shared or profiled.

You can play the entire game without an account. If you do not sign in, nothing
about you leaves your phone.

If you do sign in, two things are stored on a server: **your email address, and
which cases you have opened, read and solved.** That is the whole list. You can
delete all of it from inside the app.

The rest of this document is the detail that regulators, and anybody who does
not want to take the short version on trust, are entitled to.

---

## 1. Who is responsible

Armaan Ebrahim, trading as an individual, is the **data controller** (GDPR and
UK GDPR), the **business** (CCPA/CPRA), and the **controlador** (LGPD). Contact
details above.

There is no Data Protection Officer. One is not required here: the processing is
not large-scale, not systematic monitoring, and involves no special categories
of data.

## 2. What is collected, and why

### If you never sign in

Nothing leaves your device. Your progress and settings live in the app's own
storage and go when the app goes.

### If you create an account

| Data | Why | Legal basis (GDPR Art. 6) |
|---|---|---|
| Email address | To identify your account, let you sign in on another device, and send a password reset if you ask for one | Art. 6(1)(b) — performance of a contract you asked for |
| Password | Never stored. Supabase stores a one-way hash; nobody, including us, can read it back | Art. 6(1)(b) |
| Case progress — case ids, message ids you have read, contradictions you have confirmed, which cases are solved | So your progress follows you to another device. This is the only reason the account exists | Art. 6(1)(b) |
| Your age bracket at sign-up | Asked once, answered with a button, **never stored anywhere** | n/a — not retained |

### Purchases

Purchases run through Apple's App Store or Google Play, with RevenueCat
recording what you are entitled to. **This app never sees your card, your
billing address or your payment details** — those go to Apple or Google and
never touch us.

RevenueCat is told an anonymous identifier for you, which is your Supabase user
id: an opaque UUID like `3f6b…`. **Never your email address.** That is
deliberate — the identifier has to be stable and opaque, and an email is neither.

### What is never collected

No location. No contacts. No photos. No microphone (`RECORD_AUDIO` is explicitly
blocked in `app.json`). No advertising ID. No device fingerprint. No behavioural
profile. No crash-reporting SDK. You will not be tracked across other apps or
websites, because there is nothing in the build that could do it.

## 3. Who else sees it

| Processor | What they get | Where |
|---|---|---|
| Supabase | Email address, hashed password, case progress | Region set for the project — see `docs/DATA-PROCESSING.md` |
| RevenueCat | An opaque user id and purchase receipts | United States |
| Apple / Google | The purchase itself. They are the seller, not us | Global |
| Expo (EAS) | Build infrastructure only. No player data ever reaches it | United States |

Each is a processor under a data processing agreement. Transfers outside the
UK/EEA rely on the European Commission's Standard Contractual Clauses and the UK
Addendum. The detail is in `docs/DATA-PROCESSING.md`.

**Nothing is sold.** Nothing is "shared" for cross-context behavioural
advertising, in the CCPA/CPRA sense of those words. There is no "Do Not Sell or
Share" link because there is nothing to opt out of.

## 4. How long it is kept

- **Account data:** for as long as the account exists.
- **After you delete your account:** removed immediately. Deleting the account
  cascades to every progress row through a database foreign key, so there is no
  second copy to forget about.
- **Backups:** Supabase's automated backups may hold a copy for up to 30 days,
  after which they roll off. We cannot selectively edit a backup, which is
  normal and is why the window exists.
- **Local saves:** they stay on your device until you erase them in Settings or
  delete the app.

## 5. Your rights, wherever you are

You can exercise any of these by emailing the address at the top. We will
respond within **30 days** (GDPR Art. 12: one month, extendable by two for
complex requests; CCPA: 45 days).

We will not charge you, and we will not make the app worse for you because you
asked.

**Everywhere:**

- **Access** — a copy of what we hold.
- **Correction** — fix anything wrong.
- **Deletion** — erase it. Fastest route: Settings → Account → Delete account,
  in the app, which does it immediately with no email required.
- **Portability** — your data in a machine-readable file.
- **Complain** — see section 9.

**UK / EU (GDPR):** also restriction of processing, objection to processing, and
the right not to be subject to solely automated decisions with legal effects —
there are none here.

**California (CCPA/CPRA):** the right to know the categories and specific pieces
collected, to delete, to correct, and to opt out of sale or sharing. There is no
sale or sharing to opt out of. We do not use or disclose sensitive personal
information for purposes requiring an opt-out. We do not offer financial
incentives.

**Other US states** — Virginia, Colorado, Connecticut, Utah, Texas, Oregon,
Montana, Florida, Delaware, Iowa, Nebraska, New Hampshire, New Jersey,
Tennessee, Minnesota, Maryland, Indiana, Kentucky, Rhode Island: the same rights
of access, correction, deletion and portability, plus opt-out of targeted
advertising, sale and profiling. None of those three happen here. Where an
appeal process is required, a refused request can be appealed by replying to our
decision email.

**Brazil (LGPD):** confirmation of processing, access, correction, anonymisation
or deletion, portability, information about sharing, and revocation of consent.

**Canada (PIPEDA and Quebec Law 25):** access, correction, withdrawal of
consent, and — for Quebec residents — portability and the right to be informed
of any automated decision. There are none.

**Australia (Privacy Act, APPs):** access and correction, and the right to
complain to the OAIC.

**Japan (APPI), South Korea (PIPA), Switzerland (revFADP), and other regimes
with equivalent rights:** the same requests reach us at the same address and are
handled the same way.

### Deleting your account if you have already uninstalled

Email the address at the top from the address you signed up with, with the
subject **"Delete my account"**. We will delete it and confirm within 30 days.
This route exists because Google Play requires a web-reachable deletion path for
people who no longer have the app.

## 6. Children

Accounts are for players aged **16 and over**. The app asks before it creates
one, and the answer is not stored.

**The game itself is open to everyone** and needs no account — a younger player
loses cross-device sync and nothing else.

We do not knowingly collect personal information from a child under 16. If you
believe a child has created an account, email us and it will be deleted without
requiring proof.

The content — murder, grief, and in one case suicide — is rated accordingly on
each store. Please check the rating before letting a younger player start.

## 7. Security

- All traffic is over TLS.
- Passwords are hashed by Supabase and are not readable by anyone, us included.
- Every database row is protected by row-level security policies that restrict
  it to its owner. Those policies are in
  `supabase/migrations/0001_case_progress.sql`, in public, because a policy
  nobody can review is a policy nobody has checked.
- The key shipped inside the app is the **publishable** key. It carries no
  authority of its own; the server decides what it may reach.
- The session token is kept in app-private storage on your device. It is not
  encrypted at rest, which is a deliberate, documented trade-off appropriate to
  data of this sensitivity — see `src/auth/client.ts`.

Nothing is perfectly secure. If you find a hole, `SECURITY.md` says how to tell
us, and you will get an answer within 72 hours.

## 8. If there is a breach

We will notify the relevant supervisory authority within **72 hours** of
becoming aware, and tell affected players directly where the risk to them is
high. The procedure is written down in advance, in `docs/DATA-PROCESSING.md`.

## 9. Complaints

Tell us first — we would rather fix it. If that does not satisfy you, you can
complain to a regulator, and you do not need our permission:

- **UK:** Information Commissioner's Office, `ico.org.uk`
- **EU/EEA:** the supervisory authority where you live, work, or where the issue
  happened. The list is at `edpb.europa.eu`
- **Brazil:** ANPD, `gov.br/anpd`
- **Canada:** Office of the Privacy Commissioner, `priv.gc.ca`
- **Australia:** OAIC, `oaic.gov.au`
- **California:** the California Privacy Protection Agency, or the Attorney
  General at `oag.ca.gov`

## 10. Changes

If this policy changes in a way that affects you, the app will say so before the
change takes effect rather than quietly updating a page you have no reason to
revisit. The date at the top always reflects the current version, and the full
history is in this repository's git log — every edit, dated, with its reason.

---

*This policy describes an app that genuinely collects very little. If any line
here ever stops matching the code, the code is right and this document is a bug.
Report it like one.*
