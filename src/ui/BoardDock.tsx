import { View, Text, StyleSheet, Pressable, type LayoutChangeEvent } from 'react-native';
import { theme } from './theme';
import { useTranslator } from '@/i18n/useTranslator';
import type { Claim } from '@/engine';

/**
 * The comparison controls, docked above the tab bar.
 *
 * They used to sit in the scroll flow between the sheet and the claim list,
 * which broke the one interaction this screen exists for. Past about six claims
 * on the record, the player scrolls down to pin their second statement and the
 * button they need is off-screen behind them — so the compare moment, the thing
 * the whole game is built around, was the hardest control on the board to reach.
 *
 * Docking it is the pattern every comparison tray on Mobbin uses (Trip.com's
 * "Compare (0/3)", Alta's floating "Style 3 items"), and the count belongs in
 * the label for the same reason they put it there: a disabled button that will
 * not say why is a dead end, and a counter turns it into an instruction.
 *
 * The two slots are the other half of it. They show what is loaded without
 * scrolling back up, tinted to match the bars they become on the sheet, and a
 * tap unpins — before this, the only way to drop a statement was to hunt down
 * its chip in the list again.
 */
interface Props {
  readonly a: Claim | null;
  readonly b: Claim | null;
  readonly onUnpin: (claimId: string) => void;
  readonly onCompare: () => void;
  /** Clearance for the native tab bar this dock floats above. */
  readonly clearance: number;
  readonly onMeasure: (height: number) => void;
}

export function BoardDock({ a, b, onUnpin, onCompare, clearance, onMeasure }: Props) {
  const t = useTranslator();
  const pinned = (a ? 1 : 0) + (b ? 1 : 0);
  const ready = pinned === 2;

  return (
    <View
      style={[styles.dock, { paddingBottom: clearance + theme.space.sm }]}
      onLayout={(e: LayoutChangeEvent) => onMeasure(e.nativeEvent.layout.height)}
    >
      <View style={styles.slots}>
        <Slot claim={a} slot={1} onUnpin={onUnpin} />
        <Slot claim={b} slot={2} onUnpin={onUnpin} />
      </View>

      <Pressable
        disabled={!ready}
        onPress={onCompare}
        accessibilityRole="button"
        accessibilityLabel={t('board.compare.label', { n: pinned })}
        accessibilityState={{ disabled: !ready }}
        style={({ pressed }) => [styles.compare, !ready && styles.compareOff, pressed && styles.pressed]}
      >
        <Text
          style={[styles.compareText, !ready && styles.compareTextOff]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {t('board.compare')}
        </Text>
        {/* Absolutely placed so the label stays optically centred as the count changes. */}
        <Text style={[styles.count, !ready && styles.countOff]}>{pinned}/2</Text>
      </Pressable>
    </View>
  );
}

const toneFor = (slot: 1 | 2) => (slot === 2 ? theme.color.proof : theme.color.accent);

function Slot({
  claim,
  slot,
  onUnpin,
}: {
  claim: Claim | null;
  slot: 1 | 2;
  onUnpin: (claimId: string) => void;
}) {
  const t = useTranslator();
  const tone = toneFor(slot);

  if (!claim) {
    return (
      <View
        style={[styles.slot, styles.slotEmpty]}
        accessible
        accessibilityLabel={t('board.slot.emptyLabel', { n: slot })}
      >
        <View style={[styles.marker, styles.markerEmpty]} />
        <Text
          style={styles.slotEmptyText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {t('board.slot.empty')}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onUnpin(claim.id)}
      accessibilityRole="button"
      accessibilityLabel={t('board.slot.filledLabel', { n: slot, label: claim.label })}
      style={({ pressed }) => [styles.slot, { borderColor: tone }, pressed && styles.pressed]}
    >
      <View style={[styles.marker, { backgroundColor: tone }]} />
      <Text style={styles.slotText} numberOfLines={1}>
        {claim.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.md,
    gap: theme.space.sm,
    backgroundColor: theme.color.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.rule,
  },

  slots: { flexDirection: 'row', gap: theme.space.sm },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: theme.hit.min,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.chip,
    borderWidth: 1,
    backgroundColor: theme.color.surface,
  },
  /* Dashed and unfilled: the slot reads as a space waiting to be filled rather
     than as a control that does nothing when tapped. */
  slotEmpty: { borderStyle: 'dashed', borderColor: theme.color.rule, backgroundColor: 'transparent' },
  /** The same 3pt mark the chip carries, so a chip and its slot are one object. */
  marker: { width: 3, height: 20, borderRadius: 1.5 },
  markerEmpty: { backgroundColor: theme.color.rail },
  slotText: { ...theme.type.claim, fontSize: 13, color: theme.color.text, flexShrink: 1 },
  slotEmptyText: { ...theme.type.claim, fontSize: 13, color: theme.color.textDim, flexShrink: 1 },

  compare: {
    minHeight: theme.hit.min,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.xl,
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.chip,
  },
  compareOff: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.color.rule },
  compareText: { ...theme.type.body, color: theme.color.bg, fontWeight: '600' },
  compareTextOff: { color: theme.color.textDim },
  count: {
    position: 'absolute',
    right: theme.space.md,
    ...theme.type.claim,
    fontSize: 13,
    color: theme.color.bg,
    opacity: 0.7,
  },
  countOff: { color: theme.color.textDim, opacity: 1 },

  pressed: { opacity: 0.7 },
});
