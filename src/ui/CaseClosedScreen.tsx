import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { theme } from './theme';
import { useTabBarClearance } from './useTabBarClearance';
import { useTranslator } from '@/i18n/useTranslator';
import { useReduceMotion } from '@/settings/useReduceMotion';
import { useCaseStore } from '@/state/caseStore';
import { saveProgress } from '@/state/persistence';
import { nextCaseAfter } from '@/state/progression';
import { isCaseUnlocked } from '@/entitlements/access';
import { useEntitlements } from '@/entitlements/useEntitlements';
import { useLocalisedCases } from '@/i18n/useCase';
import type { CaseScript } from '@/engine';

/** See app/landing.tsx: an opacity dip alone reads as nothing on Android. */
const RIPPLE_ON_LIGHT = { color: 'rgba(0,0,0,0.18)' } as const;
const RIPPLE_ON_DARK = { color: 'rgba(255,255,255,0.12)' } as const;

/**
 * The end of a case: what happened, and three ways out.
 *
 * This screen used to be a centred title, the epilogue, and nothing else — no
 * button of any kind. The only exit was the system back gesture, and on a case
 * opened straight out of onboarding there was not even that, so a player who
 * finished the game they had just been handed was stuck inside it. That is the
 * defect this file exists to fix; the styling below is the second half of the
 * same complaint.
 *
 * ## The record, then the story
 *
 * It opens with a closed-file header rather than a headline, in the mono face
 * the board and the claim chips use — the one that reads as transcribed record
 * rather than conversation. The case is a document now, and it should look like
 * one being stamped shut. Underneath, the epilogue and the coda stay exactly as
 * they were: prose, then messages arriving afterwards, which is the beat that
 * makes the ending land.
 *
 * ## Why three buttons and not one
 *
 * They answer three genuinely different intentions and none substitutes for
 * another. "Next case" is the one the game wants and gets the weight; "All
 * cases" is for a player who wants to choose; "Play again" is quiet and last,
 * because it throws away a finished playthrough and no button that does that
 * should be easy to hit by accident.
 */

interface Props {
  script: CaseScript;
  epilogue: string;
  /** Contradictions the player actually proved, of the case's total. */
  proved: number;
  total: number;
  /** Messages read and conversations in the case — the other two figures on the score row. */
  messagesRead: number;
  threadCount: number;
  /** Lets the caller drop its own "this case is over" state before the replay opens. */
  /**
   * Lets the caller drop its own "this case is over" state before the replay
   * opens. Optional because the inbox — which renders this for a case reopened
   * after being solved — holds no such state; the store alone decides there.
   */
  onReplay?: (() => void) | undefined;
}

export function CaseClosedScreen({
  script,
  epilogue,
  proved,
  total,
  messagesRead,
  threadCount,
  onReplay,
}: Props) {
  const t = useTranslator();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  // The raw inset was wrong here for the reason tabBarClearance.ts documents:
  // it reads bar-inclusive under iOS 26 native tabs and bar-exclusive elsewhere,
  // so trusting it directly leaves these buttons under the bar on any device
  // that reports the second kind.
  const clearance = useTabBarClearance();
  const cases = useLocalisedCases();
  const { entitlementIds } = useEntitlements();
  const restart = useCaseStore((s) => s.restart);

  const killer = script.characters.find((c) => c.id === script.solution.killerId);
  const next = nextCaseAfter(script.id, cases);
  /*
   * A paid next case still gets a button — it goes to the paywall instead. The
   * progression gate is satisfied at this exact moment, the player having just
   * solved the case standing in front of it, so this is the one screen where
   * that offer is honest rather than premature.
   */
  const nextUnlocked = next ? isCaseUnlocked(next, entitlementIds) : false;

  /**
   * Home, whatever the stack looks like.
   *
   * `dismissAll` pops to the root rather than back one screen, which matters
   * because the player may have come through the inbox and a conversation to get
   * here. `canGoBack` is the guard for a case with no history at all — a deep
   * link, or the demo opened straight out of onboarding — where there is nothing
   * to pop and replacing is the only way out.
   */
  const goHome = useCallback(() => {
    if (router.canGoBack()) router.dismissAll();
    else router.replace('/');
  }, [router]);

  const replay = useCallback(() => {
    restart();
    // Written straight away, so the emptied case survives the app being killed
    // before the player reads a single message of it. saveProgress reads the
    // store, and `restart` has left `solved` standing — the tick on the case
    // grid must not come off because somebody chose to play a case again.
    void saveProgress(script.id);
    onReplay?.();
    router.replace(`/case/${script.id}/threads`);
  }, [restart, script.id, onReplay, router]);

  /**
   * The next case, opened by way of the home screen.
   *
   * This used to be `router.replace('/case/<next>/threads')` and it did not
   * work: it left the player looking at the CURRENT case's inbox. The reason is
   * that this screen lives inside the case's own `NativeTabs` navigator, so a
   * href matching `case/[caseId]/threads` is resolved by the nearest navigator
   * — which reads it as "switch to the threads tab" and keeps the caseId it
   * already has. The case never changed; only the tab did.
   *
   * Handing off through home fixes it properly rather than by fighting the
   * resolution. The root Stack owns `/`, so the case group is genuinely left,
   * and the case layout REMOUNTS on the way back in. That second part matters
   * as much as the first: the layout reads the solved-case set once on mount,
   * so without a remount it would still be holding the set from before this
   * case was solved, and would bounce the next case as progression-locked.
   *
   * The param round-trip mirrors the `resume` hand-off in
   * app/case/[caseId]/threads.tsx, which exists for the same class of reason.
   */
  const openNext = useCallback(() => {
    if (!next) return;
    if (!nextUnlocked) {
      router.replace('/paywall');
      return;
    }
    router.replace({ pathname: '/', params: { open: next.id } });
  }, [router, next, nextUnlocked]);

  return (
    <Animated.ScrollView
      entering={reduceMotion ? undefined : FadeIn.duration(600)}
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <View style={styles.record}>
        <Text style={styles.stamp}>{t('closed.stamp')}</Text>
        <Text style={styles.caseName}>{script.title}</Text>

        {killer ? (
          <View style={styles.namedRow}>
            <View style={[styles.avatar, { backgroundColor: killer.avatarColor }]}>
              <Text style={styles.initial}>{killer.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.namedBody}>
              <Text style={styles.namedName}>{killer.name}</Text>
              <Text style={styles.namedRole}>{t('closed.named')}</Text>
            </View>
          </View>
        ) : null}

      </View>

      {/*
        A row of figures, not a sentence.

        Six reference completion screens were pulled for this, and the three
        strongest — Quizlet, Duolingo, Mimo — all end on a ROW of small stat
        tiles rather than a line of prose. It is the established grammar for
        "here is how you did", and it beats a sentence here for a specific
        reason: three numbers side by side invite comparison between
        playthroughs, which is the thing that makes somebody press Play again.

        The marks stay, above the first figure. They have been the unit of
        evidence all game — on the tile, on the accusation sheet, on the board —
        and this is the screen where they finally read as a score.
      */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <View style={styles.marks}>
            {Array.from({ length: total }).map((_, i) => (
              <View key={i} style={[styles.mark, i >= proved && styles.markMissed]} />
            ))}
          </View>
          <Text style={styles.statValue}>
            {proved}/{total}
          </Text>
          <Text style={styles.statLabel}>{t('closed.statProved')}</Text>
        </View>

        <View style={styles.statRule} />

        <View style={styles.stat}>
          <Text style={styles.statValue}>{messagesRead}</Text>
          <Text style={styles.statLabel}>{t('closed.statRead')}</Text>
        </View>

        <View style={styles.statRule} />

        <View style={styles.stat}>
          <Text style={styles.statValue}>{threadCount}</Text>
          <Text style={styles.statLabel}>{t('closed.statThreads')}</Text>
        </View>
      </View>

      <Text style={styles.epilogue}>{epilogue}</Text>

      {script.coda ? (
        <View style={styles.coda}>
          <Text style={styles.codaFrom}>{script.coda.from}</Text>
          {script.coda.messages.map((m, i) => (
            <Animated.View
              key={i}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInDown.springify().damping(18).mass(0.6).delay(1400 + i * 1100)
              }
              style={styles.codaBubble}
            >
              <Text style={styles.codaText}>{m}</Text>
            </Animated.View>
          ))}
        </View>
      ) : null}

      <View style={[styles.actions, { paddingBottom: clearance }]}>
        {next ? (
          <Pressable
            onPress={openNext}
            accessibilityRole="button"
            android_ripple={RIPPLE_ON_LIGHT}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>
              {t(nextUnlocked ? 'closed.next' : 'closed.unlockNext', { title: next.title })}
            </Text>
          </Pressable>
        ) : (
          // The last case in the game. Saying so beats an absent button where one
          // has stood after every case before it.
          <Text style={styles.finale}>{t('closed.finale')}</Text>
        )}

        <Pressable
          onPress={goHome}
          accessibilityRole="button"
          android_ripple={RIPPLE_ON_DARK}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t('closed.allCases')}</Text>
        </Pressable>

        <Pressable
          onPress={replay}
          accessibilityRole="button"
          accessibilityHint={t('closed.replayHint')}
          style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
        >
          <Text style={styles.quietText}>{t('closed.replay')}</Text>
        </Pressable>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg, paddingBottom: theme.space.xl },

  /** The closed file. Ruled, not floating — a record, not a card. */
  record: {
    gap: theme.space.md,
    paddingBottom: theme.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.rule,
  },
  stamp: {
    ...theme.type.claim,
    fontSize: 12,
    color: theme.color.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  caseName: { ...theme.type.title, color: theme.color.text, fontSize: 28, lineHeight: 34 },

  namedRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { ...theme.type.title, color: theme.color.bg, fontSize: 18 },
  namedBody: { flex: 1, gap: 1 },
  namedName: { ...theme.type.body, color: theme.color.text, fontWeight: '600' },
  namedRole: { ...theme.type.meta, color: theme.color.textDim },

  /**
   * Three equal columns split by hairlines, rather than three bordered cards.
   * Cards inside a screen that already opens with a ruled record would be a box
   * inside a box; the rule is the same separator the rest of the app uses.
   */
  stats: { flexDirection: 'row', alignItems: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statRule: { width: StyleSheet.hairlineWidth, backgroundColor: theme.color.rule },
  statValue: { ...theme.type.title, color: theme.color.text, fontSize: 24, lineHeight: 30 },
  statLabel: {
    ...theme.type.meta,
    color: theme.color.textDim,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  marks: { flexDirection: 'row', gap: 3, marginBottom: 2 },
  mark: { width: 3, height: 14, borderRadius: 1.5, backgroundColor: theme.color.danger },
  /** Proof the player never found. Drawn, so the bar reads as a score out of something. */
  markMissed: { backgroundColor: theme.color.rail },

  epilogue: { ...theme.type.body, color: theme.color.text, lineHeight: 24 },

  coda: {
    paddingTop: theme.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.rule,
    gap: theme.space.sm,
  },
  codaFrom: { ...theme.type.claim, fontSize: 11, color: theme.color.textDim },
  codaBubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: theme.color.bubbleThem,
    borderRadius: theme.radius.bubble,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  codaText: { ...theme.type.body, color: theme.color.text },

  actions: {
    gap: theme.space.md,
    paddingTop: theme.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.rule,
  },
  primary: {
    minHeight: theme.hit.min + 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.color.accent,
  },
  primaryText: {
    ...theme.type.body,
    color: theme.color.bg,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondary: {
    minHeight: theme.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.rule,
  },
  secondaryText: { ...theme.type.body, color: theme.color.text },
  quiet: { minHeight: theme.hit.min, alignItems: 'center', justifyContent: 'center' },
  /**
   * Body size in the accent, not 12pt grey.
   *
   * The third action on every reference completion screen is a real link at
   * reading size — Quizlet's "Choose set" sits directly under two full buttons
   * and is still legible as a control. Dim meta type at 12pt reads as a caption,
   * and a caption is not something anybody presses.
   */
  quietText: { ...theme.type.body, color: theme.color.accent },
  finale: { ...theme.type.body, color: theme.color.accent, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
