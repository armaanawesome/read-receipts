import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { readSolvedCaseIds } from '@/state/persistence';
import { DEMO_CASE_ID } from '@content/cases';
import { theme } from '@/ui/theme';
import { useTranslator } from '@/i18n/useTranslator';
import { render, type Message } from '@/i18n/message';
import { EyeGlyph } from '@/ui/EyeGlyph';
import type { Translator } from '@/i18n/translate';
import {
  useAuth,
  validateCredentials,
  syncProgress,
  describeSyncResult,
  checkPassword,
  MIN_PASSWORD_LENGTH,
  RULE_MESSAGE_KEY,
  type CredentialField,
  type CredentialProblem,
} from '@/auth';

/**
 * Accounts are OPTIONAL, and this screen has to look optional.
 *
 * Every case is playable signed out on local saves alone — nothing is gated
 * behind having an account, and nothing here is a wall. An account does exactly
 * one thing: it carries progress to another phone. So the screen states that
 * one reason, and keeps the way past it visible without scrolling rather than
 * parked below the fold where a "maybe later" link usually goes.
 *
 * The chrome is the paywall's, deliberately. This is the second screen in the
 * app that is openly an app rather than a phone someone left unlocked, and the
 * two should look like they came from the same place.
 */
export default function SignInScreen() {
  const router = useRouter();
  /** Set only by the landing page. Absent when this screen is opened from Settings. */
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const t = useTranslator();
  const { status, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  /**
   * Age, asked once, at the point the app is about to collect an email address.
   *
   * null = not asked yet, true = old enough, false = told us they are not.
   *
   * Deliberately NOT persisted. It is a question about a single act -- creating
   * an account -- and storing the answer would mean storing a fact about a
   * child's age, which is the thing this gate exists to avoid collecting. Local
   * state also means the question is asked at the moment of collection, which
   * is what COPPA, the ICO Children's Code and India's DPDP Act each ask for in
   * their own words. See docs/LEGAL-REVIEW.md, Count 8.
   *
   * A neutral question with two equal buttons, no default and no nudge towards
   * the older answer -- the Children's Code is explicit that a gate designed to
   * be clicked past is not a gate.
   */
  const [ageOk, setAgeOk] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<CredentialProblem | null>(null);
  // A Message for the same reason `notice` is: rendered at display time, so it
  // is in the language the player is reading now, not the one they were in when
  // the request failed.
  const [formError, setFormError] = useState<Message | null>(null);
  /**
   * Held as a Message, not a string, and rendered at the bottom of this file.
   *
   * Storing the rendered sentence would freeze it in whatever language was
   * active when the sync finished, so a player who changed language with a
   * notice on screen would keep reading the old one.
   */
  const [notice, setNotice] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<CredentialField | null>(null);
  /**
   * Off by default, and reset whenever the mode changes.
   *
   * A reveal that persisted across a mode switch would leave somebody's password
   * on screen after they thought they had left the form, which is the one thing
   * a reveal toggle must not do.
   */
  const [revealed, setRevealed] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  /**
   * The way out, from anywhere.
   *
   * `back()` when there is somewhere to go back to, and a replace otherwise —
   * a deep link straight to /sign-in has no history, and a dead "keep playing"
   * button on the one screen that promises the game is optional would be the
   * worst possible place for one.
   */
  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  /**
   * Where to go once the account is settled — but only when this screen is
   * standing in the middle of onboarding.
   *
   * The landing page arrives here as `/sign-in?onboarding=1`, having already
   * replaced itself, so this screen owes the player a destination: leaving them
   * on a form they have finished with is a dead end. Opened from Settings there
   * is no flag, nothing moves, and they leave the way they came — the only
   * correct answer for somebody who came here mid-game to switch accounts, and
   * previously not what happened: this used to fire either way, so signing in
   * from Settings could yank a player into the demo case unasked.
   *
   * Called only AFTER `syncProgress()`, and the order is the whole point: a
   * returning player signing in on a new phone has an empty device and a full
   * account, so asking the disk before the server would drop somebody twelve
   * cases in back into the tutorial. Once the sync has landed, a demo already
   * solved sends them to the case list instead.
   */
  const finishOnboarding = useCallback(async () => {
    if (!onboarding) return;
    const solved = await readSolvedCaseIds();
    router.replace(solved.has(DEMO_CASE_ID) ? '/' : `/case/${DEMO_CASE_ID}/threads`);
  }, [onboarding, router]);

  /**
   * Send the reset email.
   *
   * The success line is the same whether or not the address has an account, and
   * it is shown even when Supabase reports nothing back, because Supabase itself
   * answers identically either way. A form that says "no account with that
   * email" is an account-existence oracle anybody can query.
   *
   * The one thing worth checking first is that the field is not empty, which is
   * about this screen rather than about the account.
   */
  const sendReset = useCallback(async () => {
    if (busy) return;
    setFormError(null);
    if (email.trim() === '') {
      setNotice({ key: 'signIn.reset.needEmail' });
      emailRef.current?.focus();
      return;
    }
    /*
     * Navigate first; the reset screen sends.
     *
     * The email carries a code, not a working link — Supabase hosts no
     * update-password page, and its link redirects to the project's Site URL,
     * which on a phone with no website goes nowhere. So the next step is always
     * in the app, and it should be reachable even when the send fails.
     *
     * That matters more than it looks: Supabase's built-in SMTP is rate limited
     * to a couple of messages an hour and, on a project with no custom SMTP
     * configured, delivers only to team addresses. Blocking navigation on the
     * send would leave the one screen that can finish the reset unreachable
     * precisely when somebody most needs to know what is going on. The failure
     * is not swallowed — it is reported there, next to Send another code.
     */
    router.push({ pathname: '/reset-password', params: { email: email.trim() } });
  }, [busy, email, router]);

  const runSync = useCallback(async () => {
    setBusy(true);
    setNotice(describeSyncResult(await syncProgress()));
    setBusy(false);
  }, []);

  const submit = useCallback(async () => {
    if (busy) return;

    const found = validateCredentials({ email, password, mode });
    if (found) {
      setProblem(found);
      // Send focus to the field that is actually wrong, rather than making the
      // player work out which of the two the message belongs to.
      (found.field === 'email' ? emailRef : passwordRef).current?.focus();
      return;
    }

    setProblem(null);
    setFormError(null);
    setNotice(null);
    setBusy(true);

    if (mode === 'signIn') {
      const attempt = await signIn(email, password);
      if (!attempt.ok) {
        setFormError(attempt.message);
      } else {
        setNotice(describeSyncResult(await syncProgress()));
        await finishOnboarding();
      }
    } else {
      const attempt = await signUp(email, password);
      if (!attempt.ok) {
        setFormError(attempt.message);
      } else if (attempt.outcome === 'alreadyRegistered') {
        // Supabase reports this as a success with no identities, so without
        // this branch the player waits for a mail that was never sent.
        setMode('signIn');
        setFormError({ key: 'signIn.alreadyRegistered' });
      } else if (attempt.outcome === 'confirmEmail') {
        setNotice({ key: 'signIn.confirmEmail', params: { email: email.trim() } });
      } else {
        setNotice(describeSyncResult(await syncProgress()));
        await finishOnboarding();
      }
    }

    setBusy(false);
  }, [busy, email, password, mode, signIn, signUp, t, finishOnboarding]);

  const leaveButton = (
    <Pressable
      onPress={leave}
      accessibilityRole="button"
      accessibilityLabel={t('signIn.leaveLabel')}
      hitSlop={theme.hit.slop}
      style={({ pressed }) => [styles.guest, pressed && styles.pressed]}
    >
      <Text style={styles.guestText}>{t('signIn.leave')}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* No <Stack.Screen options={{...}} /> here. An inline object literal is a
          fresh reference every render, so setOptions re-renders the navigator
          forever — the exact loop the paywall hit. Options live in _layout.tsx. */}
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {status.kind === 'restoring' ? (
          <View style={styles.centred}>
            <ActivityIndicator color={theme.color.accent} />
          </View>
        ) : null}

        {status.kind === 'unavailable' ? (
          <>
            <Text style={styles.title}>{t('signIn.off.title')}</Text>
            <View style={styles.problemBlock}>
              <Text style={styles.problemText}>{status.reason}</Text>
            </View>
            {/* No form and no retry. The config cannot change while the app is
                running, so a button that can never work is worse than none. */}
            {leaveButton}
          </>
        ) : null}

        {status.kind === 'signedIn' ? (
          <>
            <Text style={styles.title}>{t('signIn.signedIn.title')}</Text>
            <Text style={styles.reason}>{status.user.email ?? t('signIn.account')}</Text>

            {notice ? (
              <View style={styles.noticeBlock} accessibilityLiveRegion="polite">
                <Text style={styles.noticeText}>{render(notice, t)}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={runSync}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [styles.cta, busy && styles.ctaBusy, pressed && styles.pressed]}
            >
              <Text style={styles.ctaText}>{busy ? t('signIn.syncing') : t('signIn.sync')}</Text>
            </Pressable>

            <Pressable
              onPress={leave}
              accessibilityRole="button"
              hitSlop={theme.hit.slop}
              style={({ pressed }) => [styles.guest, pressed && styles.pressed]}
            >
              <Text style={styles.guestText}>{t('signIn.backToCases')}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setNotice(null);
                void signOut();
              }}
              disabled={busy}
              accessibilityRole="button"
              hitSlop={theme.hit.slop}
              style={styles.quiet}
            >
              <Text style={styles.quietText}>{t('signIn.signOut')}</Text>
            </Pressable>

            <Text style={styles.microcopy}>{t('signIn.signOutNote')}</Text>
          </>
        ) : null}

        {/*
          The game is not gated. Only the account is. A player who says they are
          under 16 keeps every case, every save and every purchase -- they lose
          cross-device sync, which is the only thing the server is for.
        */}
        {status.kind === 'signedOut' && mode === 'signUp' && ageOk === null ? (
          <>
            <Text style={styles.title}>{t('signIn.age.title')}</Text>
            <Text style={styles.reason}>{t('signIn.age.body')}</Text>

            <Pressable
              onPress={() => setAgeOk(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text style={styles.ctaText}>{t('signIn.age.over')}</Text>
            </Pressable>

            <Pressable
              onPress={() => setAgeOk(false)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
            >
              <Text style={styles.quietText}>{t('signIn.age.under')}</Text>
            </Pressable>

            {leaveButton}
          </>
        ) : null}

        {status.kind === 'signedOut' && mode === 'signUp' && ageOk === false ? (
          <>
            <Text style={styles.title}>{t('signIn.createAccount')}</Text>
            <Text style={styles.reason}>{t('signIn.age.blocked')}</Text>

            <Pressable
              onPress={() => router.replace('/')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text style={styles.ctaText}>{t('signIn.age.backToGame')}</Text>
            </Pressable>
          </>
        ) : null}

        {status.kind === 'signedOut' && !(mode === 'signUp' && ageOk !== true) ? (
          <>
            <Text style={styles.title}>{t('signIn.heading')}</Text>
            {/* One reason, stated once. Anything more reads as a pitch for
                something the player does not need in order to play. */}
            <Text style={styles.reason}>{t('signIn.why')}</Text>

            <View style={styles.toggle} accessibilityRole="tablist">
              {(['signIn', 'signUp'] as const).map((option) => {
                const selected = mode === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setMode(option);
                      setProblem(null);
                      setFormError(null);
                      setNotice(null);
                      // Never carry a revealed password across a mode switch.
                      setRevealed(false);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.toggleOption,
                      selected && styles.toggleOptionOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.toggleText, selected && styles.toggleTextOn]}>
                      {option === 'signIn' ? t('signIn.title') : t('signIn.createAccount')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field
              label={t('signIn.email')}
              inputRef={emailRef}
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                if (problem?.field === 'email') setProblem(null);
              }}
              problem={problem?.field === 'email' ? render(problem.message, t) : null}
              focused={focused === 'email'}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              editable={!busy}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Field
              label={t('signIn.password')}
              inputRef={passwordRef}
              value={password}
              onChangeText={(next) => {
                setPassword(next);
                if (problem?.field === 'password') setProblem(null);
              }}
              problem={problem?.field === 'password' ? render(problem.message, t) : null}
              focused={focused === 'password'}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              editable={!busy}
              secureTextEntry={!revealed}
              revealed={revealed}
              onToggleReveal={() => setRevealed((on) => !on)}
              revealLabel={t(revealed ? 'signIn.hidePassword' : 'signIn.showPassword')}
              textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />

            {/*
              The rules, live, while there is still time to act on them.

              Shown for sign-up only — at sign-in the account already exists and
              its password is whatever it is, so a checklist there would tell
              somebody their own working password is wrong.

              Drawn from the same `checkPassword` the submit uses, so the ticks
              and the button can never disagree. A screen that shows three ticks
              and then refuses to submit is worse than no checklist at all.
            */}
            {mode === 'signUp' ? (
              <PasswordRules password={password} t={t} />
            ) : (
              <Pressable
                onPress={() => void sendReset()}
                disabled={busy}
                accessibilityRole="button"
                hitSlop={theme.hit.slop}
                style={styles.forgotRow}
              >
                <Text style={styles.forgot}>{t('signIn.forgot')}</Text>
              </Pressable>
            )}

            {formError ? (
              <View
                style={styles.problemBlock}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.problemText}>{render(formError, t)}</Text>
              </View>
            ) : null}

            {notice ? (
              <View style={styles.noticeBlock} accessibilityLiveRegion="polite">
                <Text style={styles.noticeText}>{render(notice, t)}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void submit()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [styles.cta, busy && styles.ctaBusy, pressed && styles.pressed]}
            >
              <Text style={styles.ctaText}>
                {busy
                  ? t('common.working')
                  : mode === 'signIn'
                    ? t('signIn.title')
                    : t('signIn.createAccount')}
              </Text>
            </Pressable>

            {/*
              GDPR Art. 13 wants the notice at the moment the data is obtained,
              not only in a settings panel. Shown for sign-up only: an existing
              account holder already accepted these, and repeating it on every
              sign-in is noise that trains people to ignore it.
            */}
            {mode === 'signUp' ? (
              <Text style={styles.microcopy}>{t('signIn.terms')}</Text>
            ) : null}

            {leaveButton}

            <Text style={styles.microcopy}>{t('signIn.storesNote')}</Text>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * A labelled input.
 *
 * The label is a real visible one rather than a placeholder: placeholder-only
 * fields lose their label the moment typing starts, which is precisely when
 * someone glancing back needs it. The error sits directly under its own field
 * for the same reason.
 */
function Field({
  label,
  inputRef,
  problem,
  focused,
  revealed,
  onToggleReveal,
  revealLabel,
  ...input
}: {
  label: string;
  inputRef: React.RefObject<TextInput | null>;
  problem: string | null;
  focused: boolean;
  /** Present only on the password field. Absent leaves the row exactly as it was. */
  revealed?: boolean;
  onToggleReveal?: () => void;
  revealLabel?: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {/* The border moves to the row so the toggle sits INSIDE the field rather
          than beside it — otherwise tapping near the eye lands outside the
          control the player thinks they are touching. */}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputFocused,
          problem !== null && styles.inputBad,
        ]}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor={theme.color.textDim}
          // Autocapitalising an email address is the single most common cause of
          // a login that "should work" — iOS capitalises the first letter and the
          // address no longer matches what was registered.
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          {...input}
        />
        {onToggleReveal ? (
          <Pressable
            onPress={onToggleReveal}
            accessibilityRole="button"
            accessibilityLabel={revealLabel}
            accessibilityState={{ selected: revealed === true }}
            hitSlop={theme.hit.slop}
            style={({ pressed }) => [styles.reveal, pressed && styles.pressed]}
          >
            <EyeGlyph struck={revealed === true} />
          </Pressable>
        ) : null}
      </View>
      {problem !== null ? (
        <Text style={styles.fieldError} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {problem}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The password policy, as a live checklist with a strength meter.
 *
 * Every rule is drawn from the start rather than appearing as it fails, so the
 * player can read the whole requirement before choosing — a checklist that grows
 * while you type is a series of small rejections.
 *
 * The state of each line is carried by a mark AND by colour, never colour alone.
 */
function PasswordRules({ password, t }: { password: string; t: Translator }) {
  const report = checkPassword(password);
  const width = report.strength === 'strong' ? '100%' : report.strength === 'fair' ? '66%' : '33%';
  const tone =
    report.strength === 'strong'
      ? theme.color.solved
      : report.strength === 'fair'
        ? theme.color.accent
        : theme.color.danger;

  return (
    <View style={styles.rules}>
      <View style={styles.strengthRow}>
        <Text style={styles.rulesLabel}>{t('signIn.rulesLabel')}</Text>
        {/* The meter is only meaningful once there is something to measure. */}
        {password !== '' ? (
          <Text style={[styles.strengthWord, { color: tone }]}>
            {t(`signIn.strength.${report.strength}`)}
          </Text>
        ) : null}
      </View>

      {password !== '' ? (
        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width, backgroundColor: tone }]} />
        </View>
      ) : null}

      {report.rules.map((rule) => (
        <View key={rule.id} style={styles.ruleRow}>
          <View style={[styles.ruleMark, rule.met && styles.ruleMarkOn]}>
            {rule.met ? <Text style={styles.ruleTick}>✓</Text> : null}
          </View>
          <Text style={[styles.ruleText, rule.met && styles.ruleTextOn]}>
            {t(RULE_MESSAGE_KEY[rule.id], { count: MIN_PASSWORD_LENGTH })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  /* Top-aligned, not centred: centring pushes the guest control off a small
     screen the moment the keyboard opens, and that control has to stay visible. */
  content: { padding: theme.space.lg, gap: theme.space.md, flexGrow: 1 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: { ...theme.type.title, color: theme.color.text },
  reason: { ...theme.type.body, color: theme.color.textDim, marginBottom: theme.space.sm },

  toggle: {
    flexDirection: 'row',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.chip,
    padding: 3,
    gap: 3,
  },
  toggleOption: {
    flex: 1,
    minHeight: theme.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.chip - 3,
  },
  toggleOptionOn: { backgroundColor: theme.color.bubbleThem },
  toggleText: { ...theme.type.body, color: theme.color.textDim },
  toggleTextOn: { color: theme.color.text, fontWeight: '600' },

  field: { gap: theme.space.xs },
  label: { ...theme.type.sender, color: theme.color.textDim },
  /* The chrome moved here from `input` so the reveal button sits inside the
     field's own border rather than next to it. */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.chip,
    borderWidth: 1,
    borderColor: theme.color.rule,
    paddingRight: theme.space.xs,
  },
  input: {
    ...theme.type.body,
    flex: 1,
    color: theme.color.text,
    paddingHorizontal: theme.space.md,
    minHeight: theme.hit.min + 4,
  },
  /* React Native draws no focus ring of its own, so the focused field has to
     say so itself — otherwise a keyboard or switch-control user cannot tell
     where their typing is going. */
  inputFocused: { borderColor: theme.color.proof },
  /* `danger` is the non-text token; it is a border here, never the message. */
  inputBad: { borderColor: theme.color.danger },
  fieldError: { ...theme.type.meta, color: theme.color.dangerText },

  reveal: {
    width: theme.hit.min,
    minHeight: theme.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
  },

  forgotRow: { alignSelf: 'flex-start', minHeight: theme.hit.min, justifyContent: 'center' },
  /* Near-white and underlined rather than the blue `proof` token: blue reads
     as a web link in a palette whose only accent is amber, and it competed
     with the CTA directly beneath it. */
  forgot: { ...theme.type.body, color: theme.color.text, textDecorationLine: 'underline' },

  rules: { gap: theme.space.xs, marginTop: theme.space.xs },
  strengthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rulesLabel: { ...theme.type.meta, color: theme.color.textDim },
  /* 700, not 600: a named Android family resolves through Typeface.create,
     which knows only normal and bold, so 600 renders as regular. */
  strengthWord: { ...theme.type.meta, fontWeight: '700' },
  meterTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.color.rail,
    overflow: 'hidden',
  },
  meterFill: { height: 3, borderRadius: 1.5 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  /* The state is a MARK as well as a colour. Colour alone would leave somebody
     who cannot separate these two hues with no way to read the checklist. */
  ruleMark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.color.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleMarkOn: { borderColor: theme.color.solved, backgroundColor: theme.color.solved },
  ruleTick: { fontSize: 10, lineHeight: 14, color: theme.color.bg, fontWeight: '700' },
  ruleText: { ...theme.type.meta, color: theme.color.textDim },
  ruleTextOn: { color: theme.color.text },

  problemBlock: {
    backgroundColor: theme.color.surface,
    borderLeftWidth: 2,
    borderLeftColor: theme.color.danger,
    borderRadius: theme.radius.chip,
    padding: theme.space.md,
  },
  problemText: { ...theme.type.body, color: theme.color.dangerText },

  noticeBlock: {
    backgroundColor: theme.color.surface,
    borderLeftWidth: 2,
    borderLeftColor: theme.color.accent,
    borderRadius: theme.radius.chip,
    padding: theme.space.md,
  },
  noticeText: { ...theme.type.body, color: theme.color.text },

  cta: {
    minHeight: theme.hit.min + 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.chip,
    marginTop: theme.space.sm,
  },
  ctaBusy: { opacity: 0.5 },
  ctaText: { ...theme.type.body, color: theme.color.bg, fontWeight: '600' },

  /* Plain text, full width, real 44pt target. Not a button, because the choice
     it offers is not a lesser one — but not styled to compete with the CTA
     either, because most people opening this screen came here to sign in. */
  guest: { minHeight: theme.hit.min, alignItems: 'center', justifyContent: 'center' },
  guestText: { ...theme.type.body, color: theme.color.text, textDecorationLine: 'underline' },

  quiet: { minHeight: theme.hit.min, alignItems: 'center', justifyContent: 'center' },
  quietText: { ...theme.type.body, color: theme.color.textDim },

  microcopy: {
    ...theme.type.meta,
    color: theme.color.textDim,
    textAlign: 'center',
    marginTop: theme.space.xs,
  },

  pressed: { opacity: 0.7 },
});
