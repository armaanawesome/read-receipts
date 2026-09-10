import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { feedback } from '@/settings/feedback';
import { theme } from './theme';
import { useTranslator } from '@/i18n/useTranslator';
import { StaticBubble } from './ChatBubble';
import type { Character, Claim, Message } from '@/engine';

interface Props {
  message: Message | null;
  sender: Character | null;
  isOwn: boolean;
  pinnedClaimIds: readonly string[];
  /**
   * Whether this message has been read, which is what actually puts its claims
   * on the record. Separate from `pinnedClaimIds` on purpose — see below.
   */
  recorded: boolean;
  onPick: (claim: Claim) => void;
  onClose: () => void;
  reduceMotion: boolean;
}

/**
 * The message lifts out of the conversation and everything else blurs away.
 *
 * Modelled on the iOS long-press pattern used by WhatsApp, X, Clubhouse and
 * yope: the pressed message stays visible and elevated while its context
 * recedes. It suits this game unusually well — interrogating a single statement
 * is literally the mechanic, so the interface performing that isolation reads
 * as meaning rather than decoration.
 *
 * ## Two states, and this menu used to confuse them
 *
 * It showed "on the record" whenever the claim was in `pinnedClaimIds`, and
 * those are not the same thing at all:
 *
 * - **On the record** is permanent. `availableClaims` derives from what has
 *   been READ, so a message you can long-press is already recorded and stays
 *   recorded for the rest of the case. Nothing takes it back off.
 * - **Pinned** is one of the board's two comparison slots. It is transient by
 *   design: a third pin evicts the oldest, and proving a contradiction clears
 *   both.
 *
 * So the blue "on the record" tick vanished every time the player ran a check
 * or pinned a third statement — holding the same message again showed nothing,
 * as if the game had forgotten it. It had not; the label was reporting the
 * wrong fact. Now the record line comes from `recorded` and never moves, and
 * the slot line says which slot it is in and that tapping takes it out.
 */
export function ClaimMenu({
  message,
  sender,
  isOwn,
  pinnedClaimIds,
  recorded,
  onPick,
  onClose,
  reduceMotion,
}: Props) {
  const t = useTranslator();
  const open = message !== null && sender !== null;
  const claims = message?.claims ?? [];

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      {open ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          style={StyleSheet.absoluteFill}
        >
          <BlurView intensity={38} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel={t('a11y.close')} />

          <View style={styles.stage} pointerEvents="box-none">
            <Animated.View
              entering={reduceMotion ? undefined : ZoomIn.springify().damping(16).mass(0.7)}
              style={styles.lifted}
            >
              <StaticBubble
                message={message}
                sender={sender}
                isOwn={isOwn}
                geometry={{ first: true, last: true }}
              />
            </Animated.View>

            <Animated.View
              entering={reduceMotion ? undefined : FadeInUpDelayed}
              style={styles.card}
            >
              {/* Reuses the board's own heading rather than a second phrasing of
                  it, so the two surfaces cannot drift apart in five languages. */}
              {recorded ? <Text style={styles.recorded}>{t('board.record')}</Text> : null}
              {claims.map((c, i) => {
                const slot = pinnedClaimIds.indexOf(c.id);
                const hint = slot === -1 ? t('claim.pin') : t('claim.unpin', { n: slot + 1 });
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      feedback.notify('success');
                      onPick(c);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: slot !== -1 }}
                    accessibilityLabel={`${c.label}. ${hint}`}
                    style={({ pressed }) => [
                      styles.action,
                      i > 0 && styles.actionDivider,
                      pressed && styles.actionPressed,
                    ]}
                  >
                    <Text style={styles.actionText}>{c.label}</Text>
                    {/* Says what the tap will do, which the old tick never did:
                        picking an already-pinned claim removes it, and a player
                        who thought they were confirming was undoing. */}
                    <Text style={[styles.hint, slot !== -1 && styles.hintOn]}>{hint}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          </View>
        </Animated.View>
      ) : null}
    </Modal>
  );
}

/** Card follows the lifted bubble rather than arriving with it. */
const FadeInUpDelayed = FadeIn.duration(220).delay(90);

const styles = StyleSheet.create({
  dismissArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
    gap: theme.space.md,
  },
  lifted: {
    // Lifted objects cast shadow; that is what sells the elevation.
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  recorded: {
    ...theme.type.meta,
    color: theme.color.proof,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.sm,
  },
  action: {
    minHeight: theme.hit.min,
    justifyContent: 'center',
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  actionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.bubbleThem },
  actionPressed: { backgroundColor: theme.color.bubbleThem },
  actionText: { ...theme.type.claim, color: theme.color.text },
  hint: { ...theme.type.meta, color: theme.color.textDim, marginTop: 3 },
  hintOn: { color: theme.color.proof },
});
