import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { feedback } from '@/settings/feedback';
import { useReduceMotion } from '@/settings/useReduceMotion';
import { theme } from './theme';
import { useTabBarClearance } from './useTabBarClearance';
import { useTranslator } from '@/i18n/useTranslator';
import { Typewriter } from './Typewriter';
import {
  press,
  establishedMotiveIds,
  type CaseScript,
  type EvidenceRef,
  type Progress,
} from '@/engine';

interface Props {
  script: CaseScript;
  progress: Progress;
  onClosed: () => void;
}

interface Line {
  key: string;
  who: 'them' | 'you';
  text: string;
}

/** Chip text: enough to know which fact you are laying down, not the whole speech. */
function firstSentence(s: string): string {
  const cut = s.indexOf('. ');
  return cut === -1 ? s : s.slice(0, cut + 1);
}

/**
 * The endgame, played as a conversation.
 *
 * The whole game is read as text messages, so the confrontation is too — but
 * this is the one thread where the player speaks. Every line they can say is
 * something they proved or read; nothing here is free. They give ground one fact
 * at a time and confess when there is nothing left to push back with, so the
 * ending belongs to the player's case rather than to a script running out.
 *
 * Every character reference here is gender-neutral: `Character` carries a name
 * and an avatar colour and nothing else, so there is no pronoun to look up.
 */
export function ConfrontationScreen({ script, progress, onClosed }: Props) {
  const t = useTranslator();
  const reduceMotion = useReduceMotion();
  const confrontation = script.confrontation;
  const scrollRef = useRef<ScrollView>(null);
  // The native tab bar overlays this screen; without it the chips sit under it.
  const clearance = useTabBarClearance();

  const [landed, setLanded] = useState<string[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>(() =>
    confrontation ? [{ key: 'open', who: 'them', text: confrontation.opening }] : [],
  );
  const [confessed, setConfessed] = useState(false);

  /*
   * The confession types itself out; these two are how it ends.
   *
   * `skipped` is the player's tap, `revealed` is the typewriter reporting that
   * the last character is on screen. They stay separate because Reduce Motion
   * finishes the passage too, and the button that closes the case has to wait
   * for the text either way — a Close button offered over a half-written
   * confession is an invitation to miss the ending you just spent a case
   * earning.
   */
  const [skipped, setSkipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const typing = confessed && !revealed;
  const onRevealed = useCallback(() => setRevealed(true), []);

  const killer = script.characters.find((c) => c.id === script.solution.killerId);

  /** Only what the player actually holds. Nothing here can be guessed into. */
  const evidence: { ref: EvidenceRef; label: string; key: string }[] = [
    ...script.contradictions
      .filter((c) => progress.confirmedContradictionIds.includes(c.id))
      .map((c) => ({
        ref: { kind: 'contradiction' as const, id: c.id },
        label: firstSentence(c.revelation),
        key: `x:${c.id}`,
      })),
    ...script.motives
      .filter((m) => establishedMotiveIds(script.motives, progress.readMessageIds).includes(m.id))
      .map((m) => ({
        ref: { kind: 'motive' as const, id: m.id },
        label: firstSentence(m.summary),
        key: `m:${m.id}`,
      })),
  ];

  const say = useCallback((next: Line[]) => {
    setLines((prev) => [...prev, ...next]);
    // Let layout settle before chasing the bottom.
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  if (!confrontation || !killer) return null;

  function put(item: { ref: EvidenceRef; label: string; key: string }) {
    if (confessed) return;
    const outcome = press(confrontation!, landed, item.ref);

    if (outcome.kind === 'repeat') {
      feedback.notify('warning');
      say([{ key: `r-${Date.now()}`, who: 'them', text: t('confront.repeat') }]);
      return;
    }

    if (outcome.kind === 'deflected') {
      feedback.impact('light');
      say([
        { key: `p-${item.key}-${Date.now()}`, who: 'you', text: item.label },
        { key: `d-${Date.now()}`, who: 'them', text: outcome.line },
      ]);
      return;
    }

    feedback.notify('success');
    // The two moments the game is allowed to be heard: a fact landing, and the
    // killer giving it up. Both are `signal` cues, so Reduce Motion does not silence them.
    feedback.cue(outcome.complete ? 'confession' : 'contradiction');
    setLanded((l) => [...l, outcome.beat.id]);
    setUsed((u) => [...u, item.key]);

    const next: Line[] = [{ key: `p-${outcome.beat.id}`, who: 'you', text: outcome.beat.press }];
    // The last beat gets no rebuttal in content — there is nothing left to say.
    if (outcome.beat.rebuttal.trim() !== '') {
      next.push({ key: `t-${outcome.beat.id}`, who: 'them', text: outcome.beat.rebuttal });
    }
    say(next);

    if (outcome.complete) setConfessed(true);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.transcript, { paddingBottom: clearance }]}
        onContentSizeChange={() =>
          /* Unanimated while the confession is typing. The content grows forty
             times a second, and forty overlapping scroll animations fight each
             other into a stutter; growing by a few points at a time makes an
             instant scroll read as a smooth one anyway. */
          scrollRef.current?.scrollToEnd({ animated: !reduceMotion && !typing })
        }
      >
        <View style={styles.head}>
          <View style={[styles.avatar, { backgroundColor: killer.avatarColor }]}>
            <Text style={styles.initial}>{killer.name.slice(0, 1)}</Text>
          </View>
          <Text style={styles.headName}>{killer.name}</Text>
        </View>

        {lines.map((l) => (
          <Animated.View
            key={l.key}
            entering={reduceMotion ? undefined : FadeInDown.springify().damping(18).mass(0.6)}
            style={[styles.row, l.who === 'you' ? styles.rowYou : styles.rowThem]}
          >
            <View style={[styles.bubble, l.who === 'you' ? styles.you : styles.them]}>
              <Text style={styles.body}>{l.text}</Text>
            </View>
          </Animated.View>
        ))}

        {confessed ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(600).delay(theme.motion.base)}
            style={styles.confession}
          >
            {/* The passage itself is the skip target, not only the control
                below it: a player who has decided they are done reading reaches
                for the text, not for the bottom of the screen. */}
            <Pressable onPress={() => setSkipped(true)} disabled={revealed} accessible={false}>
              <Typewriter
                text={confrontation.confession}
                style={styles.confessionText}
                instant={reduceMotion || skipped}
                onDone={onRevealed}
              />
            </Pressable>
          </Animated.View>
        ) : null}
      </ScrollView>

      {confessed ? (
        revealed ? (
          <Pressable
            onPress={onClosed}
            accessibilityRole="button"
            style={({ pressed }) => [styles.close, { marginBottom: clearance }, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>{t('confront.close')}</Text>
          </Pressable>
        ) : (
          /* Held back until the last character lands, and doubling as the skip
             control so that waiting is never the only option. */
          <Pressable
            onPress={() => setSkipped(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.skip, { marginBottom: clearance }, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>{t('confront.skip')}</Text>
          </Pressable>
        )
      ) : (
        <View style={[styles.tray, { paddingBottom: clearance }]}>
          <Text style={styles.trayLabel}>
            {/* `them`, not `her`. This was the only line in the game that
                assumed the killer's gender, across sixteen cases that do not
                all end with a woman. */}
            {landed.length === 0
              ? t('confront.open')
              : confrontation.beats.length - landed.length === 1
                ? t('confront.leftOne')
                : t('confront.left', { n: confrontation.beats.length - landed.length })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {evidence.map((e) => {
              const spent = used.includes(e.key);
              return (
                <Pressable
                  key={e.key}
                  onPress={() => put(e)}
                  accessibilityRole="button"
                  accessibilityLabel={t('confront.chipLabel', { name: killer.name, label: e.label })}
                  style={({ pressed }) => [styles.chip, spent && styles.chipSpent, pressed && styles.pressed]}
                >
                  <Text style={[styles.chipText, spent && styles.chipTextSpent]} numberOfLines={3}>
                    {e.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  transcript: { padding: theme.space.md, gap: theme.space.xs, paddingBottom: theme.space.lg },

  head: { alignItems: 'center', gap: theme.space.sm, paddingVertical: theme.space.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  initial: { ...theme.type.title, color: theme.color.bg },
  headName: { ...theme.type.body, color: theme.color.textDim },

  row: { maxWidth: '84%' },
  rowThem: { alignSelf: 'flex-start' },
  rowYou: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.radius.bubble },
  them: { backgroundColor: theme.color.bubbleThem },
  you: { backgroundColor: theme.color.bubbleYou },
  body: { ...theme.type.body, color: theme.color.text },

  confession: {
    marginTop: theme.space.lg,
    paddingTop: theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.rule,
  },
  confessionText: { ...theme.type.body, color: theme.color.text },

  tray: {
    borderTopWidth: 1,
    borderTopColor: theme.color.rule,
    paddingVertical: theme.space.sm,
    gap: theme.space.sm,
    backgroundColor: theme.color.surface,
  },
  trayLabel: { ...theme.type.meta, color: theme.color.textDim, paddingHorizontal: theme.space.md },
  chips: { paddingHorizontal: theme.space.md, gap: theme.space.sm },
  chip: {
    maxWidth: 240,
    justifyContent: 'center',
    borderRadius: theme.radius.chip,
    borderWidth: 1,
    borderColor: theme.color.rule,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    minHeight: theme.hit.min,
  },
  chipSpent: { opacity: 0.35 },
  chipText: { ...theme.type.meta, color: theme.color.text },
  chipTextSpent: { color: theme.color.textDim },

  close: {
    margin: theme.space.md,
    minHeight: theme.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.chip,
  },
  closeText: { ...theme.type.body, color: theme.color.bg, fontWeight: '600' },

  /* Deliberately not a button. It occupies the Close button's place while the
     confession types, and looking like one would invite the tap that ends the
     scene rather than the one that finishes it. */
  skip: {
    margin: theme.space.md,
    minHeight: theme.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { ...theme.type.meta, color: theme.color.textDim },
  pressed: { opacity: 0.7 },
});
