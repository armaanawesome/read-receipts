import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useReduceMotion } from '@/settings/useReduceMotion';
import { feedback } from '@/settings/feedback';
import { theme } from './theme';
import { ChatBubble, type BubbleGeometry } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatWallpaper } from './ChatWallpaper';
import { wallpaperIndexFor } from './wallpapers';
import { DateDivider } from './DateDivider';
import { useCaseStore } from '@/state/caseStore';
import { useTranslator } from '@/i18n/useTranslator';
import type { Character, Thread } from '@/engine';

export const PLAYER_ID = 'you';

/** A visible pause in the conversation earns a time marker. */
const TIME_GAP_MINUTES = 5;

/**
 * How near the bottom counts as "following the conversation", in points.
 *
 * Not zero: a finger resting mid-flick, or a bubble whose height settles a pixel
 * late, would otherwise register as "the player has scrolled away" and the next
 * message would arrive off-screen with no indication it had.
 */
const FOLLOW_SLACK = 48;

interface Props {
  thread: Thread;
  characters: readonly Character[];
  onPressClaims: (messageId: string) => void;
}

export function MessageList({ thread, characters, onPressClaims }: Props) {
  const reduceMotion = useReduceMotion();
  const t = useTranslator();
  const markRead = useCaseStore((s) => s.markRead);
  const caseId = useCaseStore((s) => s.script?.id);

  /*
   * The wallpaper is per CONTACT.
   *
   * It used to be per case, so every thread in a case shared one backdrop. A
   * phone does not work that way, and a distinct field per conversation is also
   * the cheapest way to tell the player which thread they are in.
   *
   * A group keys on the thread instead of on a person, so it gets its own
   * backdrop rather than borrowing whichever member happened to be listed first.
   * The case id stays in the seed so the same character name in two different
   * cases is still two different contacts.
   */
  const others = thread.participantIds.filter((id) => id !== PLAYER_ID);
  const solo = others.length === 1 ? others[0] : undefined;
  const roster = characters.filter((c) => c.id !== PLAYER_ID).map((c) => c.id);
  const wallpaperIndex = wallpaperIndexFor(roster, solo, thread.id);
  const wallpaperSeed = `${caseId ?? ''}:${solo ?? thread.id}`;
  const readMessageIds = useCaseStore((s) => s.readMessageIds);

  const initialCount = thread.messages.filter((m) => readMessageIds.includes(m.id)).length;
  const [shown, setShown] = useState(Math.max(initialCount, 1));
  /*
   * The index the NEXT tap reveals, claimed synchronously.
   *
   * `advance` used to read `shown` from its closure, and a closure is only
   * refreshed when React re-renders. Two taps landing before that re-render --
   * a quick double-tap, or any tap on a phone busy animating the previous
   * bubble -- both read the same `shown`: that message's tone played twice, the
   * screen still moved on by two, and the NEXT message arrived in silence. That
   * silent message was as likely as not a clue, whose tone is the one that has
   * to be heard. A ref claimed on the tap itself cannot be read twice.
   */
  const nextRef = useRef(shown);
  nextRef.current = shown;
  const scrollRef = useRef<ScrollView>(null);
  /**
   * A ref, not state, and deliberately so twice over: it is read inside
   * `onContentSizeChange`, where a state value would be the one captured when
   * that closure was created, and it changes on every scroll frame, which is far
   * too often to be worth a re-render.
   */
  const atBottom = useRef(true);

  const byId = new Map(characters.map((c) => [c.id, c]));
  const done = shown >= thread.messages.length;

  /*
   * The conversation advances on a TAP, not on a timer.
   *
   * It used to auto-play: each message arrived on a setTimeout of
   * `theme.motion.typingFor(body)`, which caps at 1.8 seconds however long the
   * line is. That is under two seconds to read a sentence the whole case can
   * hinge on, it cannot be paused, and it does not care whether the player
   * looked away. On a device the messages simply went past.
   *
   * Reading pace belongs to the reader, so the tap is theirs. It also suits what
   * the screen is pretending to be: a conversation handed to you one message at
   * a time.
   */
  const advance = useCallback(() => {
    /*
     * The tone belongs to the message being revealed, and only when somebody
     * else sent it. A phone does not chime at you for your own outgoing text,
     * and firing it on every tap would make the sound meaningless within one
     * conversation.
     *
     * Read before the update rather than inside it: a state updater can be
     * invoked more than once for a single call, and a cue is a side effect.
     */
    const i = nextRef.current;
    if (i >= thread.messages.length) return;
    nextRef.current = i + 1;

    const revealed = thread.messages[i];
    if (revealed && revealed.senderId !== PLAYER_ID) {
      /*
       * Two tones, and the split is the same one the bubble already draws.
       *
       * A message carrying a claim is bold, white and accent-edged, because it
       * is the only kind worth stopping on — it is what the player can pin. It
       * sounded identical to small talk, so forty messages all announced
       * themselves the same way and the ear learned nothing. `hasClaims` here is
       * the exact condition ChatBubble styles on; the two must not drift.
       */
      const carriesClaim = (revealed.claims?.length ?? 0) > 0;
      feedback.cue(carriesClaim ? 'messageClaim' : 'message');
    }
    setShown(i + 1);
  }, [thread.messages]);

  const skipAll = useCallback(() => {
    setShown(thread.messages.length);
  }, [thread.messages.length]);

  /*
   * Marking read follows `shown` rather than happening inside the two actions
   * above, so there is one path for both of them and for whatever a save
   * restored on mount. Skipping used to mark every message itself, which was the
   * same rule written twice with one of them free to drift.
   */
  useEffect(() => {
    thread.messages.slice(0, shown).forEach((m) => markRead(m.id));
  }, [shown, thread.messages, markRead]);

  const visible = thread.messages.slice(0, shown);

  /*
   * Only the OTHER party is ever shown as typing.
   *
   * The next line being the player's own is not something to animate as though
   * somebody else were composing it. The indicator is also the cue that a tap
   * will deliver something, so pointing it at the wrong person misleads twice.
   *
   * reduceMotion no longer dumps the whole thread at once, which is what it used
   * to do. Pacing is not motion — the bubble entrance is, and ChatBubble already
   * suppresses that itself.
   */
  const pending = thread.messages[shown];
  const awaitingOther = !done && pending !== undefined && pending.senderId !== PLAYER_ID;

  return (
    <View style={styles.flex}>
      {/* Behind everything, and pointer-transparent, so taps and pans reach the list. */}
      <ChatWallpaper seed={wallpaperSeed} index={wallpaperIndex} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        /*
         * Reading back is a normal thing to do in a conversation.
         *
         * This used to chase the bottom on EVERY content size change, so
         * scrolling up to re-read an earlier message was undone the instant
         * anything below it changed. A real messaging app follows the newest
         * message only when you are already down there, and leaves you where you
         * are when you are not — so that is what this does now.
         */
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          atBottom.current =
            contentSize.height - (contentOffset.y + layoutMeasurement.height) < FOLLOW_SLACK;
        }}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (atBottom.current) scrollRef.current?.scrollToEnd({ animated: !reduceMotion });
        }}
      >
        {/*
          The tap target lives INSIDE the scroller, not around it.

          Wrapping the ScrollView in a Pressable put a competing responder in
          front of every drag. React Native hands a moved touch to the scroll
          view, but the wrapper still contended for short ones, so small scrolls
          died and only a hard fling got through — exactly the reported "can only
          scroll all the way up or down". As a child, the Pressable receives taps
          and the ScrollView keeps every pan, which is the arrangement that lets
          both gestures work at once.

          `flexGrow` on the content container plus `flex` here is what lets a tap
          land in the empty space below a short conversation, rather than only on
          the bubbles themselves.
        */}
        <Pressable
          onPress={done ? undefined : advance}
          style={styles.tapLayer}
          accessibilityRole={done ? undefined : 'button'}
          accessibilityLabel={done ? t('thread.conversation') : t('thread.tapToContinue')}
        >
        {visible.map((m, i) => {
          const prev = i > 0 ? visible[i - 1] : undefined;
          const next = visible[i + 1];
          const sender = byId.get(m.senderId);
          if (!sender) return null;

          const gap = !prev || m.sentAt - prev.sentAt >= TIME_GAP_MINUTES;
          const geometry: BubbleGeometry = {
            // A time marker breaks the run, so the bubble below it reads as new.
            first: gap || prev?.senderId !== m.senderId,
            last:
              !next ||
              next.senderId !== m.senderId ||
              next.sentAt - m.sentAt >= TIME_GAP_MINUTES,
          };

          return (
            <View key={m.id}>
              {gap ? <DateDivider minutes={m.sentAt} /> : null}
              <ChatBubble
                message={m}
                sender={sender}
                isOwn={m.senderId === PLAYER_ID}
                geometry={geometry}
                onPressClaims={() => onPressClaims(m.id)}
                reduceMotion={reduceMotion}
              />
            </View>
          );
        })}
        {awaitingOther ? <TypingIndicator /> : null}
        </Pressable>
      </ScrollView>

      {!done ? (
        /*
         * `box-none`, not `none`. The old pill was a label with pointer events
         * switched off, because tapping anywhere already skipped the thread.
         * Now a tap advances by one and this is a real button, so the container
         * has to let touches reach the button without swallowing the taps aimed
         * past it at the conversation.
         */
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(400).delay(600)}
          style={styles.footer}
          pointerEvents="box-none"
        >
          <Text style={styles.tapHint}>{t('thread.tapToContinue')}</Text>
          <Pressable
            onPress={skipAll}
            accessibilityRole="button"
            accessibilityLabel={t('thread.skipAll')}
            hitSlop={theme.hit.slop}
            style={({ pressed }) => [styles.skipButton, pressed && styles.skipPressed]}
          >
            <Text style={styles.skipText}>{t('thread.skipAll')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.color.bg },

  // `flexGrow`, so a short conversation still fills the scroller and the tap
  // layer below it covers the whole screen rather than only the bubbles.
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.space.md,
    // Clears the footer, so the newest bubble is never parked under the button.
    paddingBottom: theme.space.xl * 2.5,
  },
  tapLayer: { flex: 1 },

  footer: {
    position: 'absolute',
    bottom: theme.space.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  tapHint: { ...theme.type.meta, color: theme.color.textDim, letterSpacing: 0.4, opacity: 0.7 },
  skipButton: {
    minHeight: theme.hit.min,
    justifyContent: 'center',
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.bubbleThem,
  },
  skipPressed: { opacity: 0.7 },
  skipText: { ...theme.type.meta, color: theme.color.text, letterSpacing: 0.4 },
});
