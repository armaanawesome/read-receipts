import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import {
  Link,
  useFocusEffect,
  useLocalSearchParams,
  useRootNavigationState,
  useRouter,
} from 'expo-router';
import { theme } from '@/ui/theme';
import { useTranslator } from '@/i18n/useTranslator';
import { CaseArt } from '@/ui/CaseArt';
import { CaseGridSkeleton } from '@/ui/Skeleton';
import { ContinueCard } from '@/ui/ContinueCard';
import { getLocalisedCase } from '@content/i18n';
import { useLocalisedCases } from '@/i18n/useCase';
import { useSettingsStore } from '@/settings/settingsStore';
import { useEntitlements } from '@/entitlements/useEntitlements';
import { readResume, readSolvedCaseIds } from '@/state/persistence';
import { decideCaseGate, gateIsLocked, type CaseGate } from '@/state/progression';
import { offerResume, type ResumeOffer } from '@/state/resume';
import { isCaseUnlocked } from '@/entitlements/access';
import { useBed, MENU_BED } from '@/audio';
import type { CaseScript } from '@/engine';

/*
 * The lock rule is imported, not restated.
 *
 * It lived here as a local const, which is precisely how the paywall came to be
 * enforced on the tile instead of on the case. Now `src/entitlements/access.ts`
 * owns it, this screen uses it to draw lock state, and
 * `app/case/[caseId]/_layout.tsx` uses the same function to enforce it. A grid
 * that disagrees with the route is the bug either way round.
 */

interface Resume {
  offer: ResumeOffer;
  script: CaseScript;
  /** Captured with the read, so "12 minutes ago" cannot drift mid-render. */
  now: number;
}

export default function CaseSelectScreen() {
  const t = useTranslator();
  const cases = useLocalisedCases();
  const router = useRouter();
  const localeTag = useSettingsStore((s) => s.settings.localeTag);
  const hasSeenLanding = useSettingsStore((s) => s.settings.hasSeenLanding);
  const hasChosenSetup = useSettingsStore((s) => s.settings.hasChosenSetup);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const {
    entitlementIds,
    loading: entitlementsLoading,
    error: entitlementsError,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const [resume, setResume] = useState<Resume | null>(null);
  /**
   * Null until the saves have been read, which is NOT the same as an empty
   * set. Empty means "nothing solved", and every case after the first would
   * draw locked on that — so the distinction is what stops the grid flashing.
   */
  const [solvedIds, setSolvedIds] = useState<ReadonlySet<string> | null>(null);

  /*
   * The menu bed, for as long as this screen is the one in front.
   *
   * It is a focus effect inside the hook, not a mount effect, which is what
   * makes coming back from a case swap the case's room tone for this one — the
   * home screen never unmounts while a case is open, so a mount effect would
   * fire once at launch and never again.
   */
  useBed(MENU_BED);

  /**
   * On focus, not on mount: the player arrives back here every time they leave
   * a case, and the card has to show where they got to, not where they were
   * when the app started.
   */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const [stored, solved] = await Promise.all([readResume(), readSolvedCaseIds()]);
        if (!alive) return;
        setSolvedIds(solved);
        const script = stored ? getLocalisedCase(stored.last.caseId, localeTag) : undefined;
        const offer = offerResume({
          last: stored?.last ?? null,
          save: stored?.save ?? null,
          script,
          unlocked: script !== undefined && isCaseUnlocked(script, entitlementIds),
        });
        setResume(offer && script ? { offer, script, now: Date.now() } : null);
      })();
      return () => {
        alive = false;
      };
      // localeTag is a dependency because the card shows the case title and the
      // thread name: changing language must retitle the Continue card, not leave
      // the previous language sitting on the first screen.
    }, [entitlementIds, localeTag]),
  );

  /**
   * The front door, on a first launch.
   *
   * Gated on `settingsHydrated`, which is the whole reason that flag exists.
   * Preferences start at their defaults and are replaced wholesale once storage
   * has been read, and the default is `false` — so navigating before the read
   * lands would show the landing to a returning player every launch.
   *
   * ## Pushed, NOT redirected — this is the missing back button
   *
   * This was `<Redirect href="/how-to-play" />`, and a redirect REPLACES the
   * current route. The home screen was therefore consumed on the way past, the
   * walkthrough then replaced itself with the demo case, and the case opened as
   * the only entry on the stack — no parent, so the navigator drew no back
   * button and there was genuinely nowhere to go. It came right on the second
   * launch because the flag was set by then and the whole chain was skipped,
   * which is exactly the "closed the app and did it again and it worked"
   * symptom.
   *
   * A push keeps home underneath. The landing replaces itself with the case, the
   * case inherits home as its parent, and back works. Every route into a case
   * now leaves that parent in place — `app/case/[caseId]/_layout.tsx` carries a
   * belt-and-braces header button for the deep-link case that cannot.
   */
  /**
   * Undefined until the root navigator has mounted.
   *
   * Both effects below navigate from this screen, and navigating before the root
   * layout exists throws "Attempted to navigate before mounting the Root Layout"
   * — which is not hypothetical here: it was thrown by the `open` hand-off the
   * first time it was tested, because a URL carrying that param fires the effect
   * on the very first render. The landing push has been getting away with it
   * only because it waits on an async storage read, which is timing, not a
   * guarantee. `privatetexts://?open=<case>` is a real deep link expo-router
   * publishes for free, and it arrives cold.
   */
  const rootState = useRootNavigationState();
  const navReady = rootState?.key !== undefined;

  /**
   * Setup comes before the landing, and the order is the point.
   *
   * The landing screen is the pitch — three bubbles of case text — and it is
   * translated. Showing it before asking which language the player reads means
   * pitching in English to somebody who cannot read it, with the picker two
   * screens further in. So: setup, then landing.
   *
   * Both gates wait on `settingsHydrated` for the same reason. Preferences start
   * at their defaults and are replaced wholesale once storage has been read, and
   * both flags default to `false` — navigating before the read lands would show
   * both screens to a returning player on every launch.
   */
  const setupPending = settingsHydrated && !hasChosenSetup;
  useEffect(() => {
    if (navReady && setupPending) router.push('/setup');
  }, [navReady, setupPending, router]);

  /*
   * `hasChosenSetup` is in this condition, not just in the one above it.
   * Without it both effects fire on the same render on a first launch, and the
   * landing lands on top of the setup screen the player has not answered yet.
   * Setup returns with `router.back()`, which re-renders this screen with the
   * flag set — and that is the render that pushes the landing.
   */
  const landingPending = settingsHydrated && hasChosenSetup && !hasSeenLanding;
  useEffect(() => {
    if (navReady && landingPending) router.push('/landing');
  }, [navReady, landingPending, router]);

  /**
   * "Next case", handed off through here.
   *
   * The closing screen cannot open a sibling case directly. It sits inside that
   * case's own `NativeTabs` navigator, and a href matching
   * `case/[caseId]/threads` is resolved by the nearest navigator, which reads it
   * as a tab switch and keeps the caseId it already has — so the player pressed
   * Next case and got the current case's inbox. Routing through home leaves the
   * case group properly, and the case layout remounts on the way back in, which
   * is also what re-reads the solved-case set, so the next case is not judged
   * against a set from before this one was finished.
   *
   * Guarded by a ref rather than by clearing the param, which is where the
   * `resume` hand-off this was modelled on and this one part company. Clearing
   * first mutates the navigation state and then pushes against it in the same
   * tick, and on a cold `privatetexts://?open=<case>` that threw "Attempted to
   * navigate before mounting the Root Layout" and left the screen blank. A ref
   * touches no navigation state at all: the push is the only thing that moves,
   * and the id it already handled cannot fire twice.
   */
  const { open } = useLocalSearchParams<{ open?: string }>();
  const handledOpen = useRef<string | null>(null);
  useEffect(() => {
    if (!navReady || !open || handledOpen.current === open) return;
    handledOpen.current = open;
    router.push(`/case/${open}/threads`);
  }, [navReady, open, router]);


  // Blank for the frame between the effect firing and the next screen arriving.
  // The grid drawn underneath is a screen this player has not earned the right
  // to see yet, and a flash of it is how the last build opened. `setupPending`
  // is here for the same reason the landing is: the setup screen is pushed from
  // an effect, so there is a frame before it covers this one.
  if (setupPending || landingPending) return <View style={styles.root} />;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.masthead}>
        <Text style={styles.title}>Read Receipts</Text>
        {/* The pitch is for someone who has not played. A returning player has
            already bought it, and leaving it here would push Continue down the
            screen to make room for an argument they have accepted. */}
        {resume ? null : <Text style={styles.sub}>{t('home.pitch')}</Text>}
      </View>

      {resume ? (
        <ContinueCard offer={resume.offer} script={resume.script} now={resume.now} />
      ) : null}

      {/*
        A store outage used to be silent here: useEntitlements caught the error
        and the grid simply drew every paid case as locked, which reads as "you
        do not own these" rather than "we could not ask". Inline and cleared by
        retrying, never a full-screen blocker - the whole game is bundled and
        plays offline, so blocking it on a network failure would be a worse bug
        than the one being reported.
      */}
      {entitlementsError ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{t('home.storeUnreachable')}</Text>
          <Pressable
            onPress={refreshEntitlements}
            accessibilityRole="button"
            hitSlop={theme.hit.slop}
          >
            <Text style={styles.noticeAction}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        {/* Only earns its place once there are two zones to tell apart. */}
        {resume ? (
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>{t('home.cases.title')}</Text>
          </View>
        ) : null}

        {/*
          The skeleton is not decoration - it fixes a defect. `entitlementIds`
          starts empty while RevenueCat is asked, so drawing the grid straight
          away rendered all twelve paid cases as LOCKED and then popped them open
          a moment later. A paying customer watched their own library re-lock
          itself on every launch.
        */}
        {entitlementsLoading || solvedIds === null ? (
          <CaseGridSkeleton count={cases.length} />
        ) : (
          <View style={styles.grid}>
            {cases.map((c) => {
              const gate = decideCaseGate({
                script: c,
                order: cases,
                solvedIds,
                entitlementIds,
                entitlementsLoading,
                progressLoaded: true,
              });
              const blockedBy =
                gate.kind === 'locked-progression'
                  ? (cases.find((x) => x.id === gate.blockedByCaseId)?.title ?? '')
                  : '';
              return (
                <CaseTile
                  key={c.id}
                  script={c}
                  gate={gate}
                  blockedByTitle={blockedBy}
                  solved={solvedIds.has(c.id)}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* Dev-only. A "Test Store harness" link on the first screen is workshop
          debris, and this is the screen a judge opens first. */}
      {__DEV__ ? (
        <Link href="/debug" style={styles.debug}>
          Test Store harness
        </Link>
      ) : null}
    </ScrollView>
  );
}

function CaseTile({
  script,
  gate,
  blockedByTitle,
  solved,
}: {
  script: CaseScript;
  gate: CaseGate;
  blockedByTitle: string;
  /**
   * Named once, correctly, at least once. Survives a replay: the save keeps
   * `solved` through `restart`, so a player who reopens a favourite does not
   * watch their own tick come off — and does not re-lock everything behind it.
   */
  solved: boolean;
}) {
  const t = useTranslator();
  const count = script.contradictions.length;
  const locked = gateIsLocked(gate);
  const byProgress = gate.kind === 'locked-progression';

  /*
   * A progression lock is NOT a link.
   *
   * The paywall is somewhere to go; "finish the earlier case" is not, and
   * routing to a screen that only says no would cost a push and a back press
   * to deliver one sentence. Said in place instead, naming the case that is in
   * the way — the useful part is WHICH case, and the tile alone cannot fit it.
   */
  if (byProgress) {
    return (
      <View style={styles.tile}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={t('home.locked.body', { title: blockedByTitle })}
          onPress={() =>
            Alert.alert(t('home.locked.title'), t('home.locked.body', { title: blockedByTitle }))
          }
          style={({ pressed }) => [styles.tileInner, pressed && styles.pressed]}
        >
          <CaseArt script={script} locked />
          <Text style={styles.name} numberOfLines={2}>
            {script.title}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{t('home.tile.lockedByProgress')}</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  /*
   * The width lives on this View, NOT on the Pressable inside it.
   *
   * `<Link asChild>` clones its child and supplies its own props, and the
   * tile's sizing did not survive that: measured in a browser, the rendered
   * element computed to `flex-basis: auto; flex-grow: 0; max-width: none` -
   * none of the three values this file sets. The tiles were being sized by
   * their contents, which is why they came out unequal, and why on a device
   * they came out full width: content-sizing a subtree whose first child is a
   * bare `aspectRatio` box with no width of its own has no reason to stop.
   *
   * A plain View outside the Link cannot have its style swallowed, so the
   * column width is stated somewhere that is guaranteed to keep it.
   */
  return (
    <View style={styles.tile}>
    {/*
      The case id travels with the tap.

      Without it the paywall has no idea which case was locked, so it can only
      offer the pack — and "unlock this one" is the whole reason somebody who
      just tapped a single case would buy anything at all.
    */}
    <Link
      href={
        locked
          ? { pathname: '/paywall', params: { caseId: script.id } }
          : `/case/${script.id}/threads`
      }
      asChild
    >
      <Pressable
        accessibilityRole="button"
        // The case title stays as authored — it is case content, not chrome.
        // The tick is a visual mark and would otherwise be silent, so it is
        // said first, where a screen reader user meets it in the same order.
        accessibilityLabel={
          (solved ? `${t('home.tile.solved')}. ` : '') +
          t(
            locked
              ? count === 1
                ? 'home.tile.lockedLabelOne'
                : 'home.tile.lockedLabel'
              : count === 1
                ? 'home.tile.openLabelOne'
                : 'home.tile.openLabel',
            { title: script.title, count },
          )
        }
        style={({ pressed }) => [styles.tileInner, pressed && styles.pressed]}
      >
        <CaseArt script={script} locked={locked} />
        {/*
          The tick leads the title rather than trailing it. Trailing, it would
          land after a name that wraps to two lines at 48% of a phone — some
          tiles would show it on line one and some on line two, and a mark whose
          position moves is a mark that has to be looked for.
        */}
        <View style={styles.nameRow}>
          {solved ? (
            <View style={styles.tick}>
              <Text style={styles.tickMark}>✓</Text>
            </View>
          ) : null}
          <Text style={styles.name} numberOfLines={2}>
            {script.title}
          </Text>
        </View>
        <View style={styles.meta}>
          {/* One mark per contradiction the case hides — the same bar the
              comparison sheet draws, so the motif introduces itself here. */}
          <View style={styles.marks}>
            {Array.from({ length: count }).map((_, i) => (
              <View key={i} style={[styles.mark, locked && styles.markLocked]} />
            ))}
          </View>
          {/* "3 to prove" is a false promise on a case already closed. */}
          <Text style={[styles.metaText, solved && styles.metaSolved]}>
            {solved
              ? t('home.tile.solved')
              : locked
                ? t('home.tile.sealed')
                : t('home.tile.toProve', { count })}
          </Text>
        </View>
      </Pressable>
    </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  content: { padding: theme.space.lg, gap: theme.space.xl, paddingBottom: theme.space.xl },

  masthead: { gap: theme.space.sm },
  title: { ...theme.type.title, color: theme.color.text, fontSize: 32, lineHeight: 38 },
  sub: { ...theme.type.body, color: theme.color.textDim },

  section: { gap: theme.space.md },
  sectionHead: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.rule,
    paddingTop: theme.space.md,
  },
  sectionLabel: { ...theme.type.meta, color: theme.color.textDim, letterSpacing: 0.4 },

  /*
   * space-between rather than a column gap, paired with a plain percentage
   * width below. Percentage `flexBasis` with `flexGrow` and a percentage
   * `maxWidth` is the combination that broke: three interacting values, only
   * reliable if all three survive to the element, and one of them did not.
   * Two 48% columns and the gap is whatever is left.
   */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.space.lg,
  },
  /** Two up. The column, and the only place the width is stated. */
  tile: { width: '48%' },
  /** Inside the Link, so it may lose its style without costing the layout. */
  tileInner: { gap: theme.space.sm },
  pressed: { opacity: 0.7 },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  name: { ...theme.type.body, color: theme.color.text, fontWeight: '600', flex: 1 },
  /** Sized to the cap height of the title beside it, and nudged to sit on its baseline. */
  tick: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.solved,
  },
  tickMark: { color: theme.color.bg, fontSize: 11, lineHeight: 13, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  metaSolved: { color: theme.color.solved },
  marks: { flexDirection: 'row', gap: 3 },
  mark: { width: 2, height: 12, borderRadius: 1, backgroundColor: theme.color.danger },
  markLocked: { backgroundColor: theme.color.rail },
  metaText: { ...theme.type.meta, color: theme.color.textDim, fontSize: 11 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    padding: theme.space.md,
    borderRadius: theme.radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.rule,
    backgroundColor: theme.color.surface,
  },
  noticeText: { ...theme.type.meta, color: theme.color.textDim, flex: 1 },
  noticeAction: {
    ...theme.type.meta,
    color: theme.color.accent,
    textDecorationLine: 'underline',
  },

  debug: { ...theme.type.meta, color: theme.color.textDim },
});
