import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { feedback } from '@/settings/feedback';
import { useReduceMotion } from '@/settings/useReduceMotion';
import { theme } from './theme';
import { useTabBarClearance } from './useTabBarClearance';
import { BoardDock } from './BoardDock';
import { ClaimChip } from './ClaimChip';
import { ClaimTimeline } from './ClaimTimeline';
import { ContradictionResult } from './ContradictionResult';
import { describePredicate, attributionFor } from './claimText';
import { useCaseStore } from '@/state/caseStore';
import { saveProgress } from '@/state/persistence';
import { availableClaims, type Claim, type CaseScript } from '@/engine';
import { useTranslator } from '@/i18n/useTranslator';
import { TutorialCoach } from '@/tutorial/TutorialCoach';

export function EvidenceBoard() {
  const t = useTranslator();
  const reduceMotion = useReduceMotion();
  // The native tab bar overlays this screen. Without this the last row is under it.
  const clearance = useTabBarClearance();
  // The dock floats over the scroller, so its real height is the only honest
  // bottom padding. A constant would be wrong the moment a claim label wraps.
  const [dockHeight, setDockHeight] = useState(0);
  const script = useCaseStore((s) => s.script);
  const readMessageIds = useCaseStore((s) => s.readMessageIds);
  const pinnedClaimIds = useCaseStore((s) => s.pinnedClaimIds);
  const comparedIds = useCaseStore((s) => s.lastComparedClaimIds);
  const confirmedIds = useCaseStore((s) => s.confirmedContradictionIds);
  const lastVerdict = useCaseStore((s) => s.lastVerdict);
  const lastConfirmedId = useCaseStore((s) => s.lastConfirmedId);
  const togglePin = useCaseStore((s) => s.togglePin);
  const submitPins = useCaseStore((s) => s.submitPins);

  if (!script) return null;

  const claims = availableClaims(script, readMessageIds);
  const byId = new Map(claims.map((c) => [c.id, c]));

  // Proving a contradiction clears the pins, so fall back to the pair the last
  // check actually ran on. Without that the sheet blanks at the moment of the win.
  const shown = lastVerdict && comparedIds.length === 2 ? comparedIds : pinnedClaimIds;
  const a = byId.get(shown[0] ?? '') ?? null;
  const b = byId.get(shown[1] ?? '') ?? null;

  // The dock shows what is PINNED, which after a win is nothing — the sheet
  // above keeps the proven pair on screen while the slots reset for the next one.
  const pinnedA = byId.get(pinnedClaimIds[0] ?? '') ?? null;
  const pinnedB = byId.get(pinnedClaimIds[1] ?? '') ?? null;

  const matched = script.contradictions.find((c) => c.id === lastConfirmedId);
  const proven = script.contradictions.filter((c) => confirmedIds.includes(c.id));

  const runCheck = () => {
    submitPins();
    /*
     * The cue fires HERE, on the board, which is where a contradiction is
     * actually proven. It was wired only in the confrontation screen, so
     * the single most important moment in the game — two statements that
     * cannot both be true — happened in silence.
     *
     * Read back after the call because zustand applies synchronously, and
     * a failed comparison must not be rewarded with the success sound.
     */
    const verdict = useCaseStore.getState().lastVerdict;
    if (verdict?.ok) {
      feedback.notify('success');
      feedback.cue('contradiction');
    } else {
      feedback.notify('warning');
      /*
       * The refusal is not a failure state, and it is the reason this game
       * exists: the engine says these two claims are about different people, or
       * different times, and that explanation is what turns a wrong pairing into
       * a lesson. It fired a haptic and nothing else, so the single most
       * characteristic moment in the game was the one with no sound.
       */
      feedback.cue('refused');
    }
    // Persist after the verdict resolves: a proven contradiction unlocks
    // threads, and losing that to a force-quit would be brutal.
    void saveProgress(script.id);
  };

  return (
    <View style={styles.root}>
      <RuledGround />
      <TutorialCoach screen="board" />
      {/* `flex: 1` is not decoration here. The scroller is now a child of a flex
          column rather than the screen itself, and without it a ScrollView takes
          its content height and stops scrolling. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: dockHeight + theme.space.lg }]}
      >
        <Sheet script={script} a={a} b={b} lit={lastVerdict?.ok === true} reduceMotion={reduceMotion} />

        <ContradictionResult
          verdict={lastVerdict}
          revelation={matched?.revelation}
          reduceMotion={reduceMotion}
        />

        <SectionHead label={t('board.record')} value={String(claims.length)} />
        {claims.length === 0 ? (
          <Text style={styles.empty}>{t('board.record.empty')}</Text>
        ) : (
          <View style={styles.list}>
            {claims.map((c) => {
              const at = pinnedClaimIds.indexOf(c.id);
              return (
                <ClaimChip
                  key={c.id}
                  claim={c}
                  pinned={at !== -1}
                  slot={at === 0 ? 1 : at === 1 ? 2 : undefined}
                  onPress={() => togglePin(c.id)}
                />
              );
            })}
          </View>
        )}

        {proven.length > 0 ? (
          <>
            {/* The case's own shape, which nothing else on the board said. A
                player who has proven two of five is in a different position
                from one who has proven two of two, and only this line tells
                them which. */}
            <SectionHead
              label={t('board.proven')}
              value={t('board.proven.count', {
                done: proven.length,
                total: script.contradictions.length,
              })}
            />
            <View style={styles.list}>
              {proven.map((c) => (
                <View key={c.id} style={styles.proof}>
                  <View style={styles.proofMark} />
                  <Text style={styles.proofText}>{c.revelation}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <BoardDock
        a={pinnedA}
        b={pinnedB}
        onUnpin={togglePin}
        onCompare={runCheck}
        clearance={clearance}
        onMeasure={setDockHeight}
      />
    </View>
  );
}

/**
 * The board's own material.
 *
 * The chat surface spends every pixel pretending to be a real messaging app; the
 * board is the one screen that is diegetically the player's own workspace, and
 * until now it wore the same flat ground as everything else. Faint ruled lines
 * are the cheapest thing that says "a record is being kept here" without
 * decorating anything or costing a single tap target.
 *
 * Rasterised for the same reason the chat wallpaper is: forty static hairlines
 * that never animate, flattened to one texture so they stay out of every
 * subsequent frame.
 */
const RULE_GAP = 28;
const RULE_COUNT = 40;

function RuledGround() {
  return (
    <View
      style={styles.ground}
      pointerEvents="none"
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
    >
      {Array.from({ length: RULE_COUNT }).map((_, i) => (
        <View key={i} style={[styles.rule, { top: i * RULE_GAP }]} />
      ))}
    </View>
  );
}

/**
 * The instrument. It is on screen whether or not anything is loaded into it,
 * because a tool that appears only once you have used it correctly cannot teach
 * you what it is for.
 */
function Sheet({
  script,
  a,
  b,
  lit,
  reduceMotion,
}: {
  script: CaseScript;
  a: Claim | null;
  b: Claim | null;
  lit: boolean;
  reduceMotion: boolean;
}) {
  const t = useTranslator();

  if (!a || !b) {
    return (
      <View style={styles.waiting}>
        <View style={styles.axis}>
          <View style={styles.axisRule} />
        </View>
        <View style={styles.emptyRail} />
        <View style={styles.emptyRail} />
        {/* Names what the instrument is, rather than repeating the dock's
            instruction back at a player who is already looking at two slots. */}
        <Text style={styles.waitingText}>{t('board.waiting')}</Text>
      </View>
    );
  }

  const name = (id: string) => script.characters.find((c) => c.id === id)?.name ?? id;
  const claimOf = (c: Claim) => ({
    what: describePredicate(script, c),
    who: attributionFor(script, c),
    window: c.window,
  });

  return (
    <ClaimTimeline
      subjectName={a.subject === b.subject ? name(a.subject) : `${name(a.subject)} · ${name(b.subject)}`}
      subjectMeta={a.subject === b.subject ? t('board.subject.one') : ''}
      overlapLabel={t('board.overlap')}
      a={claimOf(a)}
      b={claimOf(b)}
      conflict={lit}
      reduceMotion={reduceMotion}
    />
  );
}

function SectionHead({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.section}>{label}</Text>
      <View style={styles.sectionRule} />
      <Text style={styles.count}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  scroll: { flex: 1 },
  content: { padding: theme.space.md, gap: theme.space.lg },

  ground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.color.rule,
    opacity: 0.45,
  },

  waiting: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.chip,
    padding: theme.space.md,
    gap: theme.space.md,
  },
  axis: { flexDirection: 'row', alignItems: 'center' },
  axisRule: { flex: 1, height: 1, backgroundColor: theme.color.rule },
  emptyRail: { height: 10, borderRadius: 5, backgroundColor: theme.color.rail },
  waitingText: { ...theme.type.meta, color: theme.color.textDim },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  section: { ...theme.type.sender, color: theme.color.textDim },
  sectionRule: { flex: 1, height: 1, backgroundColor: theme.color.rule },
  count: { ...theme.type.claim, fontSize: 12, color: theme.color.textDim },

  empty: { ...theme.type.body, color: theme.color.textDim },
  list: { gap: theme.space.sm },
  proof: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.chip,
    padding: theme.space.md,
  },
  /** A hairline mark, not a 2px colour bar down the side of the card. */
  proofMark: { width: 14, height: 1, backgroundColor: theme.color.danger, marginTop: 10 },
  proofText: { ...theme.type.body, color: theme.color.text, flexShrink: 1 },
});
