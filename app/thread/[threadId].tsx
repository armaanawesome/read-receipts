import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, Stack, Redirect } from 'expo-router';
import { useReduceMotion } from '@/settings/useReduceMotion';
import { MessageList, PLAYER_ID } from '@/ui/MessageList';
import { ThreadHeaderTitle } from '@/ui/ThreadHeader';
import { ClaimMenu } from '@/ui/ClaimMenu';
import { useCaseStore } from '@/state/caseStore';
import { saveProgress } from '@/state/persistence';
import { TutorialCoach } from '@/tutorial/TutorialCoach';

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const reduceMotion = useReduceMotion();
  const script = useCaseStore((s) => s.script);
  const pinnedClaimIds = useCaseStore((s) => s.pinnedClaimIds);
  const togglePin = useCaseStore((s) => s.togglePin);
  const openThread = useCaseStore((s) => s.openThread);
  const readCount = useCaseStore((s) => s.readMessageIds.length);
  const [sheetFor, setSheetFor] = useState<string | null>(null);

  const openThreadData = script?.threads.find((t) => t.id === threadId);
  const title = openThreadData?.title ?? '';

  /*
   * The header carries the people in the conversation, not just its name.
   *
   * `headerTitle` as a render function rather than a plain `title`, because a
   * string cannot hold an avatar. Still memoised for the reason the comment
   * below gives — a fresh options object every render makes the navigator
   * setOptions in a loop — and the participant list is resolved here so the
   * callback closes over a stable array.
   */
  const participants = useMemo(() => {
    const ids = openThreadData?.participantIds ?? [];
    return ids
      .map((id) => script?.characters.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
  }, [openThreadData, script]);

  const titleOptions = useMemo(
    () => ({
      title,
      headerTitle: () => <ThreadHeaderTitle title={title} participants={participants} />,
    }),
    [title, participants],
  );

  /**
   * Records the resume position, and persists it as the conversation plays.
   *
   * Reads were previously only written when the player pinned a claim, so
   * reading a whole thread and then backgrounding the app lost the lot. Keying
   * on the read count means one small write per revealed message, which is what
   * makes "continue on with the last text" survive the app being killed.
   */
  const caseId = script?.id;
  useEffect(() => {
    if (!caseId) return;
    openThread(threadId);
    void saveProgress(caseId);
  }, [caseId, threadId, readCount, openThread]);

  if (!script) return <Redirect href="/" />;
  const thread = script.threads.find((t) => t.id === threadId);
  if (!thread) return <Redirect href="/" />;

  const active = sheetFor ? (thread.messages.find((m) => m.id === sheetFor) ?? null) : null;
  const sender = active ? (script.characters.find((c) => c.id === active.senderId) ?? null) : null;

  return (
    <>
      {/* Memoised: an inline literal makes the navigator setOptions every
          render, which loops. See app/_layout.tsx. */}
      <Stack.Screen options={titleOptions} />
      {/* Above the list rather than over it. The list advances on a tap anywhere
          in it, and an overlay is one z-index away from eating the very tap the
          prompt is asking for. */}
      <TutorialCoach screen="thread" />
      <MessageList thread={thread} characters={script.characters} onPressClaims={setSheetFor} />

      <ClaimMenu
        message={active}
        sender={sender}
        isOwn={active?.senderId === PLAYER_ID}
        pinnedClaimIds={pinnedClaimIds}
        reduceMotion={reduceMotion}
        onPick={(claim) => {
          togglePin(claim.id);
          setSheetFor(null);
          void saveProgress(script.id);
        }}
        onClose={() => setSheetFor(null)}
      />
    </>
  );
}
