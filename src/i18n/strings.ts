import { DEFAULT_LOCALE, type LocaleTag } from './locales';

/**
 * The UI string catalogue.
 *
 * Flat dotted keys rather than nested objects, for one reason: the parity test
 * compares key *sets* across locales, and a flat set is comparable with
 * `Object.keys`. Nested objects would need a recursive walk to compare, and the
 * failure mode of getting that walk subtly wrong is a missing translation that
 * the test says is present.
 *
 * English is the source of truth. Every other catalogue is `Partial`, and
 * anything absent falls back to English rather than rendering a key — a player
 * who sees a half-translated screen can still play; a player who sees
 * `settings.sound.label` cannot.
 *
 * Every key here is rendered by a screen. When a string leaves the UI, its key
 * leaves this file with it: a catalogue that still carries `signIn.guest` after
 * the guest button became "Keep playing on this phone" costs a translator real
 * work on a string nobody will ever read, and reads as coverage that does not
 * exist.
 *
 * CASE TEXT IS NOT HERE. Briefings, messages, confessions and epilogues live in
 * `content/cases/*.ts` and are translated per case, because a case is prose with
 * a solvability contract attached: a mistranslated time or place makes a case
 * unsolvable in a way no UI string can. See docs/pack-ledger.md.
 */
export const EN = {
  'common.back': 'Back',
  'common.retry': 'Try again',
  'common.working': 'Working…',
  /** The player's own seat in a thread. Never followed by a verb — see the note in ContinueCard. */
  'common.you': 'You',
  /** Shown on both the paywall and the settings list, so it belongs to neither. */
  'common.restorePurchases': 'Restore purchases',

  'home.pitch':
    'Someone is dead. All you have is their messages. Find the statement that cannot be true.',
  'home.cases.title': 'All cases',
  /* Linear flow: a case whose predecessors are unfinished. Distinct from
     home.tile.sealed, which means unbought. */
  'home.tile.lockedByProgress': 'Locked',
  'home.locked.title': 'Not yet',
  'home.locked.body': 'Finish {title} first. The cases run in order.',
  'home.storeUnreachable':
    'Could not check your purchases. Cases you own will unlock when you are back online.',
  'home.tile.sealed': 'Sealed',
  'home.tile.toProve': '{count} to prove',
  /**
   * Singular variants exist because the tutorial hides exactly one
   * contradiction and sits first in the grid, so "1 contradictions" was the
   * first thing a screen reader said about the game.
   */
  'home.tile.lockedLabel': '{title}, sealed. {count} contradictions. Unlock.',
  'home.tile.lockedLabelOne': '{title}, sealed. 1 contradiction. Unlock.',
  'home.tile.openLabel': '{title}. {count} contradictions to prove. Open.',
  'home.tile.openLabelOne': '{title}. 1 contradiction to prove. Open.',

  'home.continue.title': 'Continue',
  'home.continue.unreadOne': '1 unread',
  'home.continue.unreadMany': '{count} unread',
  'home.continue.label': 'Continue {title}.',
  'home.continue.backTo': 'Back to {thread}.',

  /* The conversation screen. Reading is paced by the player: a tap delivers
     the next message, and the button skips the rest of the thread. */

  'settings.account.section': 'Account',
  /* The front door, and the walkthrough that runs inside the demo case rather
     than in front of it. See app/landing.tsx and src/tutorial/steps.ts. */
  'landing.kicker': 'A case in your messages',
  'landing.line1': 'They ruled it an accident.',
  'landing.line2': 'You have everyone’s messages from that night.',
  'landing.line3': 'One of them is in two places at once.',
  'landing.signIn': 'Sign in',
  'landing.guest': 'Play as guest',
  'landing.syncNote':
    'Signing in carries your cases to another phone. You can do it later from Settings.',
  'tutorial.openThread': 'These are the messages from that night. Open the top conversation.',
  'tutorial.tapToRead': 'Tap anywhere to bring in the next message.',
  'tutorial.holdToPin':
    'Now press and hold a message. That pins what it claims: who was where, and when.',
  'tutorial.compare':
    'Pin a second claim, then compare the two. One person cannot hold the same minute in two places.',
  'tutorial.nameThem': 'You have proved it. Now say who.',
  'tutorial.dismiss': 'Got it',
  'tutorial.dismissLabel': 'Stop showing these prompts',
  'tutorial.replayRow': 'Show the walkthrough again',
  'tutorial.replayTitle': 'Walkthrough is back on',
  'tutorial.replayBody': 'The prompts will appear again the next time you open the first case.',
  'closed.statProved': 'Proved',
  'closed.statRead': 'Read',
  'closed.statThreads': 'Threads',
  'closed.stamp': 'Case closed',
  'closed.named': 'named, and proved',
  'closed.next': 'Next case: {title}',
  'closed.unlockNext': 'Unlock {title}',
  'closed.allCases': 'All cases',
  'closed.replay': 'Play this case again',
  'closed.replayHint': 'Clears your progress in this case and starts it from the first message.',
  'closed.finale': 'That was the last case in the file.',
  'home.tile.solved': 'Solved',
  'case.allCases': 'Cases',

  'settings.help.section': 'Help',
  'thread.conversation': 'Conversation',
  'thread.tapToContinue': 'Tap to continue',
  'thread.skipAll': 'Skip all',
  'home.continue.proved': '{proved} of {total} proved. Last played {elapsed}.',

  /*
   * How long ago the player last put the phone down.
   *
   * Split into keys rather than built from a number and a unit, because
   * assembling "{count} {unit} ago" in code assumes every language agrees on
   * that order and on there being exactly two plural forms. These are whole
   * phrases, so a translator can reorder them or collapse the singular into the
   * plural without touching src/state.
   */
  'elapsed.justNow': 'just now',
  'elapsed.minuteOne': '1 minute ago',
  'elapsed.minuteMany': '{count} minutes ago',
  'elapsed.hourOne': '1 hour ago',
  'elapsed.hourMany': '{count} hours ago',
  'elapsed.yesterday': 'yesterday',
  'elapsed.dayMany': '{count} days ago',
  'elapsed.lastWeek': 'last week',
  'elapsed.weekMany': '{count} weeks ago',
  'elapsed.aWhile': 'a while ago',

  /*
   * Sign-in errors and sync results.
   *
   * Whole sentences, including the sync counts. `sync.both` could have been
   * assembled from two fragments and a separator, and was — the code built
   * "Case notes synced — 2 brought back, 1 backed up." by joining an array,
   * which hands a translator two noun phrases and assumes their language
   * chains clauses in that order with that punctuation.
   */
  'auth.error.generic': 'Something went wrong. Try again in a moment.',
  'auth.error.badCredentials':
    'That email and password do not match an account. Check both, or create an account instead.',
  'auth.error.emailUnconfirmed':
    'Confirm your email first — the link is in your inbox. Check spam if it is not there.',
  'auth.error.alreadyRegistered': 'That email already has an account. Sign in instead.',
  'auth.error.passwordShort': 'That password is too short. Use at least 6 characters.',
  'auth.error.rateLimit': 'Too many attempts. Wait a minute and try again.',
  'auth.error.network':
    'Could not reach the server. Check your connection and try again — your progress is safe on this device.',
  'auth.error.badEmail': 'That does not look like an email address. Check it and try again.',
  'sync.notSignedIn': 'Not signed in. Your progress is saved on this device.',
  'sync.upToDate': 'Everything was already in sync.',
  'sync.downloaded': 'Case notes synced. {count} brought back from your account.',
  'sync.uploaded': 'Case notes synced. {count} backed up to your account.',
  'sync.both': 'Case notes synced. {downloaded} brought back, {uploaded} backed up.',

  'restore.working': 'Checking with the store…',
  'restore.none': 'No purchases found for this store account.',
  'restore.oneRestored': 'Restored 1 purchase. Your case pack is unlocked.',
  'restore.manyRestored': 'Restored {count} purchases. Your case pack is unlocked.',
  'restore.unreachable': 'Could not reach the store. Check your connection and try again.',

  'case.tab.threads': 'Threads',
  'case.tab.board': 'Board',
  'case.tab.accuse': 'Accuse',

  /*
   * The board. Every string here used to be a hardcoded English literal on the
   * one screen the game is named for, so a Spanish player read the whole
   * instrument in English.
   */
  'board.record': 'On the record',
  'board.record.empty':
    'Nothing yet. Read the threads, and hold a message to write down what it claims.',
  'board.proven': 'Proven',
  'board.proven.count': '{done} of {total}',
  /** Labels the empty instrument by what it does, rather than repeating the dock's instruction. */
  'board.waiting': 'Two statements drawn against one clock.',
  'board.slot.empty': 'Pin a statement',
  'board.slot.filledLabel': 'Statement {n}: {label}. Tap to unpin.',
  'board.slot.emptyLabel': 'Statement {n}: empty. Pin a statement from the record.',
  'board.compare': 'Run the check',
  'board.compare.label': 'Run the check on the two pinned statements. {n} of 2 pinned.',
  'board.subject.one': 'one person',
  'board.overlap': 'both true at once',

  /*
   * The accusation. Same defect the board carried: every string on this
   * screen was a hardcoded English literal, the OS alert included.
   *
   * The three refusals mirror the three gates in `engine/accusation.ts` and
   * are keyed off its `kind` discriminator, NOT off its English `reason`
   * prose — matching on the sentence would break the moment anyone edits it.
   */
  'accuse.prompt': 'Who killed them?',
  'accuse.sub': 'Naming the right person is not enough. You have to be able to prove it.',
  'accuse.card.none': 'nothing proven',
  'accuse.card.count': '{n} contradictions',
  'accuse.card.countOne': '1 contradiction',
  'accuse.card.label': 'Accuse {name}. {n} proven contradictions name them.',
  'accuse.card.labelOne': 'Accuse {name}. 1 proven contradiction names them.',
  'accuse.card.labelNone': 'Accuse {name}. Nothing proven against them.',
  'accuse.sheet.title': 'Accuse {name}',
  'accuse.sheet.have': 'What you have',
  'accuse.sheet.none': 'Nothing proven against them yet.',
  'accuse.sheet.proof': '{n} proven contradictions name them',
  'accuse.sheet.proofOne': '1 proven contradiction names them',
  'accuse.sheet.reassure':
    'If your evidence does not fit them, you will be told so and can name someone else.',
  'accuse.sheet.confirm': 'Accuse',
  'accuse.refusal.proof': 'You cannot prove it yet. Something in their story still holds up.',
  'accuse.refusal.motive':
    'You can break the story, but you cannot yet say why. Keep reading.',
  'accuse.refusal.identity': 'The evidence you have does not fit this person.',
  'accuse.refusal.oneLeft': 'One thing in their story still holds up.',
  'accuse.refusal.manyLeft': '{n} things in their story still hold up.',

  /*
   * The comparison verdicts, one key per rule in `engine/contradiction.ts`,
   * keyed off its `kind` discriminator rather than its English `reason`.
   *
   * `needTwo` and `stale` are the two verdicts `caseStore` synthesises rather
   * than the engine producing them; they are here because they land in the
   * same field and are drawn by the same component.
   */
  'verdict.sameStatement': 'That is the same statement twice.',
  'verdict.differentThings': 'These are about two different things.',
  'verdict.personVsThing': 'One is about a person, the other about a thing.',
  'verdict.differentPeople': 'These are about different people.',
  'verdict.differentTimes': 'These describe different times.',
  'verdict.differentKinds': 'These describe different kinds of thing.',
  'verdict.placeConflict': 'One person, two places, same moment.',
  'verdict.actionConflict': 'They cannot have been doing both at once.',
  'verdict.objectConflict': 'Only one person can have had it.',
  'verdict.sameArea': 'Those two places are the same area.',
  'verdict.compatible': 'Those two things can both be true.',
  'verdict.sameHands': 'Both statements put it in the same hands.',
  'verdict.notUnique': 'There could be more than one of those.',
  'verdict.needTwo': 'Pin two statements to compare them.',
  'verdict.stale': 'Those statements are no longer on the record.',

  /*
   * The confrontation.
   *
   * `confront.open` used to read 'Put it to her. One fact at a time.' — the
   * only line in the game that assumed the killer's gender, across sixteen
   * cases that do not all have a woman at the end of them. Character records
   * carry a name and an avatar colour and nothing else, so there is no
   * pronoun to look up and none is needed.
   */
  'confront.repeat': 'You have said that already.',
  'confront.close': 'Close the case',
  'confront.skip': 'Tap to skip',
  'confront.open': 'Put it to them. One fact at a time.',
  'confront.left': '{n} left to say',
  'confront.leftOne': '1 left to say',
  'confront.chipLabel': 'Put to {name}: {label}',

  'thread.locked': '{n} conversations are still out of reach. Prove something first.',
  'thread.lockedOne': 'One conversation is still out of reach. Prove something first.',
  'thread.rowLabel': '{title}. {n} unread.',
  'thread.rowLabelOne': '{title}. 1 unread.',
  'thread.rowLabelNone': '{title}. No unread messages.',
  /*
   * 'Open her messages' until 2026-09-05 — and the victim of case 1 is Tom
   * Vardy, so the very first screen of the tutorial had the wrong pronoun.
   * The accessibility label beside it already read 'Open the messages'; the
   * neutral wording was sitting right there.
   */
  'briefing.open': 'Open the messages',
  'claim.pin': 'Tap to pin it to the board',
  'claim.unpin': 'Slot {n} — tap to unpin',

  /*
   * Screen-reader-only strings. They were the last English left in the app,
   * and the easiest to miss precisely because nothing on screen shows them:
   * a Spanish VoiceOver user heard 'Someone is typing' in English.
   */
  'a11y.volume': 'Sound effects volume',
  'a11y.loadingCases': 'Loading cases',
  'a11y.loadingThreads': 'Loading conversations',
  'a11y.typing': 'Someone is typing',
  'a11y.close': 'Close',

  'settings.title': 'Settings',
  'settings.sound.section': 'Sound',
  'settings.sound.label': 'Sound effects',
  'settings.sound.detail': 'Short cues when a message lands and when a contradiction breaks.',
  'settings.volume.label': 'Volume',
  'settings.feel.section': 'Feel',
  'settings.haptics.label': 'Haptics',
  'settings.haptics.detail': 'Taps you can feel when you pin a statement or land a fact.',
  'settings.motion.label': 'Reduce motion',
  'settings.motion.detail': 'Messages appear instantly and decorative sounds stay quiet.',
  'settings.language.section': 'Language',
  'settings.language.label': 'Language',
  'settings.language.hint': 'Opens the list of languages',
  // Was "Case files are written in English and are not translated." That stopped
  // being true the moment cases became translatable, and a settings screen that
  // contradicts the language screen two taps away is worse than saying nothing.
  'settings.language.footnote':
    'Cases are translated separately. Any case that has not been translated yet stays in English.',
  'settings.purchases.section': 'Purchases',
  'settings.restore.detail': 'Already bought the case pack? Get it back on this device.',
  'settings.progress.section': 'Progress',
  'settings.reset.label': 'Reset all progress',
  'settings.reset.detail': 'Erases every case save. Purchases are kept.',
  'settings.reset.confirm': 'Erase all progress?',
  'settings.reset.confirmBody':
    'Every case goes back to unread, and every contradiction you proved is forgotten. Purchases are not affected. This cannot be undone.',
  'settings.reset.keep': 'Keep it',
  'settings.reset.erase': 'Erase',
  'settings.reset.erasedNone': 'There was no saved progress to erase.',
  'settings.reset.erasedOne': 'Erased 1 saved case.',
  'settings.reset.erasedMany': 'Erased {count} saved cases.',
  'settings.reset.failed': 'Could not erase progress. Try again.',
  'settings.about.section': 'About',
  'settings.about.version': 'Version',
  'settings.about.privacy': 'What this app stores',
  'settings.about.licences': 'Open-source licences',

  /**
   * The privacy panel, one key per point. `src/settings/about.ts` owns which
   * points appear and in what order; this owns their wording.
   */
  'settings.privacy.progress': 'Your progress through each case is stored on this device.',
  'settings.privacy.purchases':
    'Purchases are handled by the App Store or Google Play through RevenueCat. This app never sees your payment details.',
  'settings.privacy.noTracking':
    'There are no ads and no analytics or tracking SDKs in this build.',
  'settings.privacy.deletion': 'Deleting the app deletes your progress with it.',

  'language.title': 'Language',
  'language.footnote':
    'Changing this translates the app. Case files are translated separately, and any case that has not been translated yet stays in English.',

  'signIn.title': 'Sign in',
  'signIn.heading': 'Take your case notes with you',
  'signIn.why': 'An account carries your progress to another phone.',
  'signIn.createAccount': 'Create account',
  'signIn.email': 'Email',
  'signIn.password': 'Password',
  'signIn.alreadyRegistered': 'That email already has an account. Sign in instead.',
  'signIn.confirmEmail': 'Check {email} for a confirmation link, then sign in.',
  'signIn.storesNote':
    'An account stores your email address and which messages you have read. Nothing else.',
  'signIn.leave': 'Keep playing on this phone',
  'signIn.leaveLabel': 'Keep playing on this phone, without an account',
  'signIn.off.title': 'Accounts are switched off',
  'signIn.signedIn.title': 'Signed in',
  'signIn.account': 'Your account',
  'signIn.sync': 'Sync now',
  'signIn.syncing': 'Syncing…',
  'signIn.backToCases': 'Back to the cases',
  'signIn.signOut': 'Sign out',
  'signIn.signOutNote': 'Signing out leaves every case save on this phone. Nothing is deleted.',

  /**
   * Field-level problems. These were English prose returned from
   * `credentials.ts` and rendered directly, so a Spanish player met an English
   * sentence under a Spanish field.
   */
  'signIn.problem.emailEmpty': 'Enter your email address.',
  'signIn.problem.emailShape': 'That does not look like an email address.',
  'signIn.problem.passwordEmpty': 'Enter your password.',

  /** The live checklist under the password field, and the meter beside it. */
  'signIn.rulesLabel': 'Your password needs',
  'signIn.rule.length': 'At least {count} characters',
  'signIn.rule.lowercase': 'A lowercase letter',
  'signIn.rule.uppercase': 'An uppercase letter',
  'signIn.rule.symbol': 'A symbol',
  'signIn.rule.number': 'A number',
  'signIn.strength.weak': 'Weak',
  'signIn.strength.fair': 'Fair',
  'signIn.strength.strong': 'Strong',

  'signIn.showPassword': 'Show password',
  'signIn.hidePassword': 'Hide password',

  'signIn.forgot': 'Forgot your password?',
  /**
   * Says nothing about whether the address has an account, because saying so
   * would turn this form into an account-existence oracle anybody could query.
   * Supabase answers identically either way and this sentence matches it.
   */
  'signIn.reset.sent':
    'If that address has an account, a reset link is on its way. Check your inbox, and your spam folder.',
  'signIn.reset.needEmail': 'Enter your email address first, then tap this again.',

  /**
   * The reset is finished with a CODE, not with the emailed link. Supabase does
   * not host an update-password page — its link redirects to the project's Site
   * URL, which on a phone with no website is a dead end.
   */
  'reset.title': 'Set a new password',
  'reset.body': 'We sent a code to {email}. It expires in an hour.',
  'reset.code': 'Code from the email',
  'reset.newPassword': 'New password',
  'reset.submit': 'Save new password',
  'reset.resend': 'Send another code',
  'reset.needCode': 'Enter the code from the email.',
  'auth.error.badCode': 'That code has expired or does not match. Send another one.',
  'auth.error.leakedPassword':
    'That password has turned up in a data breach, so it is not safe to use. Try a different one.',
  'auth.error.samePassword': 'That is the password you already have. Choose a different one.',

  'paywall.title': 'More cases',
  'paywall.body':
    'Another death, another phone, another story that does not hold up. Unlock the case pack to keep going.',
  'paywall.bullet.case': 'Twelve more full-length cases',
  'paywall.bullet.suspects': 'New suspects, new contradictions',
  'paywall.bullet.permanent': 'Yours permanently — this is not a subscription',
  /**
   * Sits beside a struck-through reference figure. `{count}` is how many cases
   * the pack unlocks, so this reads as what the pack is worth rather than as a
   * price it used to carry — it has never carried another price.
   */
  'paywall.empty': 'The store has nothing to sell right now. Try again in a moment.',
  'paywall.unreachable': 'Could not reach the store.',
  'paywall.failed': 'The purchase did not go through. You have not been charged.',
  /** `{price}` is always the store's own localised price string, never a formatted number. */
  'paywall.unlock': 'Unlock · {price}',
  'paywall.unlockLabel': 'Unlock the case pack for {price}',
  'paywall.unlockCaseLabel': 'Unlock this case for {price}',
  'paywall.notNow': 'Not now',

  /**
   * The two-option chooser. Shown only when the store actually sells this case
   * on its own — otherwise the pack is the only thing on screen, and a heading
   * announcing a choice would be describing one the player does not have.
   */
  'paywall.choose': 'Two ways in',
  'paywall.option.single': 'This case',
  'paywall.option.singleNote': 'Unlocks {title} on its own',
  'paywall.option.bundle': 'All {count} cases',
  'paywall.option.bundleNote': 'Every paid case, this one included',
  'paywall.option.best': 'Best value',

  /** Between the store saying yes and the entitlement arriving. Usually a blink. */
  'paywall.settling': 'Confirming with the store…',
  'paywall.done.title': 'Thank you for your purchase',
  'paywall.done.body': 'Enjoy playing.',
  'paywall.done.cta': 'Back to the cases',
  /**
   * The failed page. The BODY is the classified reason from `offering.ts`, not a
   * generic line — "no connection to the store" and "the store turned the
   * payment down" need different things from the player.
   */
  'paywall.failedTitle': 'Your payment was not completed',

  /**
   * One line per way a purchase can fail, because they need different actions
   * from the player. A single "something went wrong" sends somebody with no
   * signal off to check their card details.
   */
  'paywall.error.cancelled': 'Nothing was bought. You have not been charged.',
  'paywall.error.offline':
    'No connection to the store. Check your network and try again — nothing has been charged.',
  'paywall.error.declined': 'The store turned the payment down. You have not been charged.',
  'paywall.error.alreadyOwned': 'You already own this. Restoring it now.',
  'paywall.error.pending':
    'The payment is waiting for approval. It unlocks by itself once it clears.',
  'paywall.error.inProgress': 'A purchase is already open. Finish that one first.',
  'paywall.error.unavailable': 'That is not on sale on this device right now.',
  'paywall.error.store': 'The store is having trouble. Try again in a moment.',
  'paywall.error.unknown': 'The purchase did not go through. You have not been charged.',
  /** Paid, but the entitlement never arrived — the failure `ids.ts` is about. */
  'paywall.error.notGranted':
    'The payment went through but the cases have not unlocked yet. Try Restore purchases.',
} as const;

export type StringKey = keyof typeof EN;

/**
 * Everything except English is partial on purpose. A translator working through
 * a release should be able to ship what they have finished without the build
 * failing on what they have not.
 */
export type Catalogue = Partial<Record<StringKey, string>>;

const ES: Catalogue = {
  'common.back': 'Atrás',
  'common.retry': 'Reintentar',
  'common.working': 'Procesando…',
  'common.you': 'Tú',
  'common.restorePurchases': 'Restaurar compras',

  'home.pitch':
    'Alguien ha muerto. Solo tienes sus mensajes. Encuentra la afirmación que no puede ser cierta.',
  'home.cases.title': 'Todos los casos',
  /* Linear flow: a case whose predecessors are unfinished. Distinct from
     home.tile.sealed, which means unbought. */
  'home.tile.lockedByProgress': 'Bloqueado',
  'home.locked.title': 'Todavía no',
  'home.locked.body': 'Termina {title} antes que este. Los casos van en orden.',
  'home.storeUnreachable':
    'No se pudieron comprobar tus compras. Los casos que ya tienes se desbloquearán cuando vuelvas a estar en línea.',
  'home.tile.sealed': 'Sellado',
  'home.tile.toProve': '{count} por probar',
  'home.tile.lockedLabel': '{title}, sellado. {count} contradicciones. Desbloquear.',
  'home.tile.lockedLabelOne': '{title}, sellado. 1 contradicción. Desbloquear.',
  'home.tile.openLabel': '{title}. {count} contradicciones por probar. Abrir.',
  'home.tile.openLabelOne': '{title}. 1 contradicción por probar. Abrir.',

  'home.continue.title': 'Continuar',
  'home.continue.unreadOne': '1 sin leer',
  'home.continue.unreadMany': '{count} sin leer',
  'home.continue.label': 'Continuar {title}.',
  'home.continue.backTo': 'Volver a {thread}.',

  /* The conversation screen. Reading is paced by the player: a tap delivers
     the next message, and the button skips the rest of the thread. */

  'settings.account.section': 'Cuenta',
  /* The front door, and the walkthrough that runs inside the demo case rather
     than in front of it. See app/landing.tsx and src/tutorial/steps.ts. */
  'landing.kicker': 'Un caso en tus mensajes',
  'landing.line1': 'Lo declararon un accidente.',
  'landing.line2': 'Tienes los mensajes de todos de esa noche.',
  'landing.line3': 'Uno de ellos está en dos sitios a la vez.',
  'landing.signIn': 'Iniciar sesión',
  'landing.guest': 'Jugar como invitado',
  'landing.syncNote':
    'Iniciar sesión lleva tus casos a otro teléfono. Puedes hacerlo más tarde desde Ajustes.',
  'tutorial.openThread': 'Estos son los mensajes de esa noche. Abre la conversación de arriba.',
  'tutorial.tapToRead': 'Toca en cualquier parte para que llegue el siguiente mensaje.',
  'tutorial.holdToPin':
    'Ahora mantén pulsado un mensaje. Eso fija lo que afirma: quién estaba dónde, y cuándo.',
  'tutorial.compare':
    'Fija una segunda afirmación y compáralas. Una persona no puede ocupar el mismo minuto en dos sitios.',
  'tutorial.nameThem': 'Lo has probado. Ahora di quién fue.',
  'tutorial.dismiss': 'Entendido',
  'tutorial.dismissLabel': 'Dejar de mostrar estos avisos',
  'tutorial.replayRow': 'Volver a ver el tutorial',
  'tutorial.replayTitle': 'Tutorial reactivado',
  'tutorial.replayBody': 'Los avisos volverán a aparecer la próxima vez que abras el primer caso.',
  'closed.statProved': 'Probadas',
  'closed.statRead': 'Leídos',
  'closed.statThreads': 'Chats',
  'closed.stamp': 'Caso cerrado',
  'closed.named': 'señalado, y probado',
  'closed.next': 'Siguiente caso: {title}',
  'closed.unlockNext': 'Desbloquear {title}',
  'closed.allCases': 'Todos los casos',
  'closed.replay': 'Volver a jugar este caso',
  'closed.replayHint': 'Borra tu progreso en este caso y lo empieza desde el primer mensaje.',
  'closed.finale': 'Ese era el último caso del expediente.',
  'home.tile.solved': 'Resuelto',
  'case.allCases': 'Casos',

  'settings.help.section': 'Ayuda',
  'thread.conversation': 'Conversación',
  'thread.tapToContinue': 'Toca para continuar',
  'thread.skipAll': 'Saltar todo',
  'home.continue.proved': '{proved} de {total} probadas. Última partida {elapsed}.',

  'elapsed.justNow': 'ahora mismo',
  'elapsed.minuteOne': 'hace 1 minuto',
  'elapsed.minuteMany': 'hace {count} minutos',
  'elapsed.hourOne': 'hace 1 hora',
  'elapsed.hourMany': 'hace {count} horas',
  'elapsed.yesterday': 'ayer',
  'elapsed.dayMany': 'hace {count} días',
  'elapsed.lastWeek': 'la semana pasada',
  'elapsed.weekMany': 'hace {count} semanas',
  'elapsed.aWhile': 'hace tiempo',

  'auth.error.generic': 'Algo ha salido mal. Inténtalo de nuevo en un momento.',
  'auth.error.badCredentials':
    'Ese correo y esa contraseña no coinciden con ninguna cuenta. Revisa los dos, o crea una cuenta.',
  'auth.error.emailUnconfirmed':
    'Confirma tu correo primero — el enlace está en tu bandeja de entrada. Mira en spam si no aparece.',
  'auth.error.alreadyRegistered': 'Ese correo ya tiene una cuenta. Inicia sesión.',
  'auth.error.passwordShort': 'Esa contraseña es demasiado corta. Usa al menos 6 caracteres.',
  'auth.error.rateLimit': 'Demasiados intentos. Espera un minuto y vuelve a probar.',
  'auth.error.network':
    'No se ha podido conectar con el servidor. Revisa tu conexión y vuelve a probar — tu progreso está a salvo en este dispositivo.',
  'auth.error.badEmail': 'Eso no parece una dirección de correo. Revísala y vuelve a probar.',
  'sync.notSignedIn': 'No has iniciado sesión. Tu progreso se guarda en este dispositivo.',
  'sync.upToDate': 'Ya estaba todo sincronizado.',
  'sync.downloaded': 'Notas del caso sincronizadas. {count} recuperadas de tu cuenta.',
  'sync.uploaded': 'Notas del caso sincronizadas. {count} guardadas en tu cuenta.',
  'sync.both':
    'Notas del caso sincronizadas. {downloaded} recuperadas, {uploaded} guardadas.',

  'restore.working': 'Consultando con la tienda…',
  'restore.none': 'No se han encontrado compras en esta cuenta de la tienda.',
  'restore.oneRestored': 'Restaurada 1 compra. Tu pack de casos está desbloqueado.',
  'restore.manyRestored': 'Restauradas {count} compras. Tu pack de casos está desbloqueado.',
  'restore.unreachable': 'No se ha podido conectar con la tienda. Revisa tu conexión y vuelve a probar.',

  'case.tab.threads': 'Mensajes',
  'case.tab.board': 'Tablero',
  'case.tab.accuse': 'Acusar',

  'board.record': 'En el expediente',
  'board.record.empty':
    'Nada todavía. Lee los mensajes y mantén pulsado uno para anotar lo que afirma.',
  'board.proven': 'Demostrado',
  'board.proven.count': '{done} de {total}',
  'board.waiting': 'Dos afirmaciones sobre un mismo reloj.',
  'board.slot.empty': 'Fija una afirmación',
  'board.slot.filledLabel': 'Afirmación {n}: {label}. Toca para soltarla.',
  'board.slot.emptyLabel': 'Afirmación {n}: vacía. Fija una afirmación del expediente.',
  'board.compare': 'Comprobar',
  'board.compare.label': 'Comprobar las dos afirmaciones fijadas. {n} de 2 fijadas.',
  'board.subject.one': 'una persona',
  'board.overlap': 'ambas ciertas a la vez',

  'accuse.prompt': '¿Quién los mató?',
  'accuse.sub': 'Nombrar a la persona correcta no basta. Tienes que poder demostrarlo.',
  'accuse.card.none': 'nada demostrado',
  'accuse.card.count': '{n} contradicciones',
  'accuse.card.countOne': '1 contradicción',
  'accuse.card.label':
    'Acusar a {name}. {n} contradicciones demostradas apuntan a esta persona.',
  'accuse.card.labelOne': 'Acusar a {name}. 1 contradicción demostrada apunta a esta persona.',
  'accuse.card.labelNone': 'Acusar a {name}. No hay nada demostrado en su contra.',
  'accuse.sheet.title': 'Acusar a {name}',
  'accuse.sheet.have': 'Lo que tienes',
  'accuse.sheet.none': 'Todavía no hay nada demostrado en su contra.',
  'accuse.sheet.proof': '{n} contradicciones demostradas apuntan a esta persona',
  'accuse.sheet.proofOne': '1 contradicción demostrada apunta a esta persona',
  'accuse.sheet.reassure':
    'Si tus pruebas no encajan con esta persona, se te dirá y podrás nombrar a otra.',
  'accuse.sheet.confirm': 'Acusar',
  'accuse.refusal.proof': 'Todavía no puedes demostrarlo. Algo en su versión sigue en pie.',
  'accuse.refusal.motive':
    'Puedes romper su versión, pero aún no puedes decir por qué. Sigue leyendo.',
  'accuse.refusal.identity': 'Las pruebas que tienes no encajan con esta persona.',
  'accuse.refusal.oneLeft': 'Queda una cosa en su versión que sigue en pie.',
  'accuse.refusal.manyLeft': 'Quedan {n} cosas en su versión que siguen en pie.',

  'verdict.sameStatement': 'Esa es la misma afirmación dos veces.',
  'verdict.differentThings': 'Estas hablan de dos cosas distintas.',
  'verdict.personVsThing': 'Una habla de una persona y la otra de un objeto.',
  'verdict.differentPeople': 'Estas hablan de personas distintas.',
  'verdict.differentTimes': 'Estas hablan de momentos distintos.',
  'verdict.differentKinds': 'Estas hablan de cosas de distinto tipo.',
  'verdict.placeConflict': 'Una persona, dos lugares, el mismo momento.',
  'verdict.actionConflict': 'No pudo estar haciendo ambas cosas a la vez.',
  'verdict.objectConflict': 'Solo una persona pudo tenerlo.',
  'verdict.sameArea': 'Esos dos lugares son la misma zona.',
  'verdict.compatible': 'Esas dos cosas pueden ser ciertas a la vez.',
  'verdict.sameHands': 'Ambas afirmaciones lo ponen en las mismas manos.',
  'verdict.notUnique': 'Podría haber más de uno de esos.',
  'verdict.needTwo': 'Fija dos afirmaciones para compararlas.',
  'verdict.stale': 'Esas afirmaciones ya no están en el expediente.',

  'confront.repeat': 'Eso ya lo has dicho.',
  'confront.close': 'Cerrar el caso',
  'confront.skip': 'Toca para saltar',
  'confront.open': 'Plántaselo a esta persona. Un hecho cada vez.',
  'confront.left': 'Quedan {n} por decir',
  'confront.leftOne': 'Queda 1 por decir',
  'confront.chipLabel': 'Plantear a {name}: {label}',

  'thread.locked': '{n} conversaciones siguen fuera de alcance. Demuestra algo primero.',
  'thread.lockedOne': 'Una conversación sigue fuera de alcance. Demuestra algo primero.',
  'thread.rowLabel': '{title}. {n} sin leer.',
  'thread.rowLabelOne': '{title}. 1 sin leer.',
  'thread.rowLabelNone': '{title}. Ningún mensaje sin leer.',
  'briefing.open': 'Abrir los mensajes',
  'claim.pin': 'Toca para fijarla en el tablero',
  'claim.unpin': 'Ranura {n}: toca para soltarla',

  'a11y.volume': 'Volumen de los efectos de sonido',
  'a11y.loadingCases': 'Cargando casos',
  'a11y.loadingThreads': 'Cargando conversaciones',
  'a11y.typing': 'Alguien está escribiendo',
  'a11y.close': 'Cerrar',

  'settings.title': 'Ajustes',
  'settings.sound.section': 'Sonido',
  'settings.sound.label': 'Efectos de sonido',
  'settings.sound.detail':
    'Señales breves cuando llega un mensaje y cuando se rompe una contradicción.',
  'settings.volume.label': 'Volumen',
  'settings.feel.section': 'Sensación',
  'settings.haptics.label': 'Vibración',
  'settings.haptics.detail': 'Toques que se sienten al fijar una declaración o confirmar un dato.',
  'settings.motion.label': 'Reducir movimiento',
  'settings.motion.detail':
    'Los mensajes aparecen al instante y los sonidos decorativos se silencian.',
  'settings.language.section': 'Idioma',
  'settings.language.label': 'Idioma',
  'settings.language.hint': 'Abre la lista de idiomas',
  'settings.language.footnote':
    'Los casos se traducen por separado. Cualquier caso todavía sin traducir permanece en inglés.',
  'settings.purchases.section': 'Compras',
  'settings.restore.detail': '¿Ya compraste el pack de casos? Recupéralo en este dispositivo.',
  'settings.progress.section': 'Progreso',
  'settings.reset.label': 'Borrar todo el progreso',
  'settings.reset.detail': 'Borra todas las partidas guardadas. Las compras se conservan.',
  'settings.reset.confirm': '¿Borrar todo el progreso?',
  'settings.reset.confirmBody':
    'Todos los casos vuelven a estar sin leer y se olvida cada contradicción que probaste. Las compras no se ven afectadas. Esto no se puede deshacer.',
  'settings.reset.keep': 'Conservar',
  'settings.reset.erase': 'Borrar',
  'settings.reset.erasedNone': 'No había progreso guardado que borrar.',
  'settings.reset.erasedOne': 'Se borró 1 caso guardado.',
  'settings.reset.erasedMany': 'Se borraron {count} casos guardados.',
  'settings.reset.failed': 'No se pudo borrar el progreso. Inténtalo de nuevo.',
  'settings.about.section': 'Acerca de',
  'settings.about.version': 'Versión',
  'settings.about.privacy': 'Qué guarda esta aplicación',
  'settings.about.licences': 'Licencias de código abierto',

  'settings.privacy.progress': 'Tu progreso en cada caso se guarda en este dispositivo.',
  'settings.privacy.purchases':
    'Las compras las gestionan la App Store o Google Play a través de RevenueCat. Esta aplicación nunca ve tus datos de pago.',
  'settings.privacy.noTracking':
    'Esta versión no tiene anuncios ni SDK de analítica o seguimiento.',
  'settings.privacy.deletion': 'Si eliminas la aplicación, tu progreso se elimina con ella.',

  'language.title': 'Idioma',
  'language.footnote':
    'Esto traduce la aplicación. Los casos se traducen por separado, y cualquier caso todavía sin traducir permanece en inglés.',

  'signIn.title': 'Iniciar sesión',
  'signIn.heading': 'Lleva tus notas del caso contigo',
  'signIn.why': 'Una cuenta lleva tu progreso a otro teléfono.',
  'signIn.createAccount': 'Crear cuenta',
  'signIn.email': 'Correo electrónico',
  'signIn.password': 'Contraseña',
  'signIn.alreadyRegistered': 'Ese correo ya tiene una cuenta. Inicia sesión.',
  'signIn.confirmEmail': 'Busca en {email} un enlace de confirmación y luego inicia sesión.',
  'signIn.storesNote':
    'Una cuenta guarda tu correo electrónico y qué mensajes has leído. Nada más.',
  'signIn.leave': 'Seguir jugando en este teléfono',
  'signIn.leaveLabel': 'Seguir jugando en este teléfono, sin cuenta',
  'signIn.off.title': 'Las cuentas están desactivadas',
  'signIn.signedIn.title': 'Sesión iniciada',
  'signIn.account': 'Tu cuenta',
  'signIn.sync': 'Sincronizar ahora',
  'signIn.syncing': 'Sincronizando…',
  'signIn.backToCases': 'Volver a los casos',
  'signIn.signOut': 'Cerrar sesión',
  'signIn.signOutNote':
    'Al cerrar sesión, todas las partidas guardadas permanecen en este teléfono. No se borra nada.',
  'signIn.problem.emailEmpty': 'Escribe tu correo electrónico.',
  'signIn.problem.emailShape': 'Eso no parece un correo electrónico.',
  'signIn.problem.passwordEmpty': 'Escribe tu contraseña.',
  'signIn.rulesLabel': 'Tu contraseña necesita',
  'signIn.rule.length': 'Al menos {count} caracteres',
  'signIn.rule.lowercase': 'Una minúscula',
  'signIn.rule.uppercase': 'Una mayúscula',
  'signIn.rule.symbol': 'Un símbolo',
  'signIn.rule.number': 'Un número',
  'signIn.strength.weak': 'Débil',
  'signIn.strength.fair': 'Aceptable',
  'signIn.strength.strong': 'Fuerte',
  'signIn.showPassword': 'Mostrar contraseña',
  'signIn.hidePassword': 'Ocultar contraseña',
  'signIn.forgot': '¿Olvidaste tu contraseña?',
  'signIn.reset.sent':
    'Si esa dirección tiene una cuenta, el enlace ya va en camino. Revisa tu bandeja de entrada y la carpeta de spam.',
  'signIn.reset.needEmail': 'Escribe primero tu correo electrónico y vuelve a tocar aquí.',
  'reset.title': 'Elige una contraseña nueva',
  'reset.body': 'Enviamos un código a {email}. Caduca en una hora.',
  'reset.code': 'Código del correo',
  'reset.newPassword': 'Contraseña nueva',
  'reset.submit': 'Guardar contraseña',
  'reset.resend': 'Enviar otro código',
  'reset.needCode': 'Escribe el código del correo.',
  'auth.error.badCode': 'Ese código caducó o no coincide. Pide otro.',
  'auth.error.leakedPassword':
    'Esa contraseña ha aparecido en una filtración, así que no es segura. Prueba con otra.',
  'auth.error.samePassword': 'Esa es la contraseña que ya tienes. Elige otra.',

  'paywall.title': 'Más casos',
  'paywall.body':
    'Otra muerte, otro teléfono, otra historia que no se sostiene. Desbloquea el pack de casos para seguir.',
  'paywall.bullet.case': 'Doce casos completos más',
  'paywall.bullet.suspects': 'Nuevos sospechosos, nuevas contradicciones',
  'paywall.bullet.permanent': 'Tuyo para siempre: esto no es una suscripción',
  'paywall.empty': 'La tienda no tiene nada que vender ahora mismo. Inténtalo de nuevo en un momento.',
  'paywall.unreachable': 'No se pudo conectar con la tienda.',
  'paywall.failed': 'La compra no se completó. No se te ha cobrado.',
  'paywall.unlock': 'Desbloquear · {price}',
  'paywall.unlockLabel': 'Desbloquear el pack de casos por {price}',
  'paywall.notNow': 'Ahora no',
  'paywall.unlockCaseLabel': 'Desbloquear este caso por {price}',
  'paywall.choose': 'Dos maneras de entrar',
  'paywall.option.single': 'Este caso',
  'paywall.option.singleNote': 'Desbloquea {title} por separado',
  'paywall.option.bundle': 'Los {count} casos',
  'paywall.option.bundleNote': 'Todos los casos de pago, este incluido',
  'paywall.option.best': 'La mejor opción',
  'paywall.settling': 'Confirmando con la tienda…',
  'paywall.done.title': 'Gracias por tu compra',
  'paywall.done.body': 'Que lo disfrutes.',
  'paywall.done.cta': 'Volver a los casos',
  'paywall.failedTitle': 'Tu pago no se completó',
  'paywall.error.cancelled': 'No se ha comprado nada. No se te ha cobrado.',
  'paywall.error.offline':
    'Sin conexión con la tienda. Revisa tu red e inténtalo de nuevo: no se te ha cobrado nada.',
  'paywall.error.declined': 'La tienda rechazó el pago. No se te ha cobrado.',
  'paywall.error.alreadyOwned': 'Ya es tuyo. Restaurándolo ahora.',
  'paywall.error.pending':
    'El pago está pendiente de aprobación. Se desbloqueará solo en cuanto se apruebe.',
  'paywall.error.inProgress': 'Ya hay una compra abierta. Termina esa primero.',
  'paywall.error.unavailable': 'Eso no está a la venta en este dispositivo ahora mismo.',
  'paywall.error.store': 'La tienda está teniendo problemas. Inténtalo de nuevo en un momento.',
  'paywall.error.unknown': 'La compra no se completó. No se te ha cobrado.',
  'paywall.error.notGranted':
    'El pago se realizó, pero los casos aún no se han desbloqueado. Prueba con Restaurar compras.',
};

/**
 * Locales with no catalogue yet resolve to an empty one and therefore to
 * English, which is the same path a partially translated locale takes for its
 * missing keys. One code path, not two.
 */
const FR: Catalogue = {
  'common.back': 'Retour',
  'common.retry': 'Réessayer',
  'common.working': 'En cours…',
  // "Moi", not "Vous". This labels the player's own message bubble, and every
  // messaging app in French names that seat from the sender's side.
  'common.you': 'Moi',
  'common.restorePurchases': 'Restaurer les achats',

  'home.pitch':
    'Quelqu’un est mort. Vous n’avez que ses messages. Trouvez la déclaration qui ne peut pas être vraie.',
  'home.cases.title': 'Toutes les affaires',
  /* Linear flow: a case whose predecessors are unfinished. Distinct from
     home.tile.sealed, which means unbought. */
  'home.tile.lockedByProgress': 'Verrouillée',
  'home.locked.title': 'Pas encore',
  'home.locked.body': 'Terminez {title} d’abord. Les affaires se suivent dans l’ordre.',
  'home.storeUnreachable':
    'Impossible de vérifier vos achats. Les affaires que vous possédez se déverrouilleront dès le retour de la connexion.',
  'home.tile.sealed': 'Scellée',
  'home.tile.toProve': '{count} à prouver',
  'home.tile.lockedLabel': '{title}, scellée. {count} contradictions. Déverrouiller.',
  'home.tile.lockedLabelOne': '{title}, scellée. 1 contradiction. Déverrouiller.',
  'home.tile.openLabel': '{title}. {count} contradictions à prouver. Ouvrir.',
  'home.tile.openLabelOne': '{title}. 1 contradiction à prouver. Ouvrir.',

  'home.continue.title': 'Continuer',
  'home.continue.unreadOne': '1 non lu',
  'home.continue.unreadMany': '{count} non lus',
  'home.continue.label': 'Continuer {title}.',
  'home.continue.backTo': 'Retour à {thread}.',

  /* The conversation screen. Reading is paced by the player: a tap delivers
     the next message, and the button skips the rest of the thread. */

  'settings.account.section': 'Compte',
  /* The front door, and the walkthrough that runs inside the demo case rather
     than in front of it. See app/landing.tsx and src/tutorial/steps.ts. */
  'landing.kicker': 'Une affaire dans vos messages',
  'landing.line1': 'Ils ont conclu à un accident.',
  'landing.line2': 'Vous avez les messages de tout le monde, ceux de cette nuit-là.',
  'landing.line3': 'L’un d’eux est à deux endroits en même temps.',
  'landing.signIn': 'Se connecter',
  'landing.guest': 'Jouer en invité',
  'landing.syncNote':
    'La connexion emporte vos affaires sur un autre téléphone. Vous pouvez le faire plus tard depuis les Réglages.',
  'tutorial.openThread': 'Voici les messages de cette nuit-là. Ouvrez la conversation du haut.',
  'tutorial.tapToRead': 'Touchez n’importe où pour faire arriver le message suivant.',
  'tutorial.holdToPin':
    'Maintenant, appuyez longuement sur un message. Cela épingle ce qu’il affirme : qui était où, et quand.',
  'tutorial.compare':
    'Épinglez une deuxième affirmation, puis comparez-les. Une personne ne peut pas occuper la même minute à deux endroits.',
  'tutorial.nameThem': 'Vous l’avez prouvé. Dites maintenant qui c’est.',
  'tutorial.dismiss': 'Compris',
  'tutorial.dismissLabel': 'Ne plus afficher ces indications',
  'tutorial.replayRow': 'Revoir le guide',
  'tutorial.replayTitle': 'Guide réactivé',
  'tutorial.replayBody':
    'Les indications réapparaîtront à la prochaine ouverture de la première affaire.',
  'closed.statProved': 'Prouvées',
  'closed.statRead': 'Lus',
  'closed.statThreads': 'Fils',
  'closed.stamp': 'Affaire classée',
  'closed.named': 'mise en cause, preuves à l’appui',
  'closed.next': 'Affaire suivante : {title}',
  'closed.unlockNext': 'Débloquer {title}',
  'closed.allCases': 'Toutes les affaires',
  'closed.replay': 'Rejouer cette affaire',
  'closed.replayHint':
    'Efface votre progression dans cette affaire et la reprend au premier message.',
  'closed.finale': 'C’était la dernière affaire du dossier.',
  'home.tile.solved': 'Résolue',
  'case.allCases': 'Affaires',

  'settings.help.section': 'Aide',
  'thread.conversation': 'Conversation',
  'thread.tapToContinue': 'Appuyez pour continuer',
  'thread.skipAll': 'Tout passer',
  'home.continue.proved': '{proved} sur {total} prouvées. Dernière session {elapsed}.',

  'elapsed.justNow': "à l'instant",
  'elapsed.minuteOne': 'il y a 1 minute',
  'elapsed.minuteMany': 'il y a {count} minutes',
  'elapsed.hourOne': 'il y a 1 heure',
  'elapsed.hourMany': 'il y a {count} heures',
  'elapsed.yesterday': 'hier',
  'elapsed.dayMany': 'il y a {count} jours',
  'elapsed.lastWeek': 'la semaine dernière',
  'elapsed.weekMany': 'il y a {count} semaines',
  'elapsed.aWhile': 'il y a un moment',

  'auth.error.generic': 'Quelque chose a mal tourné. Réessaie dans un instant.',
  'auth.error.badCredentials':
    'Cet e-mail et ce mot de passe ne correspondent à aucun compte. Vérifie les deux, ou crée un compte.',
  'auth.error.emailUnconfirmed':
    'Confirme d’abord ton e-mail — le lien est dans ta boîte de réception. Regarde dans les spams s’il n’y est pas.',
  'auth.error.alreadyRegistered': 'Cet e-mail a déjà un compte. Connecte-toi.',
  'auth.error.passwordShort': 'Ce mot de passe est trop court. Utilise au moins 6 caractères.',
  'auth.error.rateLimit': 'Trop de tentatives. Attends une minute et réessaie.',
  'auth.error.network':
    'Impossible de joindre le serveur. Vérifie ta connexion et réessaie — ta progression est en sécurité sur cet appareil.',
  'auth.error.badEmail': 'Cela ne ressemble pas à une adresse e-mail. Vérifie-la et réessaie.',
  // "Aucun compte connecté", not "Tu n'es pas connecté" — the participle would
  // agree with the player, who has no gender. Same rule as the case packs.
  'sync.notSignedIn': 'Aucun compte connecté. Ta progression est enregistrée sur cet appareil.',
  'sync.upToDate': 'Tout était déjà synchronisé.',
  'sync.downloaded': 'Notes d’enquête synchronisées. {count} récupérées depuis ton compte.',
  'sync.uploaded': 'Notes d’enquête synchronisées. {count} sauvegardées sur ton compte.',
  'sync.both':
    'Notes d’enquête synchronisées. {downloaded} récupérées, {uploaded} sauvegardées.',

  'restore.working': 'Vérification auprès de la boutique…',
  'restore.none': 'Aucun achat trouvé pour ce compte de boutique.',
  'restore.oneRestored': '1 achat restauré. Ton pack d’enquêtes est débloqué.',
  'restore.manyRestored': '{count} achats restaurés. Ton pack d’enquêtes est débloqué.',
  'restore.unreachable': 'Impossible de joindre la boutique. Vérifie ta connexion et réessaie.',

  'case.tab.threads': 'Messages',
  'case.tab.board': 'Tableau',
  'case.tab.accuse': 'Accuser',

  'board.record': 'Au dossier',
  'board.record.empty':
    'Rien pour l’instant. Lis les messages et maintiens-en un pour noter ce qu’il affirme.',
  'board.proven': 'Prouvé',
  'board.proven.count': '{done} sur {total}',
  'board.waiting': 'Deux déclarations sur une même horloge.',
  'board.slot.empty': 'Épingle une déclaration',
  'board.slot.filledLabel': 'Déclaration {n} : {label}. Touche pour la retirer.',
  'board.slot.emptyLabel': 'Déclaration {n} : vide. Épingle une déclaration du dossier.',
  'board.compare': 'Vérifier',
  'board.compare.label': 'Vérifier les deux déclarations épinglées. {n} sur 2 épinglées.',
  'board.subject.one': 'une seule personne',
  'board.overlap': 'vraies en même temps',

  'accuse.prompt': 'Qui les a tués ?',
  'accuse.sub': 'Nommer la bonne personne ne suffit pas. Il faut pouvoir le prouver.',
  'accuse.card.none': 'rien de prouvé',
  'accuse.card.count': '{n} contradictions',
  'accuse.card.countOne': '1 contradiction',
  'accuse.card.label': 'Accuser {name}. {n} contradictions prouvées désignent cette personne.',
  'accuse.card.labelOne': 'Accuser {name}. 1 contradiction prouvée désigne cette personne.',
  'accuse.card.labelNone': 'Accuser {name}. Rien de prouvé contre cette personne.',
  'accuse.sheet.title': 'Accuser {name}',
  'accuse.sheet.have': 'Ce que tu as',
  'accuse.sheet.none': 'Rien de prouvé contre cette personne pour l’instant.',
  'accuse.sheet.proof': '{n} contradictions prouvées désignent cette personne',
  'accuse.sheet.proofOne': '1 contradiction prouvée désigne cette personne',
  'accuse.sheet.reassure':
    'Si tes preuves ne correspondent pas, on te le dira et tu pourras en nommer une autre.',
  'accuse.sheet.confirm': 'Accuser',
  'accuse.refusal.proof':
    'Tu ne peux pas encore le prouver. Quelque chose dans sa version tient toujours.',
  'accuse.refusal.motive':
    'Tu peux casser sa version, mais tu ne peux pas encore dire pourquoi. Continue à lire.',
  'accuse.refusal.identity': 'Les preuves que tu as ne correspondent pas à cette personne.',
  'accuse.refusal.oneLeft': 'Une chose dans sa version tient toujours.',
  'accuse.refusal.manyLeft': '{n} choses dans sa version tiennent toujours.',

  'verdict.sameStatement': 'C’est deux fois la même déclaration.',
  'verdict.differentThings': 'Elles parlent de deux choses différentes.',
  'verdict.personVsThing': 'L’une parle d’une personne, l’autre d’un objet.',
  'verdict.differentPeople': 'Elles parlent de personnes différentes.',
  'verdict.differentTimes': 'Elles parlent de moments différents.',
  'verdict.differentKinds': 'Elles parlent de choses de nature différente.',
  'verdict.placeConflict': 'Une personne, deux endroits, le même moment.',
  'verdict.actionConflict': 'Cette personne ne pouvait pas faire les deux à la fois.',
  'verdict.objectConflict': 'Une seule personne pouvait l’avoir.',
  'verdict.sameArea': 'Ces deux endroits sont dans la même zone.',
  'verdict.compatible': 'Ces deux choses peuvent être vraies en même temps.',
  'verdict.sameHands': 'Les deux déclarations le mettent dans les mêmes mains.',
  'verdict.notUnique': 'Il pourrait y en avoir plusieurs.',
  'verdict.needTwo': 'Épingle deux déclarations pour les comparer.',
  'verdict.stale': 'Ces déclarations ne sont plus au dossier.',

  'confront.repeat': 'Tu l’as déjà dit.',
  'confront.close': 'Clore l’affaire',
  'confront.skip': 'Touche pour passer',
  'confront.open': 'Mets cette personne devant les faits. Un fait à la fois.',
  'confront.left': 'Encore {n} à dire',
  'confront.leftOne': 'Encore 1 à dire',
  'confront.chipLabel': 'Opposer à {name} : {label}',

  'thread.locked': '{n} conversations sont encore hors de portée. Prouve d’abord quelque chose.',
  'thread.lockedOne': 'Une conversation est encore hors de portée. Prouve d’abord quelque chose.',
  'thread.rowLabel': '{title}. {n} non lus.',
  'thread.rowLabelOne': '{title}. 1 non lu.',
  'thread.rowLabelNone': '{title}. Aucun message non lu.',
  'briefing.open': 'Ouvrir les messages',
  'claim.pin': 'Touche pour l’épingler au tableau',
  'claim.unpin': 'Emplacement {n} — touche pour la retirer',

  'a11y.volume': 'Volume des effets sonores',
  'a11y.loadingCases': 'Chargement des affaires',
  'a11y.loadingThreads': 'Chargement des conversations',
  'a11y.typing': 'Quelqu’un écrit',
  'a11y.close': 'Fermer',

  'settings.title': 'Réglages',
  'settings.sound.section': 'Son',
  'settings.sound.label': 'Effets sonores',
  'settings.sound.detail':
    'De brefs signaux quand un message arrive et quand une contradiction cède.',
  'settings.volume.label': 'Volume',
  'settings.feel.section': 'Ressenti',
  'settings.haptics.label': 'Retour haptique',
  'settings.haptics.detail':
    'Des vibrations quand vous épinglez une déclaration ou confirmez un fait.',
  'settings.motion.label': 'Réduire les animations',
  'settings.motion.detail':
    'Les messages apparaissent instantanément et les sons décoratifs restent silencieux.',
  'settings.language.section': 'Langue',
  'settings.language.label': 'Langue',
  'settings.language.hint': 'Ouvre la liste des langues',
  'settings.language.footnote':
    'Les affaires sont traduites séparément. Toute affaire qui n’a pas encore été traduite reste en anglais.',
  'settings.purchases.section': 'Achats',
  'settings.restore.detail':
    'Vous avez déjà acheté le pack d’affaires ? Récupérez-le sur cet appareil.',
  'settings.progress.section': 'Progression',
  'settings.reset.label': 'Effacer toute la progression',
  'settings.reset.detail': 'Efface toutes les sauvegardes. Les achats sont conservés.',
  'settings.reset.confirm': 'Effacer toute la progression ?',
  'settings.reset.confirmBody':
    'Chaque affaire redevient non lue, et chaque contradiction que vous avez prouvée est oubliée. Les achats ne sont pas touchés. C’est irréversible.',
  'settings.reset.keep': 'Garder',
  'settings.reset.erase': 'Effacer',
  'settings.reset.erasedNone': 'Il n’y avait aucune progression à effacer.',
  'settings.reset.erasedOne': '1 affaire sauvegardée effacée.',
  'settings.reset.erasedMany': '{count} affaires sauvegardées effacées.',
  'settings.reset.failed': 'Impossible d’effacer la progression. Réessayez.',
  'settings.about.section': 'À propos',
  'settings.about.version': 'Version',
  'settings.about.privacy': 'Ce que cette app conserve',
  'settings.about.licences': 'Licences open source',

  'settings.privacy.progress':
    'Votre progression dans chaque affaire est conservée sur cet appareil.',
  'settings.privacy.purchases':
    'Les achats sont gérés par l’App Store ou Google Play via RevenueCat. Cette app ne voit jamais vos informations de paiement.',
  'settings.privacy.noTracking':
    'Cette version ne contient ni publicité, ni outil d’analyse ou de suivi.',
  'settings.privacy.deletion': 'Supprimer l’app supprime votre progression avec elle.',

  'language.title': 'Langue',
  'language.footnote':
    'Ceci traduit l’application. Les affaires sont traduites séparément, et toute affaire qui n’a pas encore été traduite reste en anglais.',

  'signIn.title': 'Connexion',
  'signIn.heading': 'Emportez vos notes d’enquête',
  'signIn.why': 'Un compte transfère votre progression sur un autre téléphone.',
  'signIn.createAccount': 'Créer un compte',
  'signIn.email': 'E-mail',
  'signIn.password': 'Mot de passe',
  'signIn.alreadyRegistered': 'Cette adresse a déjà un compte. Connectez-vous.',
  'signIn.confirmEmail': 'Consultez {email} pour le lien de confirmation, puis connectez-vous.',
  'signIn.storesNote':
    'Un compte conserve votre adresse e-mail et les messages que vous avez lus. Rien d’autre.',
  'signIn.leave': 'Continuer sur ce téléphone',
  'signIn.leaveLabel': 'Continuer sur ce téléphone, sans compte',
  'signIn.off.title': 'Les comptes sont désactivés',
  'signIn.signedIn.title': 'Connecté',
  'signIn.account': 'Votre compte',
  'signIn.sync': 'Synchroniser',
  'signIn.syncing': 'Synchronisation…',
  'signIn.backToCases': 'Retour aux affaires',
  'signIn.signOut': 'Se déconnecter',
  'signIn.signOutNote':
    'La déconnexion laisse toutes les sauvegardes sur ce téléphone. Rien n’est supprimé.',
  'signIn.problem.emailEmpty': 'Saisissez votre adresse e-mail.',
  'signIn.problem.emailShape': 'Cela ne ressemble pas à une adresse e-mail.',
  'signIn.problem.passwordEmpty': 'Saisissez votre mot de passe.',
  'signIn.rulesLabel': 'Votre mot de passe doit contenir',
  'signIn.rule.length': 'Au moins {count} caractères',
  'signIn.rule.lowercase': 'Une minuscule',
  'signIn.rule.uppercase': 'Une majuscule',
  'signIn.rule.symbol': 'Un symbole',
  'signIn.rule.number': 'Un chiffre',
  'signIn.strength.weak': 'Faible',
  'signIn.strength.fair': 'Correct',
  'signIn.strength.strong': 'Fort',
  'signIn.showPassword': 'Afficher le mot de passe',
  'signIn.hidePassword': 'Masquer le mot de passe',
  'signIn.forgot': 'Mot de passe oublié ?',
  'signIn.reset.sent':
    'Si cette adresse a un compte, le lien est déjà parti. Vérifiez votre boîte de réception, et vos spams.',
  'signIn.reset.needEmail': 'Saisissez d’abord votre adresse e-mail, puis touchez de nouveau.',
  'reset.title': 'Choisissez un nouveau mot de passe',
  'reset.body': 'Nous avons envoyé un code à {email}. Il expire dans une heure.',
  'reset.code': 'Code reçu par e-mail',
  'reset.newPassword': 'Nouveau mot de passe',
  'reset.submit': 'Enregistrer le mot de passe',
  'reset.resend': 'Envoyer un autre code',
  'reset.needCode': 'Saisissez le code reçu par e-mail.',
  'auth.error.badCode': 'Ce code a expiré ou ne correspond pas. Demandez-en un autre.',
  'auth.error.leakedPassword':
    'Ce mot de passe est apparu dans une fuite de données, il n’est donc pas sûr. Essayez-en un autre.',
  'auth.error.samePassword': 'C’est le mot de passe que vous avez déjà. Choisissez-en un autre.',

  'paywall.title': 'Plus d’affaires',
  'paywall.body':
    'Une autre mort, un autre téléphone, une autre histoire qui ne tient pas. Déverrouillez le pack pour continuer.',
  'paywall.bullet.case': 'Douze affaires complètes de plus',
  'paywall.bullet.suspects': 'De nouveaux suspects, de nouvelles contradictions',
  'paywall.bullet.permanent': 'À vous définitivement — ce n’est pas un abonnement',
  'paywall.empty': 'La boutique n’a rien à proposer pour le moment. Réessayez dans un instant.',
  'paywall.unreachable': 'Impossible de joindre la boutique.',
  'paywall.failed': 'L’achat n’a pas abouti. Vous n’avez pas été débité.',
  'paywall.unlock': 'Déverrouiller · {price}',
  'paywall.unlockLabel': 'Déverrouiller le pack d’affaires pour {price}',
  'paywall.notNow': 'Plus tard',
  'paywall.unlockCaseLabel': 'Déverrouiller cette affaire pour {price}',
  'paywall.choose': 'Deux façons d’entrer',
  'paywall.option.single': 'Cette affaire',
  'paywall.option.singleNote': 'Déverrouille {title} seule',
  'paywall.option.bundle': 'Les {count} affaires',
  'paywall.option.bundleNote': 'Toutes les affaires payantes, celle-ci comprise',
  'paywall.option.best': 'Le meilleur choix',
  'paywall.settling': 'Confirmation auprès de la boutique…',
  'paywall.done.title': 'Merci pour votre achat',
  'paywall.done.body': 'Bon jeu.',
  'paywall.done.cta': 'Retour aux affaires',
  'paywall.failedTitle': 'Votre paiement n’a pas abouti',
  'paywall.error.cancelled': 'Rien n’a été acheté. Vous n’avez pas été débité.',
  'paywall.error.offline':
    'Pas de connexion à la boutique. Vérifiez votre réseau et réessayez : rien n’a été débité.',
  'paywall.error.declined': 'La boutique a refusé le paiement. Vous n’avez pas été débité.',
  'paywall.error.alreadyOwned': 'Vous le possédez déjà. Restauration en cours.',
  'paywall.error.pending':
    'Le paiement attend une approbation. Le déverrouillage se fera tout seul une fois validé.',
  'paywall.error.inProgress': 'Un achat est déjà en cours. Terminez-le d’abord.',
  'paywall.error.unavailable': 'Ce n’est pas en vente sur cet appareil pour le moment.',
  'paywall.error.store': 'La boutique rencontre un problème. Réessayez dans un instant.',
  'paywall.error.unknown': 'L’achat n’a pas abouti. Vous n’avez pas été débité.',
  'paywall.error.notGranted':
    'Le paiement est passé mais les affaires ne sont pas encore déverrouillées. Essayez Restaurer les achats.',
};

/**
 * German uses "du" throughout, not "Sie". Games in German are informal almost
 * without exception, and a murder mystery that addresses the player formally
 * sounds like a bank.
 */
const DE: Catalogue = {
  'common.back': 'Zurück',
  'common.retry': 'Erneut versuchen',
  'common.working': 'Wird ausgeführt…',
  'common.you': 'Ich',
  'common.restorePurchases': 'Käufe wiederherstellen',

  'home.pitch':
    'Jemand ist tot. Alles, was du hast, sind die Nachrichten. Finde die Aussage, die nicht wahr sein kann.',
  'home.cases.title': 'Alle Fälle',
  /* Linear flow: a case whose predecessors are unfinished. Distinct from
     home.tile.sealed, which means unbought. */
  'home.tile.lockedByProgress': 'Gesperrt',
  'home.locked.title': 'Noch nicht',
  'home.locked.body': 'Schließe zuerst {title} ab. Die Fälle laufen der Reihe nach.',
  'home.storeUnreachable':
    'Deine Käufe konnten nicht geprüft werden. Fälle, die dir gehören, werden freigeschaltet, sobald du wieder online bist.',
  'home.tile.sealed': 'Versiegelt',
  'home.tile.toProve': '{count} zu beweisen',
  'home.tile.lockedLabel': '{title}, versiegelt. {count} Widersprüche. Freischalten.',
  'home.tile.lockedLabelOne': '{title}, versiegelt. 1 Widerspruch. Freischalten.',
  'home.tile.openLabel': '{title}. {count} Widersprüche zu beweisen. Öffnen.',
  'home.tile.openLabelOne': '{title}. 1 Widerspruch zu beweisen. Öffnen.',

  'home.continue.title': 'Fortsetzen',
  'home.continue.unreadOne': '1 ungelesen',
  'home.continue.unreadMany': '{count} ungelesen',
  'home.continue.label': '{title} fortsetzen.',
  'home.continue.backTo': 'Zurück zu {thread}.',

  /* The conversation screen. Reading is paced by the player: a tap delivers
     the next message, and the button skips the rest of the thread. */

  'settings.account.section': 'Konto',
  /* The front door, and the walkthrough that runs inside the demo case rather
     than in front of it. See app/landing.tsx and src/tutorial/steps.ts. */
  'landing.kicker': 'Ein Fall in deinen Nachrichten',
  'landing.line1': 'Es wurde als Unfall zu den Akten gelegt.',
  'landing.line2': 'Du hast die Nachrichten aller Beteiligten aus jener Nacht.',
  'landing.line3': 'Einer von ihnen ist an zwei Orten zugleich.',
  'landing.signIn': 'Anmelden',
  'landing.guest': 'Als Gast spielen',
  'landing.syncNote':
    'Mit einem Konto nimmst du deine Fälle auf ein anderes Telefon mit. Du kannst das später in den Einstellungen tun.',
  'tutorial.openThread': 'Das sind die Nachrichten aus jener Nacht. Öffne das oberste Gespräch.',
  'tutorial.tapToRead': 'Tippe irgendwo hin, damit die nächste Nachricht kommt.',
  'tutorial.holdToPin':
    'Halte jetzt eine Nachricht gedrückt. Das merkt vor, was sie behauptet: wer wo war, und wann.',
  'tutorial.compare':
    'Merke eine zweite Aussage vor und vergleiche beide. Eine Person kann dieselbe Minute nicht an zwei Orten verbringen.',
  'tutorial.nameThem': 'Du hast es bewiesen. Sag jetzt, wer es war.',
  'tutorial.dismiss': 'Verstanden',
  'tutorial.dismissLabel': 'Diese Hinweise nicht mehr zeigen',
  'tutorial.replayRow': 'Anleitung erneut anzeigen',
  'tutorial.replayTitle': 'Anleitung ist wieder an',
  'tutorial.replayBody':
    'Die Hinweise erscheinen wieder, wenn du den ersten Fall das nächste Mal öffnest.',
  'closed.statProved': 'Bewiesen',
  'closed.statRead': 'Gelesen',
  'closed.statThreads': 'Chats',
  'closed.stamp': 'Fall geschlossen',
  'closed.named': 'benannt, und bewiesen',
  'closed.next': 'Nächster Fall: {title}',
  'closed.unlockNext': '{title} freischalten',
  'closed.allCases': 'Alle Fälle',
  'closed.replay': 'Diesen Fall noch einmal spielen',
  'closed.replayHint':
    'Löscht deinen Fortschritt in diesem Fall und beginnt bei der ersten Nachricht.',
  'closed.finale': 'Das war der letzte Fall in der Akte.',
  'home.tile.solved': 'Gelöst',
  'case.allCases': 'Fälle',

  'settings.help.section': 'Hilfe',
  'thread.conversation': 'Unterhaltung',
  'thread.tapToContinue': 'Zum Fortfahren tippen',
  'thread.skipAll': 'Alles überspringen',
  'home.continue.proved': '{proved} von {total} bewiesen. Zuletzt gespielt {elapsed}.',

  'elapsed.justNow': 'gerade eben',
  'elapsed.minuteOne': 'vor 1 Minute',
  'elapsed.minuteMany': 'vor {count} Minuten',
  'elapsed.hourOne': 'vor 1 Stunde',
  'elapsed.hourMany': 'vor {count} Stunden',
  'elapsed.yesterday': 'gestern',
  'elapsed.dayMany': 'vor {count} Tagen',
  'elapsed.lastWeek': 'letzte Woche',
  'elapsed.weekMany': 'vor {count} Wochen',
  'elapsed.aWhile': 'vor längerer Zeit',

  'auth.error.generic': 'Etwas ist schiefgelaufen. Versuch es gleich noch einmal.',
  'auth.error.badCredentials':
    'Diese E-Mail und dieses Passwort passen zu keinem Konto. Prüf beides, oder leg ein Konto an.',
  'auth.error.emailUnconfirmed':
    'Bestätige zuerst deine E-Mail — der Link liegt in deinem Postfach. Sieh im Spam nach, falls er nicht da ist.',
  'auth.error.alreadyRegistered': 'Für diese E-Mail gibt es schon ein Konto. Melde dich an.',
  'auth.error.passwordShort': 'Dieses Passwort ist zu kurz. Nimm mindestens 6 Zeichen.',
  'auth.error.rateLimit': 'Zu viele Versuche. Warte eine Minute und versuch es noch einmal.',
  'auth.error.network':
    'Der Server war nicht erreichbar. Prüf deine Verbindung und versuch es noch einmal — dein Fortschritt ist auf diesem Gerät sicher.',
  'auth.error.badEmail': 'Das sieht nicht nach einer E-Mail-Adresse aus. Prüf sie und versuch es noch einmal.',
  'sync.notSignedIn': 'Kein Konto angemeldet. Dein Fortschritt wird auf diesem Gerät gespeichert.',
  'sync.upToDate': 'Es war schon alles synchron.',
  'sync.downloaded': 'Fallnotizen synchronisiert. {count} aus deinem Konto zurückgeholt.',
  'sync.uploaded': 'Fallnotizen synchronisiert. {count} in deinem Konto gesichert.',
  'sync.both': 'Fallnotizen synchronisiert. {downloaded} zurückgeholt, {uploaded} gesichert.',

  'restore.working': 'Wird im Store geprüft…',
  'restore.none': 'Für dieses Store-Konto wurden keine Käufe gefunden.',
  'restore.oneRestored': '1 Kauf wiederhergestellt. Dein Fallpaket ist freigeschaltet.',
  'restore.manyRestored': '{count} Käufe wiederhergestellt. Dein Fallpaket ist freigeschaltet.',
  'restore.unreachable': 'Der Store war nicht erreichbar. Prüf deine Verbindung und versuch es noch einmal.',

  'case.tab.threads': 'Nachrichten',
  'case.tab.board': 'Tafel',
  'case.tab.accuse': 'Anklagen',

  'board.record': 'Zu Protokoll',
  'board.record.empty':
    'Noch nichts. Lies die Nachrichten und halte eine gedrückt, um festzuhalten, was sie behauptet.',
  'board.proven': 'Bewiesen',
  'board.proven.count': '{done} von {total}',
  'board.waiting': 'Zwei Aussagen an einer Uhr gemessen.',
  'board.slot.empty': 'Aussage anheften',
  'board.slot.filledLabel': 'Aussage {n}: {label}. Zum Lösen tippen.',
  'board.slot.emptyLabel': 'Aussage {n}: leer. Hefte eine Aussage aus dem Protokoll an.',
  'board.compare': 'Prüfen',
  'board.compare.label': 'Die beiden angehefteten Aussagen prüfen. {n} von 2 angeheftet.',
  'board.subject.one': 'eine Person',
  'board.overlap': 'beide gleichzeitig wahr',

  'accuse.prompt': 'Wer hat sie getötet?',
  'accuse.sub': 'Die richtige Person zu nennen reicht nicht. Du musst es beweisen können.',
  'accuse.card.none': 'nichts bewiesen',
  'accuse.card.count': '{n} Widersprüche',
  'accuse.card.countOne': '1 Widerspruch',
  'accuse.card.label': '{name} beschuldigen. {n} bewiesene Widersprüche weisen auf diese Person.',
  'accuse.card.labelOne': '{name} beschuldigen. 1 bewiesener Widerspruch weist auf diese Person.',
  'accuse.card.labelNone': '{name} beschuldigen. Nichts gegen diese Person bewiesen.',
  'accuse.sheet.title': '{name} beschuldigen',
  'accuse.sheet.have': 'Was du hast',
  'accuse.sheet.none': 'Noch nichts gegen diese Person bewiesen.',
  'accuse.sheet.proof': '{n} bewiesene Widersprüche weisen auf diese Person',
  'accuse.sheet.proofOne': '1 bewiesener Widerspruch weist auf diese Person',
  'accuse.sheet.reassure':
    'Wenn deine Beweise nicht zu dieser Person passen, wird man es dir sagen und du kannst jemand anderen nennen.',
  'accuse.sheet.confirm': 'Beschuldigen',
  'accuse.refusal.proof':
    'Du kannst es noch nicht beweisen. Etwas an dieser Darstellung hält stand.',
  'accuse.refusal.motive':
    'Du kannst die Darstellung brechen, aber noch nicht sagen, warum. Lies weiter.',
  'accuse.refusal.identity': 'Die Beweise, die du hast, passen nicht zu dieser Person.',
  'accuse.refusal.oneLeft': 'Eine Sache an dieser Darstellung hält stand.',
  'accuse.refusal.manyLeft': '{n} Dinge an dieser Darstellung halten stand.',

  'verdict.sameStatement': 'Das ist zweimal dieselbe Aussage.',
  'verdict.differentThings': 'Die beiden handeln von zwei verschiedenen Dingen.',
  'verdict.personVsThing': 'Die eine handelt von einer Person, die andere von einem Gegenstand.',
  'verdict.differentPeople': 'Die beiden handeln von verschiedenen Personen.',
  'verdict.differentTimes': 'Die beiden handeln von verschiedenen Zeiten.',
  'verdict.differentKinds': 'Die beiden handeln von verschiedenen Arten von Dingen.',
  'verdict.placeConflict': 'Eine Person, zwei Orte, derselbe Moment.',
  'verdict.actionConflict': 'Beides gleichzeitig ging nicht.',
  'verdict.objectConflict': 'Nur eine Person kann es gehabt haben.',
  'verdict.sameArea': 'Diese beiden Orte sind dieselbe Gegend.',
  'verdict.compatible': 'Beides kann gleichzeitig wahr sein.',
  'verdict.sameHands': 'Beide Aussagen legen es in dieselben Hände.',
  'verdict.notUnique': 'Davon könnte es mehr als eines geben.',
  'verdict.needTwo': 'Hefte zwei Aussagen an, um sie zu vergleichen.',
  'verdict.stale': 'Diese Aussagen stehen nicht mehr im Protokoll.',

  'confront.repeat': 'Das hast du schon gesagt.',
  'confront.close': 'Fall schließen',
  'confront.skip': 'Zum Überspringen tippen',
  'confront.open': 'Halte es dieser Person vor. Eine Tatsache nach der anderen.',
  'confront.left': 'Noch {n} zu sagen',
  'confront.leftOne': 'Noch 1 zu sagen',
  'confront.chipLabel': '{name} vorhalten: {label}',

  'thread.locked': '{n} Gespräche sind noch nicht erreichbar. Beweise erst etwas.',
  'thread.lockedOne': 'Ein Gespräch ist noch nicht erreichbar. Beweise erst etwas.',
  'thread.rowLabel': '{title}. {n} ungelesen.',
  'thread.rowLabelOne': '{title}. 1 ungelesen.',
  'thread.rowLabelNone': '{title}. Keine ungelesenen Nachrichten.',
  'briefing.open': 'Die Nachrichten öffnen',
  'claim.pin': 'Zum Anheften an die Tafel tippen',
  'claim.unpin': 'Platz {n} — zum Lösen tippen',

  'a11y.volume': 'Lautstärke der Soundeffekte',
  'a11y.loadingCases': 'Fälle werden geladen',
  'a11y.loadingThreads': 'Gespräche werden geladen',
  'a11y.typing': 'Jemand tippt',
  'a11y.close': 'Schließen',

  'settings.title': 'Einstellungen',
  'settings.sound.section': 'Ton',
  'settings.sound.label': 'Soundeffekte',
  'settings.sound.detail':
    'Kurze Signale, wenn eine Nachricht eintrifft und wenn ein Widerspruch bricht.',
  'settings.volume.label': 'Lautstärke',
  'settings.feel.section': 'Haptik',
  'settings.haptics.label': 'Vibration',
  'settings.haptics.detail':
    'Spürbare Impulse, wenn du eine Aussage anheftest oder einen Fakt bestätigst.',
  'settings.motion.label': 'Bewegung reduzieren',
  'settings.motion.detail':
    'Nachrichten erscheinen sofort und dekorative Töne bleiben stumm.',
  'settings.language.section': 'Sprache',
  'settings.language.label': 'Sprache',
  'settings.language.hint': 'Öffnet die Liste der Sprachen',
  'settings.language.footnote':
    'Fälle werden separat übersetzt. Jeder noch nicht übersetzte Fall bleibt auf Englisch.',
  'settings.purchases.section': 'Käufe',
  'settings.restore.detail': 'Das Fallpaket schon gekauft? Hol es dir auf dieses Gerät zurück.',
  'settings.progress.section': 'Fortschritt',
  'settings.reset.label': 'Gesamten Fortschritt löschen',
  'settings.reset.detail': 'Löscht jeden gespeicherten Fall. Käufe bleiben erhalten.',
  'settings.reset.confirm': 'Gesamten Fortschritt löschen?',
  'settings.reset.confirmBody':
    'Jeder Fall gilt wieder als ungelesen, und jeder bewiesene Widerspruch ist vergessen. Käufe sind nicht betroffen. Das lässt sich nicht rückgängig machen.',
  'settings.reset.keep': 'Behalten',
  'settings.reset.erase': 'Löschen',
  'settings.reset.erasedNone': 'Es gab keinen gespeicherten Fortschritt zum Löschen.',
  'settings.reset.erasedOne': '1 gespeicherter Fall gelöscht.',
  'settings.reset.erasedMany': '{count} gespeicherte Fälle gelöscht.',
  'settings.reset.failed': 'Fortschritt konnte nicht gelöscht werden. Versuch es erneut.',
  'settings.about.section': 'Über',
  'settings.about.version': 'Version',
  'settings.about.privacy': 'Was diese App speichert',
  'settings.about.licences': 'Open-Source-Lizenzen',

  'settings.privacy.progress': 'Dein Fortschritt in jedem Fall wird auf diesem Gerät gespeichert.',
  'settings.privacy.purchases':
    'Käufe werden vom App Store oder von Google Play über RevenueCat abgewickelt. Diese App sieht deine Zahlungsdaten nie.',
  'settings.privacy.noTracking':
    'In dieser Version gibt es keine Werbung und keine Analyse- oder Tracking-SDKs.',
  'settings.privacy.deletion': 'Die App zu löschen löscht deinen Fortschritt mit.',

  'language.title': 'Sprache',
  'language.footnote':
    'Das übersetzt die App. Fälle werden separat übersetzt, und jeder noch nicht übersetzte Fall bleibt auf Englisch.',

  'signIn.title': 'Anmelden',
  'signIn.heading': 'Nimm deine Ermittlungsnotizen mit',
  'signIn.why': 'Ein Konto überträgt deinen Fortschritt auf ein anderes Telefon.',
  'signIn.createAccount': 'Konto erstellen',
  'signIn.email': 'E-Mail',
  'signIn.password': 'Passwort',
  'signIn.alreadyRegistered':
    'Für diese E-Mail gibt es bereits ein Konto. Melde dich stattdessen an.',
  'signIn.confirmEmail': 'Sieh in {email} nach dem Bestätigungslink und melde dich dann an.',
  'signIn.storesNote':
    'Ein Konto speichert deine E-Mail-Adresse und welche Nachrichten du gelesen hast. Sonst nichts.',
  'signIn.leave': 'Auf diesem Telefon weiterspielen',
  'signIn.leaveLabel': 'Auf diesem Telefon weiterspielen, ohne Konto',
  'signIn.off.title': 'Konten sind deaktiviert',
  'signIn.signedIn.title': 'Angemeldet',
  'signIn.account': 'Dein Konto',
  'signIn.sync': 'Jetzt synchronisieren',
  'signIn.syncing': 'Wird synchronisiert…',
  'signIn.backToCases': 'Zurück zu den Fällen',
  'signIn.signOut': 'Abmelden',
  'signIn.signOutNote':
    'Beim Abmelden bleibt jeder gespeicherte Fall auf diesem Telefon. Nichts wird gelöscht.',
  'signIn.problem.emailEmpty': 'Gib deine E-Mail-Adresse ein.',
  'signIn.problem.emailShape': 'Das sieht nicht nach einer E-Mail-Adresse aus.',
  'signIn.problem.passwordEmpty': 'Gib dein Passwort ein.',
  'signIn.rulesLabel': 'Dein Passwort braucht',
  'signIn.rule.length': 'Mindestens {count} Zeichen',
  'signIn.rule.lowercase': 'Einen Kleinbuchstaben',
  'signIn.rule.uppercase': 'Einen Großbuchstaben',
  'signIn.rule.symbol': 'Ein Sonderzeichen',
  'signIn.rule.number': 'Eine Ziffer',
  'signIn.strength.weak': 'Schwach',
  'signIn.strength.fair': 'Passabel',
  'signIn.strength.strong': 'Stark',
  'signIn.showPassword': 'Passwort anzeigen',
  'signIn.hidePassword': 'Passwort verbergen',
  'signIn.forgot': 'Passwort vergessen?',
  'signIn.reset.sent':
    'Falls es zu dieser Adresse ein Konto gibt, ist der Link schon unterwegs. Sieh im Posteingang nach, und im Spam-Ordner.',
  'signIn.reset.needEmail': 'Gib zuerst deine E-Mail-Adresse ein und tippe dann noch einmal.',
  'reset.title': 'Neues Passwort festlegen',
  'reset.body': 'Wir haben einen Code an {email} geschickt. Er läuft in einer Stunde ab.',
  'reset.code': 'Code aus der E-Mail',
  'reset.newPassword': 'Neues Passwort',
  'reset.submit': 'Passwort speichern',
  'reset.resend': 'Neuen Code senden',
  'reset.needCode': 'Gib den Code aus der E-Mail ein.',
  'auth.error.badCode': 'Dieser Code ist abgelaufen oder stimmt nicht. Fordere einen neuen an.',
  'auth.error.leakedPassword':
    'Dieses Passwort ist in einem Datenleck aufgetaucht und damit nicht sicher. Nimm ein anderes.',
  'auth.error.samePassword': 'Das ist dein bisheriges Passwort. Wähle ein anderes.',

  'paywall.title': 'Mehr Fälle',
  'paywall.body':
    'Ein weiterer Tod, ein weiteres Telefon, eine weitere Geschichte, die nicht standhält. Schalte das Fallpaket frei, um weiterzumachen.',
  'paywall.bullet.case': 'Zwölf weitere Fälle in voller Länge',
  'paywall.bullet.suspects': 'Neue Verdächtige, neue Widersprüche',
  'paywall.bullet.permanent': 'Dauerhaft deins — kein Abo',
  'paywall.empty': 'Der Store hat gerade nichts anzubieten. Versuch es gleich noch einmal.',
  'paywall.unreachable': 'Der Store war nicht erreichbar.',
  'paywall.failed': 'Der Kauf ist nicht durchgegangen. Dir wurde nichts berechnet.',
  'paywall.unlock': 'Freischalten · {price}',
  'paywall.unlockLabel': 'Das Fallpaket für {price} freischalten',
  'paywall.notNow': 'Später',
  'paywall.unlockCaseLabel': 'Diesen Fall für {price} freischalten',
  'paywall.choose': 'Zwei Wege hinein',
  'paywall.option.single': 'Dieser Fall',
  'paywall.option.singleNote': 'Schaltet nur {title} frei',
  'paywall.option.bundle': 'Alle {count} Fälle',
  'paywall.option.bundleNote': 'Jeder kostenpflichtige Fall, dieser eingeschlossen',
  'paywall.option.best': 'Bestes Angebot',
  'paywall.settling': 'Wird mit dem Store bestätigt…',
  'paywall.done.title': 'Danke für deinen Kauf',
  'paywall.done.body': 'Viel Spaß beim Spielen.',
  'paywall.done.cta': 'Zurück zu den Fällen',
  'paywall.failedTitle': 'Deine Zahlung wurde nicht abgeschlossen',
  'paywall.error.cancelled': 'Es wurde nichts gekauft. Dir wurde nichts berechnet.',
  'paywall.error.offline':
    'Keine Verbindung zum Store. Prüfe dein Netz und versuch es noch einmal — berechnet wurde nichts.',
  'paywall.error.declined': 'Der Store hat die Zahlung abgelehnt. Dir wurde nichts berechnet.',
  'paywall.error.alreadyOwned': 'Das gehört dir bereits. Wird jetzt wiederhergestellt.',
  'paywall.error.pending':
    'Die Zahlung wartet auf eine Freigabe. Sobald sie durch ist, schaltet sich das von selbst frei.',
  'paywall.error.inProgress': 'Ein Kauf läuft bereits. Schließ den zuerst ab.',
  'paywall.error.unavailable': 'Das ist auf diesem Gerät gerade nicht im Verkauf.',
  'paywall.error.store': 'Der Store hat gerade Probleme. Versuch es gleich noch einmal.',
  'paywall.error.unknown': 'Der Kauf ist nicht durchgegangen. Dir wurde nichts berechnet.',
  'paywall.error.notGranted':
    'Die Zahlung ist durch, aber die Fälle sind noch nicht freigeschaltet. Versuch es mit Käufe wiederherstellen.',
};

const PT_BR: Catalogue = {
  'common.back': 'Voltar',
  'common.retry': 'Tentar de novo',
  'common.working': 'Processando…',
  'common.you': 'Eu',
  'common.restorePurchases': 'Restaurar compras',

  'home.pitch':
    'Alguém morreu. Tudo o que você tem são as mensagens. Encontre a afirmação que não pode ser verdade.',
  'home.cases.title': 'Todos os casos',
  /* Linear flow: a case whose predecessors are unfinished. Distinct from
     home.tile.sealed, which means unbought. */
  'home.tile.lockedByProgress': 'Bloqueado',
  'home.locked.title': 'Ainda não',
  'home.locked.body': 'Termine {title} primeiro. Os casos seguem em ordem.',
  'home.storeUnreachable':
    'Não foi possível verificar suas compras. Os casos que você já tem serão desbloqueados quando você voltar a ficar online.',
  'home.tile.sealed': 'Lacrado',
  'home.tile.toProve': '{count} a provar',
  'home.tile.lockedLabel': '{title}, lacrado. {count} contradições. Desbloquear.',
  'home.tile.lockedLabelOne': '{title}, lacrado. 1 contradição. Desbloquear.',
  'home.tile.openLabel': '{title}. {count} contradições a provar. Abrir.',
  'home.tile.openLabelOne': '{title}. 1 contradição a provar. Abrir.',

  'home.continue.title': 'Continuar',
  'home.continue.unreadOne': '1 não lida',
  'home.continue.unreadMany': '{count} não lidas',
  'home.continue.label': 'Continuar {title}.',
  'home.continue.backTo': 'Voltar para {thread}.',

  /* The conversation screen. Reading is paced by the player: a tap delivers
     the next message, and the button skips the rest of the thread. */

  'settings.account.section': 'Conta',
  /* The front door, and the walkthrough that runs inside the demo case rather
     than in front of it. See app/landing.tsx and src/tutorial/steps.ts. */
  'landing.kicker': 'Um caso nas suas mensagens',
  'landing.line1': 'Registraram como acidente.',
  'landing.line2': 'Você tem as mensagens de todo mundo daquela noite.',
  'landing.line3': 'Um deles está em dois lugares ao mesmo tempo.',
  'landing.signIn': 'Entrar',
  'landing.guest': 'Jogar como convidado',
  'landing.syncNote':
    'Entrar leva seus casos para outro celular. Você pode fazer isso depois nos Ajustes.',
  'tutorial.openThread': 'Estas são as mensagens daquela noite. Abra a conversa de cima.',
  'tutorial.tapToRead': 'Toque em qualquer lugar para trazer a próxima mensagem.',
  'tutorial.holdToPin':
    'Agora segure uma mensagem. Isso fixa o que ela afirma: quem estava onde, e quando.',
  'tutorial.compare':
    'Fixe uma segunda afirmação e compare as duas. Uma pessoa não ocupa o mesmo minuto em dois lugares.',
  'tutorial.nameThem': 'Você provou. Agora diga quem foi.',
  'tutorial.dismiss': 'Entendi',
  'tutorial.dismissLabel': 'Parar de mostrar estas dicas',
  'tutorial.replayRow': 'Ver o tutorial de novo',
  'tutorial.replayTitle': 'Tutorial reativado',
  'tutorial.replayBody':
    'As dicas voltam a aparecer na próxima vez que você abrir o primeiro caso.',
  'closed.statProved': 'Provadas',
  'closed.statRead': 'Lidas',
  'closed.statThreads': 'Conversas',
  'closed.stamp': 'Caso encerrado',
  'closed.named': 'apontado, e provado',
  'closed.next': 'Próximo caso: {title}',
  'closed.unlockNext': 'Desbloquear {title}',
  'closed.allCases': 'Todos os casos',
  'closed.replay': 'Jogar este caso de novo',
  'closed.replayHint': 'Apaga seu progresso neste caso e recomeça na primeira mensagem.',
  'closed.finale': 'Esse foi o último caso do arquivo.',
  'home.tile.solved': 'Resolvido',
  'case.allCases': 'Casos',

  'settings.help.section': 'Ajuda',
  'thread.conversation': 'Conversa',
  'thread.tapToContinue': 'Toque para continuar',
  'thread.skipAll': 'Pular tudo',
  'home.continue.proved': '{proved} de {total} provadas. Jogado por último {elapsed}.',

  'elapsed.justNow': 'agora mesmo',
  'elapsed.minuteOne': 'há 1 minuto',
  'elapsed.minuteMany': 'há {count} minutos',
  'elapsed.hourOne': 'há 1 hora',
  'elapsed.hourMany': 'há {count} horas',
  'elapsed.yesterday': 'ontem',
  'elapsed.dayMany': 'há {count} dias',
  'elapsed.lastWeek': 'semana passada',
  'elapsed.weekMany': 'há {count} semanas',
  'elapsed.aWhile': 'faz um tempo',

  'auth.error.generic': 'Alguma coisa deu errado. Tente de novo daqui a pouco.',
  'auth.error.badCredentials':
    'Esse e-mail e essa senha não batem com nenhuma conta. Confira os dois, ou crie uma conta.',
  'auth.error.emailUnconfirmed':
    'Confirme seu e-mail primeiro — o link está na sua caixa de entrada. Veja no spam se não estiver lá.',
  'auth.error.alreadyRegistered': 'Esse e-mail já tem uma conta. Entre nela.',
  'auth.error.passwordShort': 'Essa senha é curta demais. Use pelo menos 6 caracteres.',
  'auth.error.rateLimit': 'Tentativas demais. Espere um minuto e tente de novo.',
  'auth.error.network':
    'Não deu para falar com o servidor. Confira sua conexão e tente de novo — seu progresso está seguro neste aparelho.',
  'auth.error.badEmail': 'Isso não parece um endereço de e-mail. Confira e tente de novo.',
  // "Nenhuma conta conectada", not "Você não está conectado" — the participle
  // would agree with the player, who has no gender.
  'sync.notSignedIn': 'Nenhuma conta conectada. Seu progresso fica salvo neste aparelho.',
  'sync.upToDate': 'Já estava tudo sincronizado.',
  'sync.downloaded': 'Anotações do caso sincronizadas. {count} recuperadas da sua conta.',
  'sync.uploaded': 'Anotações do caso sincronizadas. {count} salvas na sua conta.',
  'sync.both': 'Anotações do caso sincronizadas. {downloaded} recuperadas, {uploaded} salvas.',

  'restore.working': 'Verificando com a loja…',
  'restore.none': 'Nenhuma compra encontrada nesta conta da loja.',
  'restore.oneRestored': '1 compra restaurada. Seu pacote de casos está liberado.',
  'restore.manyRestored': '{count} compras restauradas. Seu pacote de casos está liberado.',
  'restore.unreachable': 'Não deu para falar com a loja. Confira sua conexão e tente de novo.',

  'case.tab.threads': 'Mensagens',
  'case.tab.board': 'Quadro',
  'case.tab.accuse': 'Acusar',

  'board.record': 'No registro',
  'board.record.empty':
    'Nada ainda. Leia as mensagens e segure uma para anotar o que ela afirma.',
  'board.proven': 'Provado',
  'board.proven.count': '{done} de {total}',
  'board.waiting': 'Duas declarações sobre o mesmo relógio.',
  'board.slot.empty': 'Fixe uma declaração',
  'board.slot.filledLabel': 'Declaração {n}: {label}. Toque para soltar.',
  'board.slot.emptyLabel': 'Declaração {n}: vazia. Fixe uma declaração do registro.',
  'board.compare': 'Verificar',
  'board.compare.label': 'Verificar as duas declarações fixadas. {n} de 2 fixadas.',
  'board.subject.one': 'uma pessoa',
  'board.overlap': 'ambas verdadeiras ao mesmo tempo',

  'accuse.prompt': 'Quem os matou?',
  'accuse.sub': 'Apontar a pessoa certa não basta. Você precisa conseguir provar.',
  'accuse.card.none': 'nada provado',
  'accuse.card.count': '{n} contradições',
  'accuse.card.countOne': '1 contradição',
  'accuse.card.label': 'Acusar {name}. {n} contradições provadas apontam para essa pessoa.',
  'accuse.card.labelOne': 'Acusar {name}. 1 contradição provada aponta para essa pessoa.',
  'accuse.card.labelNone': 'Acusar {name}. Nada provado contra essa pessoa.',
  'accuse.sheet.title': 'Acusar {name}',
  'accuse.sheet.have': 'O que você tem',
  'accuse.sheet.none': 'Ainda não há nada provado contra essa pessoa.',
  'accuse.sheet.proof': '{n} contradições provadas apontam para essa pessoa',
  'accuse.sheet.proofOne': '1 contradição provada aponta para essa pessoa',
  'accuse.sheet.reassure':
    'Se suas provas não servirem para essa pessoa, você será avisado e poderá apontar outra.',
  'accuse.sheet.confirm': 'Acusar',
  'accuse.refusal.proof':
    'Você ainda não consegue provar. Algo na versão dessa pessoa continua de pé.',
  'accuse.refusal.motive':
    'Você consegue quebrar a versão, mas ainda não sabe dizer por quê. Continue lendo.',
  'accuse.refusal.identity': 'As provas que você tem não servem para essa pessoa.',
  'accuse.refusal.oneLeft': 'Uma coisa na versão dessa pessoa continua de pé.',
  'accuse.refusal.manyLeft': '{n} coisas na versão dessa pessoa continuam de pé.',

  'verdict.sameStatement': 'Essa é a mesma declaração duas vezes.',
  'verdict.differentThings': 'Elas falam de duas coisas diferentes.',
  'verdict.personVsThing': 'Uma fala de uma pessoa, a outra de um objeto.',
  'verdict.differentPeople': 'Elas falam de pessoas diferentes.',
  'verdict.differentTimes': 'Elas falam de momentos diferentes.',
  'verdict.differentKinds': 'Elas falam de coisas de tipos diferentes.',
  'verdict.placeConflict': 'Uma pessoa, dois lugares, o mesmo momento.',
  'verdict.actionConflict': 'Não dava para fazer as duas coisas ao mesmo tempo.',
  'verdict.objectConflict': 'Só uma pessoa podia estar com isso.',
  'verdict.sameArea': 'Esses dois lugares são a mesma área.',
  'verdict.compatible': 'Essas duas coisas podem ser verdadeiras ao mesmo tempo.',
  'verdict.sameHands': 'As duas declarações põem isso nas mesmas mãos.',
  'verdict.notUnique': 'Pode haver mais de um desses.',
  'verdict.needTwo': 'Fixe duas declarações para compará-las.',
  'verdict.stale': 'Essas declarações não estão mais no registro.',

  'confront.repeat': 'Você já disse isso.',
  'confront.close': 'Encerrar o caso',
  'confront.skip': 'Toque para pular',
  'confront.open': 'Ponha na frente dessa pessoa. Um fato de cada vez.',
  'confront.left': 'Faltam {n} a dizer',
  'confront.leftOne': 'Falta 1 a dizer',
  'confront.chipLabel': 'Apresentar a {name}: {label}',

  'thread.locked': '{n} conversas ainda estão fora de alcance. Prove algo primeiro.',
  'thread.lockedOne': 'Uma conversa ainda está fora de alcance. Prove algo primeiro.',
  'thread.rowLabel': '{title}. {n} não lidas.',
  'thread.rowLabelOne': '{title}. 1 não lida.',
  'thread.rowLabelNone': '{title}. Nenhuma mensagem não lida.',
  'briefing.open': 'Abrir as mensagens',
  'claim.pin': 'Toque para fixá-la no quadro',
  'claim.unpin': 'Espaço {n} — toque para soltar',

  'a11y.volume': 'Volume dos efeitos sonoros',
  'a11y.loadingCases': 'Carregando casos',
  'a11y.loadingThreads': 'Carregando conversas',
  'a11y.typing': 'Alguém está digitando',
  'a11y.close': 'Fechar',

  'settings.title': 'Ajustes',
  'settings.sound.section': 'Som',
  'settings.sound.label': 'Efeitos sonoros',
  'settings.sound.detail':
    'Sinais curtos quando uma mensagem chega e quando uma contradição se quebra.',
  'settings.volume.label': 'Volume',
  'settings.feel.section': 'Resposta tátil',
  'settings.haptics.label': 'Vibração',
  'settings.haptics.detail':
    'Toques que você sente ao fixar uma declaração ou confirmar um fato.',
  'settings.motion.label': 'Reduzir animações',
  'settings.motion.detail':
    'As mensagens aparecem na hora e os sons decorativos ficam em silêncio.',
  'settings.language.section': 'Idioma',
  'settings.language.label': 'Idioma',
  'settings.language.hint': 'Abre a lista de idiomas',
  'settings.language.footnote':
    'Os casos são traduzidos separadamente. Qualquer caso ainda não traduzido permanece em inglês.',
  'settings.purchases.section': 'Compras',
  'settings.restore.detail': 'Já comprou o pacote de casos? Recupere-o neste aparelho.',
  'settings.progress.section': 'Progresso',
  'settings.reset.label': 'Apagar todo o progresso',
  'settings.reset.detail': 'Apaga todos os casos salvos. As compras são mantidas.',
  'settings.reset.confirm': 'Apagar todo o progresso?',
  'settings.reset.confirmBody':
    'Cada caso volta a ficar não lido, e cada contradição que você provou é esquecida. As compras não são afetadas. Isso não pode ser desfeito.',
  'settings.reset.keep': 'Manter',
  'settings.reset.erase': 'Apagar',
  'settings.reset.erasedNone': 'Não havia progresso salvo para apagar.',
  'settings.reset.erasedOne': '1 caso salvo apagado.',
  'settings.reset.erasedMany': '{count} casos salvos apagados.',
  'settings.reset.failed': 'Não foi possível apagar o progresso. Tente de novo.',
  'settings.about.section': 'Sobre',
  'settings.about.version': 'Versão',
  'settings.about.privacy': 'O que este app guarda',
  'settings.about.licences': 'Licenças de código aberto',

  'settings.privacy.progress': 'Seu progresso em cada caso fica guardado neste aparelho.',
  'settings.privacy.purchases':
    'As compras são feitas pela App Store ou Google Play através da RevenueCat. Este app nunca vê seus dados de pagamento.',
  'settings.privacy.noTracking':
    'Nesta versão não há anúncios nem SDKs de análise ou rastreamento.',
  'settings.privacy.deletion': 'Apagar o app apaga seu progresso junto.',

  'language.title': 'Idioma',
  'language.footnote':
    'Isto traduz o aplicativo. Os casos são traduzidos separadamente, e qualquer caso ainda não traduzido permanece em inglês.',

  'signIn.title': 'Entrar',
  'signIn.heading': 'Leve suas anotações com você',
  'signIn.why': 'Uma conta leva seu progresso para outro celular.',
  'signIn.createAccount': 'Criar conta',
  'signIn.email': 'E-mail',
  'signIn.password': 'Senha',
  'signIn.alreadyRegistered': 'Esse e-mail já tem uma conta. Entre em vez de criar.',
  'signIn.confirmEmail': 'Procure o link de confirmação em {email} e depois entre.',
  'signIn.storesNote': 'Uma conta guarda seu e-mail e quais mensagens você leu. Nada mais.',
  'signIn.leave': 'Continuar neste celular',
  'signIn.leaveLabel': 'Continuar neste celular, sem conta',
  'signIn.off.title': 'As contas estão desativadas',
  'signIn.signedIn.title': 'Conectado',
  'signIn.account': 'Sua conta',
  'signIn.sync': 'Sincronizar agora',
  'signIn.syncing': 'Sincronizando…',
  'signIn.backToCases': 'Voltar aos casos',
  'signIn.signOut': 'Sair',
  'signIn.signOutNote': 'Sair mantém todos os casos salvos neste celular. Nada é apagado.',
  'signIn.problem.emailEmpty': 'Digite seu e-mail.',
  'signIn.problem.emailShape': 'Isso não parece um e-mail.',
  'signIn.problem.passwordEmpty': 'Digite sua senha.',
  'signIn.rulesLabel': 'Sua senha precisa de',
  'signIn.rule.length': 'Pelo menos {count} caracteres',
  'signIn.rule.lowercase': 'Uma letra minúscula',
  'signIn.rule.uppercase': 'Uma letra maiúscula',
  'signIn.rule.symbol': 'Um símbolo',
  'signIn.rule.number': 'Um número',
  'signIn.strength.weak': 'Fraca',
  'signIn.strength.fair': 'Razoável',
  'signIn.strength.strong': 'Forte',
  'signIn.showPassword': 'Mostrar senha',
  'signIn.hidePassword': 'Ocultar senha',
  'signIn.forgot': 'Esqueceu sua senha?',
  'signIn.reset.sent':
    'Se esse endereço tiver uma conta, o link já está a caminho. Confira sua caixa de entrada e o spam.',
  'signIn.reset.needEmail': 'Digite seu e-mail primeiro e toque aqui de novo.',
  'reset.title': 'Defina uma nova senha',
  'reset.body': 'Enviamos um código para {email}. Ele expira em uma hora.',
  'reset.code': 'Código do e-mail',
  'reset.newPassword': 'Nova senha',
  'reset.submit': 'Salvar senha',
  'reset.resend': 'Enviar outro código',
  'reset.needCode': 'Digite o código do e-mail.',
  'auth.error.badCode': 'Esse código expirou ou não confere. Peça outro.',
  'auth.error.leakedPassword':
    'Essa senha apareceu em um vazamento de dados, então não é segura. Escolha outra.',
  'auth.error.samePassword': 'Essa é a senha que você já tem. Escolha outra.',

  'paywall.title': 'Mais casos',
  'paywall.body':
    'Outra morte, outro celular, outra história que não se sustenta. Desbloqueie o pacote de casos para continuar.',
  'paywall.bullet.case': 'Mais doze casos completos',
  'paywall.bullet.suspects': 'Novos suspeitos, novas contradições',
  'paywall.bullet.permanent': 'Seu para sempre — não é assinatura',
  'paywall.empty': 'A loja não tem nada para vender agora. Tente daqui a pouco.',
  'paywall.unreachable': 'Não foi possível acessar a loja.',
  'paywall.failed': 'A compra não foi concluída. Você não foi cobrado.',
  'paywall.unlock': 'Desbloquear · {price}',
  'paywall.unlockLabel': 'Desbloquear o pacote de casos por {price}',
  'paywall.notNow': 'Agora não',
  'paywall.unlockCaseLabel': 'Desbloquear este caso por {price}',
  'paywall.choose': 'Duas formas de entrar',
  'paywall.option.single': 'Este caso',
  'paywall.option.singleNote': 'Desbloqueia {title} sozinho',
  'paywall.option.bundle': 'Os {count} casos',
  'paywall.option.bundleNote': 'Todos os casos pagos, este incluído',
  'paywall.option.best': 'Melhor escolha',
  'paywall.settling': 'Confirmando com a loja…',
  'paywall.done.title': 'Obrigado pela sua compra',
  'paywall.done.body': 'Bom jogo.',
  'paywall.done.cta': 'Voltar aos casos',
  'paywall.failedTitle': 'Seu pagamento não foi concluído',
  'paywall.error.cancelled': 'Nada foi comprado. Você não foi cobrado.',
  'paywall.error.offline':
    'Sem conexão com a loja. Confira sua rede e tente de novo: nada foi cobrado.',
  'paywall.error.declined': 'A loja recusou o pagamento. Você não foi cobrado.',
  'paywall.error.alreadyOwned': 'Isso já é seu. Restaurando agora.',
  'paywall.error.pending':
    'O pagamento está esperando aprovação. Assim que passar, desbloqueia sozinho.',
  'paywall.error.inProgress': 'Já existe uma compra aberta. Termine aquela primeiro.',
  'paywall.error.unavailable': 'Isso não está à venda neste aparelho agora.',
  'paywall.error.store': 'A loja está com problemas. Tente de novo daqui a pouco.',
  'paywall.error.unknown': 'A compra não foi concluída. Você não foi cobrado.',
  'paywall.error.notGranted':
    'O pagamento passou, mas os casos ainda não desbloquearam. Tente Restaurar compras.',
};

export const CATALOGUES: Readonly<Record<LocaleTag, Catalogue>> = {
  en: EN,
  es: ES,
  fr: FR,
  de: DE,
  'pt-BR': PT_BR,
  // Japanese is deliberately last and deliberately empty. It needs a translator
  // who can make the register decisions — politeness level, which loanwords stay
  // katakana — that this catalogue cannot fake. It also keeps one genuinely
  // untranslated locale in the build, which is the only thing that proves the
  // English fallback still works.
};

export const SOURCE_LOCALE: LocaleTag = DEFAULT_LOCALE;
