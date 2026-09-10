import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/ui/theme';
import { useTabBarClearance } from '@/ui/useTabBarClearance';
import { BriefingScreen } from '@/ui/BriefingScreen';
import { clockOf } from '@/ui/timeScale';
import { useCaseStore } from '@/state/caseStore';
import { visibleThreads, type CaseScript, type Thread } from '@/engine';
import { ThreadListSkeleton } from '@/ui/Skeleton';
import { CaseClosedScreen } from '@/ui/CaseClosedScreen';
import { TutorialCoach } from '@/tutorial/TutorialCoach';
import { useTranslator } from '@/i18n/useTranslator';

const PLAYER_ID = 'you';

/**
 * The inbox.
 *
 * Deliberately built as flat rows with hairline separators rather than floating
 * cards. Cards read as "app UI"; a real Messages list reads as rows, and this
 * screen's entire job is to be mistaken for one. It is the first thing that has
 * to convince you that you are holding somebody's phone.
 */
export default function ThreadsScreen() {
  const t = useTranslator();
  const { resume } = useLocalSearchParams<{ caseId: string; resume?: string }>();
  const router = useRouter();
  const script = useCaseStore((s) => s.script);
  const confirmedIds = useCaseStore((s) => s.confirmedContradictionIds);
  const readMessageIds = useCaseStore((s) => s.readMessageIds);
  const hydrated = useCaseStore((s) => s.hydrated);
  const solved = useCaseStore((s) => s.solved);
  const replaying = useCaseStore((s) => s.replaying);
  const [briefed, setBriefed] = useState(false);
  // Read before the early returns below, because hooks cannot be conditional.
  const clearance = useTabBarClearance();

  /**
   * Continue hands the conversation off through here rather than linking
   * straight to `/thread/...`, because the thread screen reads its script from
   * the store and this case's layout is what loads it — a direct link would
   * arrive with an empty store and bounce the player back to the home screen.
   *
   * Going through the inbox also leaves the right stack behind: back from the
   * conversation lands on the case, not on the case list.
   */
  useEffect(() => {
    if (!resume || !hydrated || !script) return;
    // Cleared first so returning from the thread — or a tab switch that
    // remounts this screen — cannot fire the same hand-off a second time.
    router.setParams({ resume: '' });
    if (script.threads.some((t) => t.id === resume)) router.push(`/thread/${resume}`);
  }, [resume, hydrated, script, router]);

  if (!script) return null;
  // Wait for the save to be read back. Without this, a case the player is
  // halfway through renders for a frame with nothing marked read, which the
  // briefing gate below reads as a fresh case and flashes the briefing.
  // The wait is correct - see above - but it must not be a blank screen. On a
  // cold start this is the first thing a returning player sees after tapping a
  // case, and the rows it draws are the shape of the inbox that follows.
  if (!hydrated) return <ThreadListSkeleton />;

  /*
   * A case already closed opens on its closing screen, not on its inbox.
   *
   * Reopening a solved case used to drop the player back at the top of the
   * conversations, and the only route to the epilogue and the "next case"
   * button was to read the whole thing again, accuse the same person again, and
   * sit through the confrontation again — a wall in front of progress, built
   * out of content they had already finished.
   *
   * The epilogue comes off the script rather than out of an accusation result,
   * which is what makes this possible at all: `evaluateAccusation` only ever
   * returned `script.solution.epilogue`, so nothing about it ever needed the
   * accusation to have just happened.
   *
   * `replaying` is the escape hatch, set by `restart()` — see caseStore. Without
   * it, pressing Play again would clear the save, land back here, still read
   * `solved`, and show the closing screen it had just come from, forever.
   */
  if (solved && !replaying) {
    return (
      <CaseClosedScreen
        script={script}
        epilogue={script.solution.epilogue}
        proved={confirmedIds.length}
        total={script.contradictions.length}
        messagesRead={readMessageIds.length}
        threadCount={script.threads.length}
      />
    );
  }

  // The briefing stands in front of the inbox on a fresh case only. Once a
  // single message has been read the player has started, and re-showing the
  // settled facts every time they come back would be noise.
  if (script.briefing && readMessageIds.length === 0 && !briefed) {
    return <BriefingScreen script={script} onStart={() => setBriefed(true)} />;
  }

  const threads = visibleThreads(script, {
    confirmedContradictionIds: confirmedIds,
    readMessageIds,
  });
  const hidden = script.threads.length - threads.length;

  return (
    <View style={styles.root}>
      <TutorialCoach screen="threads" />
      {/* `flex: 1` is not decoration here. The scroller is now a child of a flex
          column rather than the screen itself, and without it a ScrollView takes
          its content height and stops scrolling. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: clearance + theme.space.lg }]}
      >
      {threads.map((t, i) => (
        <ThreadRow
          key={t.id}
          thread={t}
          script={script}
          readMessageIds={readMessageIds}
          first={i === 0}
        />
      ))}

      {hidden > 0 ? (
        <Text style={styles.locked}>
          {hidden === 1 ? t('thread.lockedOne') : t('thread.locked', { n: hidden })}
        </Text>
      ) : null}
      </ScrollView>
    </View>
  );
}

function ThreadRow({
  thread,
  script,
  readMessageIds,
  first,
}: {
  thread: Thread;
  script: CaseScript;
  readMessageIds: readonly string[];
  first: boolean;
}) {
  const t = useTranslator();
  const unread = thread.messages.filter((m) => !readMessageIds.includes(m.id)).length;
  const last = thread.messages[thread.messages.length - 1];

  // A one-to-one thread borrows the other person's colour; a group falls back to
  // the thread's own initial, the way a group chat without a photo does.
  const others = thread.participantIds.filter((id) => id !== PLAYER_ID);
  const solo = others.length === 1 ? script.characters.find((c) => c.id === others[0]) : undefined;
  const tint = solo?.avatarColor ?? theme.color.rail;
  const initial = (solo?.name ?? thread.title).slice(0, 1).toUpperCase();

  const sender = last ? script.characters.find((c) => c.id === last.senderId) : undefined;
  const preview = last
    ? `${last.senderId === PLAYER_ID ? 'You: ' : others.length > 1 && sender ? `${sender.name}: ` : ''}${last.body}`
    : 'No messages';

  return (
    <Link href={`/thread/${thread.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unread === 0
            ? t('thread.rowLabelNone', { title: thread.title })
            : unread === 1
              ? t('thread.rowLabelOne', { title: thread.title })
              : t('thread.rowLabel', { title: thread.title, n: unread })
        }
        style={({ pressed }) => [styles.row, !first && styles.divided, pressed && styles.pressed]}
      >
        <View style={[styles.avatar, { backgroundColor: tint }]}>
          <Text style={styles.initial}>{initial}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.line}>
            <Text style={[styles.title, unread > 0 && styles.titleUnread]} numberOfLines={1}>
              {thread.title}
            </Text>
            {last ? <Text style={styles.time}>{clockOf(last.sentAt)}</Text> : null}
          </View>
          <View style={styles.line}>
            <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>
              {preview}
            </Text>
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const AVATAR = 44;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: theme.space.xl },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
  },
  /**
   * The separator starts after the avatar, not at the screen edge — the inset
   * rule is the detail that makes a list read as a native inbox.
   */
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.rule,
    marginLeft: AVATAR + theme.space.md + theme.space.md,
    paddingLeft: 0,
    marginRight: 0,
  },
  pressed: { backgroundColor: theme.color.surface },

  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: 'center', justifyContent: 'center' },
  initial: { ...theme.type.title, color: theme.color.bg, fontSize: 18 },

  body: { flex: 1, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  title: { ...theme.type.body, color: theme.color.text, flex: 1 },
  titleUnread: { fontWeight: '600' },
  time: { ...theme.type.meta, color: theme.color.textDim },
  preview: { ...theme.type.meta, color: theme.color.textDim, flex: 1 },
  previewUnread: { color: theme.color.text },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.proof,
  },
  badgeText: { ...theme.type.meta, color: theme.color.bg, fontWeight: '600', fontSize: 11 },

  locked: {
    ...theme.type.meta,
    color: theme.color.textDim,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.lg,
  },
});
