import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useReduceMotion } from '@/settings/useReduceMotion';
import { theme } from './theme';
import { useTabBarClearance } from './useTabBarClearance';
import { useTranslator } from '@/i18n/useTranslator';
import { clockOf } from './timeScale';
import type { CaseScript } from '@/engine';

interface Props {
  script: CaseScript;
  onStart: () => void;
}

/**
 * What is not in dispute.
 *
 * Shown before the first thread. Stating the settled facts is what makes the
 * disputed ones legible: a claim can only jar if you already know what it is
 * supposed to line up with. Everything here is presented as recorded fact —
 * mono, ruled, stamped — so that the messages afterwards read as testimony
 * rather than as more of the same.
 */
export function BriefingScreen({ script, onStart }: Props) {
  const t = useTranslator();
  const reduceMotion = useReduceMotion();
  // The native tab bar floats over this screen. Without this the CTA below
  // the brief is drawn underneath it on any case whose brief is long enough
  // to push it to the bottom - which is why it looked case-dependent.
  const clearance = useTabBarClearance();
  const b = script.briefing;
  if (!b) return null;

  const victim = script.characters.find((c) => c.id === b.victimId);
  const place = script.places.find((p) => p.id === b.foundAt.placeId);
  const recovered = (b.recoveredObjectIds ?? [])
    .map((id) => script.objects.find((o) => o.id === id)?.name ?? id)
    .join(', ');

  const rows: [string, string][] = [
    ['Deceased', victim?.name ?? b.victimId],
    ['Found', `${place?.name ?? b.foundAt.placeId}, ${clockOf(b.foundAt.minutes)}`],
    ['Cause', b.causeOfDeath],
    ...((recovered ? [['Recovered', recovered]] : []) as [string, string][]),
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: clearance + theme.space.lg }]}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(theme.motion.base)}
        style={styles.sheet}
      >
        <View style={styles.ticks} pointerEvents="none">
          {Array.from({ length: 24 }).map((_, i) => (
            <View key={i} style={[styles.tick, i % 4 === 0 && styles.tickMajor]} />
          ))}
        </View>

        <Text style={styles.title}>{script.title}</Text>

        <View style={styles.table}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>

        {/* The one line the whole case exists to overturn. */}
        <View style={styles.ruling}>
          <View style={styles.rulingMark} />
          <Text style={styles.rulingText}>{b.ruling}</Text>
        </View>
      </Animated.View>

      <Text style={styles.opening}>{b.opening}</Text>

      <Pressable
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel={t('briefing.open')}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        {/* Neutral. This read 'Open her messages' while case 1's victim is Tom
            Vardy — the wrong pronoun on the very first screen of the tutorial. */}
        <Text style={styles.ctaText}>{t('briefing.open')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg, flexGrow: 1, justifyContent: 'center' },

  sheet: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.chip,
    borderWidth: 1,
    borderColor: theme.color.rule,
    padding: theme.space.md,
    gap: theme.space.md,
  },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', height: 6 },
  tick: { width: StyleSheet.hairlineWidth, height: 3, backgroundColor: theme.color.rule },
  tickMajor: { height: 6, backgroundColor: theme.color.textDim },

  title: { ...theme.type.title, color: theme.color.text },

  table: { gap: theme.space.sm },
  row: { flexDirection: 'row', gap: theme.space.md, alignItems: 'flex-start' },
  /** Fixed width so the values line up into a column — it has to read as a record. */
  label: { ...theme.type.claim, fontSize: 11, color: theme.color.textDim, width: 78 },
  value: { ...theme.type.body, color: theme.color.text, flex: 1 },

  ruling: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    borderTopWidth: 1,
    borderTopColor: theme.color.rule,
    paddingTop: theme.space.md,
  },
  rulingMark: { width: 14, height: 1, backgroundColor: theme.color.danger },
  rulingText: { ...theme.type.claim, fontSize: 12, color: theme.color.dangerText, flexShrink: 1 },

  opening: { ...theme.type.body, color: theme.color.textDim },

  cta: {
    minHeight: theme.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.chip,
  },
  ctaText: { ...theme.type.body, color: theme.color.bg, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
