import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/ui/theme';
import { useTranslator } from '@/i18n/useTranslator';
import { useReduceMotion } from '@/settings/useReduceMotion';
import { useSettingsStore } from '@/settings/settingsStore';
import { TypingIndicator } from '@/ui/TypingIndicator';
import { DEMO_CASE_ID } from '@content/cases';
import { AuthProviderButtons } from '@/ui/AuthProviderButtons';
import { PRIVACY_URL, TERMS_URL } from '@/settings/about';
import { render } from '@/i18n/message';
import type { Message } from '@/i18n/message';

/**
 * Android gets a ripple as well as the opacity change.
 *
 * An opacity dip is the iOS idiom and reads as almost nothing on Android, where
 * a press with no ripple is the signature of a control that did not register.
 * Two colours because one ripple cannot show on both a filled amber button and a
 * hairline-outlined one.
 */
const RIPPLE_ON_LIGHT = { color: 'rgba(0,0,0,0.18)' } as const;
const RIPPLE_ON_DARK = { color: 'rgba(255,255,255,0.12)' } as const;

/**
 * The front door.
 *
 * Signing in used to live in Settings and nowhere else, which put the one
 * decision that protects a player's progress behind the one screen nobody opens
 * until something is already wrong. It is asked here instead, once, before there
 * is any progress to lose — and answered either way, because sign-in is optional
 * and a door with only one handle is not a choice.
 *
 * ## Why the pitch is a conversation
 *
 * The obvious composition is a big headline over two buttons. This is a game
 * read entirely as somebody else's text messages, so the honest first screen is
 * the thing itself: three lines arriving as bubbles, in the same type and the
 * same colours the cases use. A player who reads them has already seen the whole
 * interface and knows what they are being handed. A headline saying "a murder
 * mystery told in text messages" would take more words to say less, and would
 * look like every other app's front door while doing it.
 *
 * The last line is the actual mechanic, not a tagline: a contradiction in this
 * engine is one person placed in two places across one shared minute. Nothing
 * here promises a game that is not underneath.
 */

/** The three lines, in arrival order. Keys, not prose — this ships in five languages. */
const LINES = ['landing.line1', 'landing.line2', 'landing.line3'] as const;

/** Gap between bubbles. Long enough to read one before the next lands. */
const STAGGER = 620;

export default function LandingScreen() {
  const t = useTranslator();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const update = useSettingsStore((s) => s.update);
  /** Whatever the provider buttons have to report. Null most of the time. */
  const [notice, setNotice] = useState<Message | null>(null);

  /**
   * Marks the door used, then goes.
   *
   * The flag is set BEFORE navigating, and it has to be: `app/index.tsx` sends
   * anyone without it straight back here, so navigating first would bounce the
   * player between the two screens. Zustand applies the update synchronously, so
   * the home screen's next render already sees it.
   *
   * `replace`, never `push`. This screen is a decision, not a place, and leaving
   * it on the stack would park it behind the player's back button forever.
   * Replace also leaves the home screen underneath — this was pushed from there
   * — which is what gives the case a working back button. A `<Redirect>` here
   * instead of a push is precisely what stranded the first build: it consumed
   * the home screen on the way past, so the demo case opened onto an empty stack
   * with nothing to go back to.
   */
  const leave = useCallback(
    (to: 'sign-in' | 'demo') => {
      update({ hasSeenLanding: true });
      router.replace(to === 'demo' ? `/case/${DEMO_CASE_ID}/threads` : '/sign-in?onboarding=1');
    },
    [update, router],
  );

  /** Reduce Motion gets the finished screen, not a slower version of the arrival. */
  const enter = (index: number) =>
    reduceMotion ? undefined : FadeInDown.duration(420).delay(index * STAGGER);

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.space.xl }]}>
      <View style={styles.head}>
        <Text style={styles.kicker}>{t('landing.kicker')}</Text>
        <Text style={styles.wordmark}>Read Receipts</Text>
      </View>

      <View style={styles.thread}>
        {LINES.map((key, i) => (
          <Animated.View key={key} entering={enter(i)} style={styles.bubble}>
            <Text style={styles.bubbleText}>{t(key)}</Text>
          </Animated.View>
        ))}

        {/*
          The thread does not stop, it waits.

          Six reference welcome screens were pulled for this design and every one
          of them fills the space under the pitch — a logo, a photograph, a
          collage, a feature list. This screen had a bare flex spacer there, and
          it read as an unfinished layout rather than as breathing room.

          The app's own typing indicator is the honest thing to put in it. It
          says the case is still coming in, it is the exact component the
          conversations use, and it costs no new asset. Held back until the last
          line has landed, because somebody typing before they have said anything
          is a loading spinner wearing a costume.
        */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(400).delay(LINES.length * STAGGER)}
        >
          <TypingIndicator />
        </Animated.View>
      </View>

      <View style={styles.spacer} />

      {/* Held back until the last line has landed, so the player reads the case
          before being asked to decide anything about accounts. */}
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(400).delay(LINES.length * STAGGER)}
        style={[styles.actions, { paddingBottom: insets.bottom + theme.space.lg }]}
      >
        <Pressable
          onPress={() => leave('demo')}
          accessibilityRole="button"
          android_ripple={RIPPLE_ON_LIGHT}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t('landing.guest')}</Text>
        </Pressable>

        {/*
          Guest is the loud button and every account route below it is quieter,
          which is the opposite of the usual arrangement and is deliberate. The
          player came to play; an account is how they keep it afterwards.
          Leading with a sign-in form would charge an email address for a game
          they have not seen yet.

          Apple and Google sit between the two because they are the cheapest way
          to say yes -- two taps, no password, no typing on a phone. The email
          route stays available and is now a text link rather than a third
          outlined button: three identical buttons in a column read as a list of
          equals, and these three are not equals.
        */}
        <AuthProviderButtons onResult={setNotice} />

        {notice ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {render(notice, t)}
          </Text>
        ) : null}

        <Pressable
          onPress={() => leave('sign-in')}
          accessibilityRole="button"
          android_ripple={RIPPLE_ON_DARK}
          hitSlop={theme.hit.slop}
          style={({ pressed }) => [styles.emailRoute, pressed && styles.pressed]}
        >
          <Text style={styles.emailRouteText}>{t('landing.signIn')}</Text>
        </Pressable>

        <Text style={styles.note}>{t('landing.syncNote')}</Text>

        {/*
          The legal footer.

          Apple and Google both require a reachable privacy policy, and the EU
          requires terms before a consumer is bound -- but the reason it is on
          the FRONT screen rather than only in Settings is simpler than
          compliance: this is the screen where somebody decides whether to hand
          over an email address, so it is the screen where the terms of doing so
          should be one tap away. See docs/LEGAL-REVIEW.md, Counts 3 and 7.
        */}
        <View style={styles.legal}>
          <Pressable
            onPress={() => void Linking.openURL(PRIVACY_URL).catch(() => undefined)}
            accessibilityRole="link"
            hitSlop={theme.hit.slop}
          >
            <Text style={styles.legalText}>{t('landing.privacy')}</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            onPress={() => void Linking.openURL(TERMS_URL).catch(() => undefined)}
            accessibilityRole="link"
            hitSlop={theme.hit.slop}
          >
            <Text style={styles.legalText}>{t('landing.terms')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, paddingHorizontal: theme.space.lg },

  head: { gap: theme.space.xs, marginBottom: theme.space.xl },
  kicker: {
    ...theme.type.meta,
    color: theme.color.textDim,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  wordmark: { ...theme.type.title, color: theme.color.text, fontSize: 34, lineHeight: 40 },

  /** The same bubble the cases draw, at the same radius — this is the product, not an ad for it. */
  thread: { gap: theme.space.sm, alignItems: 'flex-start', overflow: 'hidden' },
  bubble: {
    maxWidth: '92%',
    backgroundColor: theme.color.bubbleThem,
    borderRadius: theme.radius.bubble,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: { ...theme.type.body, color: theme.color.text },

  spacer: { flex: 1, minHeight: theme.space.xl },

  actions: { gap: theme.space.md },
  primary: {
    minHeight: theme.hit.min + 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.chip,
    backgroundColor: theme.color.accent,
  },
  primaryText: { ...theme.type.body, color: theme.color.bg, fontWeight: '600' },
  /** A text link, not a button. See the comment beside it for why. */
  emailRoute: { minHeight: theme.hit.min, alignItems: 'center', justifyContent: 'center' },
  emailRouteText: { ...theme.type.body, color: theme.color.text, textDecorationLine: 'underline' },

  notice: { ...theme.type.meta, color: theme.color.textDim, textAlign: 'center', lineHeight: 17 },

  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.space.sm },
  legalText: { ...theme.type.meta, color: theme.color.textDim, textDecorationLine: 'underline' },
  legalDot: { ...theme.type.meta, color: theme.color.textDim },
  note: { ...theme.type.meta, color: theme.color.textDim, textAlign: 'center', lineHeight: 17 },
  pressed: { opacity: 0.7 },
});
