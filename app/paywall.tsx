import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { PurchasesPackage } from 'react-native-purchases';
import { theme } from '@/ui/theme';
import { useTranslator } from '@/i18n/useTranslator';
import { render, type Message } from '@/i18n/message';
import { useLocalisedCase } from '@/i18n/useCase';
import { useEntitlements } from '@/entitlements/useEntitlements';
import {
  getCaseOfferings,
  purchaseCasePack,
  restorePurchases,
} from '@/entitlements/revenuecat';
import { holdsCasePack, isCaseUnlocked } from '@/entitlements/access';
import {
  chooseOptions,
  classifyPurchaseFailure,
  FAILURE_MESSAGE_KEY,
  type PurchaseOptions,
} from '@/entitlements/offering';
import { PAID_CASE_COUNT, perCasePrice } from '@/entitlements/pricing';

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable'; reason: Message }
  /** Paid. Waiting for the entitlement to arrive on the listener. */
  | { kind: 'settling' }
  | { kind: 'purchased' }
  /** The store said no. `reason` is the classified sentence, not a generic one. */
  | { kind: 'failed'; reason: Message };

/**
 * How long to wait for an entitlement after the store says yes.
 *
 * Not a network timeout — the purchase has already completed. This is the window
 * in which a correct setup delivers `CustomerInfo`, which is well under a
 * second. Anything past it means the money moved and the grant did not, which is
 * the exact `case_pack_01` failure: purchase succeeds, receipt valid, nothing
 * unlocks, no error anywhere. Eight seconds is long enough that a slow phone
 * never sees this, and short enough that nobody is left staring at a spinner
 * wondering whether they have been charged.
 */
const SETTLE_TIMEOUT_MS = 8000;

/**
 * A deliberately custom paywall rather than RevenueCatUI.
 *
 * RevenueCatUI renders a dashboard-templated layout, which would be the one
 * screen in this app that looks like a game store — breaking the premise that
 * you are reading a real phone. The purchase flow underneath is the hardened
 * one from src/entitlements, so we lose nothing but the stock chrome.
 *
 * ## It sells two things, and the difference is a safety property
 *
 * A locked tile arrives here with its own `caseId`. That buys either this one
 * case or the whole pack, and `chooseOptions` decides which package is which by
 * exact identifier — never by position in the offering. The single-case card is
 * simply absent when the store does not sell that product, because a button
 * labelled "this case, one pound" that charges for the pack is worse than no
 * button at all.
 */
export default function PaywallScreen() {
  const router = useRouter();
  const t = useTranslator();
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  const script = useLocalisedCase(caseId);
  const { entitlementIds, loading, unavailableReason } = useEntitlements();

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [options, setOptions] = useState<PurchaseOptions<PurchasesPackage>>({
    single: null,
    bundle: null,
  });
  const [choice, setChoice] = useState<'single' | 'bundle'>('bundle');
  /**
   * Purchase problems live beside the phase, not inside it.
   *
   * A declined card must not take the buy buttons off the screen — the player's
   * next move is to try the other option or the same one again, and a screen
   * that replaces itself with an error makes them close it and start over.
   */
  const [problem, setProblem] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPhase({ kind: 'loading' });
    setProblem(null);
    // A build that cannot legally configure the store fails here, not at the
    // offering call — otherwise this reports "nothing to sell", which sends the
    // reader looking at the dashboard instead of at the build configuration.
    if (unavailableReason) {
      setPhase({ kind: 'unavailable', reason: { raw: unavailableReason } });
      return;
    }
    try {
      /*
       * Both offerings, merged, because the catalogue is split across them.
       *
       * The dashboard keeps the pack in the Current offering and each case in
       * its own offering named after it. Reading only Current would find the
       * pack and nothing else — which is exactly what shipped, and why a build
       * with all twelve per-case products created still drew one card.
       *
       * The two sets cannot collide: a package is the single-case option only on
       * an exact `single_case_<id>` identifier, and the pack only on `all_cases`.
       */
      const { current, forCase } = await getCaseOfferings(caseId);
      const packages = [
        ...(current?.availablePackages ?? []),
        ...(forCase?.availablePackages ?? []),
      ];
      const picked = chooseOptions(packages, caseId);
      if (!picked.single && !picked.bundle) {
        setPhase({ kind: 'unavailable', reason: { key: 'paywall.empty' } });
        return;
      }
      setOptions(picked);
      // The pack is preselected where it exists: it is the better deal, and it
      // is the option guaranteed to be sellable. Never preselect an option that
      // is not on the screen.
      setChoice(picked.bundle ? 'bundle' : 'single');
      setPhase({ kind: 'ready' });
    } catch (e) {
      // A store error arrives from the platform already localised to the
      // device, so it is passed through as raw rather than replaced.
      setPhase({
        kind: 'unavailable',
        reason: e instanceof Error ? { raw: e.message } : { key: 'paywall.unreachable' },
      });
    }
  }, [unavailableReason, caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * The entitlement, not the purchase call, is what says this worked.
   *
   * So this fires for a purchase, a restore, a renewal made on another device,
   * and — the case worth naming — a purchase that completed while the app was
   * killed mid-payment. There is nothing to recover on relaunch: the store
   * replays it into `CustomerInfo`, `useEntitlements` reads it before the first
   * screen paints, and the tile is simply open.
   */
  const unlocked = script
    ? isCaseUnlocked(script, entitlementIds)
    : // Opened with no case in hand, so the pack is the only thing on sale here
      // and the only thing that closes the screen.
      holdsCasePack(entitlementIds);

  /**
   * Whether they already owned it when this screen opened.
   *
   * Without it, a restore on launch would greet somebody with "thank you for
   * your purchase" for a purchase made last week. Null until the store has
   * answered once, because `useEntitlements` opens at `[]` and reading that as
   * "did not own it" would make every owner see the confirmation.
   */
  const ownedAtMount = useRef<boolean | null>(null);
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current || loading) return;
    if (ownedAtMount.current === null) ownedAtMount.current = unlocked;
    if (!unlocked) return;
    // Latched, because router.back() re-renders, and an effect that can run
    // twice here is the "Maximum update depth exceeded" loop this screen had.
    settled.current = true;
    if (ownedAtMount.current) router.back();
    else setPhase({ kind: 'purchased' });
  }, [unlocked, loading, router]);

  /** Paid, but nothing arrived. Put the buttons back and say what to try. */
  useEffect(() => {
    if (phase.kind !== 'settling') return;
    const timer = setTimeout(() => {
      setPhase({ kind: 'failed', reason: { key: 'paywall.error.notGranted' } });
    }, SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [phase.kind]);

  const restore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await restorePurchases();
    } catch {
      // Restoring is a repair attempt, not a purchase. The listener reports any
      // success; a failure here leaves the screen exactly as it was.
    } finally {
      setBusy(false);
    }
  }, [busy]);

  async function buy(pkg: PurchasesPackage) {
    // The double-tap guard. RevenueCat also refuses a concurrent purchase with
    // OPERATION_ALREADY_IN_PROGRESS, but that would surface as an error on a
    // second tap the player never meant as a second purchase.
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const outcome = await purchaseCasePack(pkg);
    setBusy(false);

    if (outcome.kind === 'purchased') {
      setPhase({ kind: 'settling' });
      return;
    }
    // Backing out of the store sheet is a normal thing to do. Saying anything
    // at all about it reads as an accusation.
    if (outcome.kind === 'cancelled') return;

    const failure = classifyPurchaseFailure(outcome.error);
    if (failure === 'cancelled') return;
    if (failure === 'alreadyOwned') {
      /*
       * Not a failure page. They own it and this device does not know, so the
       * repair is a restore, not a second charge — and putting "your payment was
       * not completed" in front of somebody who has already paid would be the
       * worst sentence available here.
       */
      setProblem({ key: FAILURE_MESSAGE_KEY.alreadyOwned });
      void restore();
      return;
    }
    setPhase({ kind: 'failed', reason: { key: FAILURE_MESSAGE_KEY[failure] } });
  }

  if (phase.kind === 'purchased') {
    return (
      <View style={styles.done}>
        {/* Drawn, not an emoji: an emoji tick renders in a different typeface on
            every platform and carries a colour this screen does not choose. */}
        <View style={styles.doneMark}>
          <Text style={styles.doneTick}>✓</Text>
        </View>
        <Text style={styles.doneTitle}>{t('paywall.done.title')}</Text>
        <Text style={styles.doneBody}>{t('paywall.done.body')}</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, styles.doneCta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{t('paywall.done.cta')}</Text>
        </Pressable>
      </View>
    );
  }

  if (phase.kind === 'failed') {
    return (
      <View style={styles.done}>
        {/*
          The same ring as the confirmation, in danger, carrying "!" instead of
          a tick. Two screens that mean opposite things should be recognisably
          the same object — it is the mark and the colour that differ, not the
          layout, so nobody has to re-read the page to work out what happened.
        */}
        <View style={[styles.doneMark, styles.failedMark]}>
          <Text style={[styles.doneTick, styles.failedTick]}>!</Text>
        </View>
        <Text style={styles.doneTitle}>{t('paywall.failedTitle')}</Text>
        {/* The classified reason. "No connection to the store" and "the store
            turned the payment down" ask for different things from the player,
            and every one of these lines also says whether they were charged. */}
        <Text style={styles.doneBody}>{render(phase.reason, t)}</Text>
        <Pressable
          onPress={() => {
            setProblem(null);
            setPhase({ kind: 'ready' });
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, styles.doneCta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{t('common.retry')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={theme.hit.slop}
        >
          <Text style={styles.notNow}>{t('paywall.notNow')}</Text>
        </Pressable>
      </View>
    );
  }

  const twoWays = options.single !== null && options.bundle !== null;

  /*
   * "$1.00 for each of the 12" -- the unit price, in words, in the player's
   * language. Null when the store gave a price Intl cannot format, in which
   * case the card renders its spacer and says nothing rather than guessing.
   */
  const bundleUnit = (() => {
    if (!options.bundle) return null;
    const each = perCasePrice(options.bundle.product.price, options.bundle.product.currencyCode);
    return each === null ? null : t('paywall.option.perCase', { price: each, count: PAID_CASE_COUNT });
  })();
  const selected =
    choice === 'single' ? (options.single ?? options.bundle) : (options.bundle ?? options.single);
  const buyingSingle = selected !== null && selected === options.single;
  const waiting = busy || phase.kind === 'settling';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* No <Stack.Screen options={{...}} /> here — an inline literal re-renders
          the navigator forever. Options live in app/_layout.tsx. */}
      <Text style={styles.title}>{t('paywall.title')}</Text>
      <Text style={styles.body}>{t('paywall.body')}</Text>

      {/* The bullets describe the pack. With both options on screen the cards
          say what each one buys, and a "twelve more cases" line above a
          single-case button is simply untrue of the thing being bought. */}
      {twoWays ? null : (
        <View style={styles.list}>
          {(
            ['paywall.bullet.case', 'paywall.bullet.suspects', 'paywall.bullet.permanent'] as const
          ).map((key) => (
            <View key={key} style={styles.bulletRow}>
              <View style={styles.bulletMark} />
              <Text style={styles.bullet}>{t(key)}</Text>
            </View>
          ))}
        </View>
      )}

      {phase.kind === 'loading' ? (
        <ActivityIndicator color={theme.color.accent} style={styles.spinner} />
      ) : null}

      {phase.kind === 'unavailable' ? (
        <View style={styles.problem}>
          <Text style={styles.problemText}>{render(phase.reason, t)}</Text>
          {/* No retry when the store is off by construction — retrying a build
              configuration cannot succeed, and a button that never works is
              worse than no button. */}
          {unavailableReason ? null : (
            <Pressable onPress={load} style={styles.retry} accessibilityRole="button">
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {problem ? (
        <View style={styles.problem}>
          <Text style={styles.problemText}>{render(problem, t)}</Text>
        </View>
      ) : null}

      {twoWays ? <Text style={styles.chooseLabel}>{t('paywall.choose')}</Text> : null}

      {phase.kind === 'ready' || phase.kind === 'settling' ? (
        <View style={styles.cards}>
          {options.single ? (
            <OptionCard
              label={t('paywall.option.single')}
              price={options.single.product.priceString}
              note={script ? t('paywall.option.singleNote', { title: script.title }) : ''}
              selected={selected === options.single}
              onPress={() => setChoice('single')}
            />
          ) : null}
          {options.bundle ? (
            <OptionCard
              label={t('paywall.option.bundle', { count: PAID_CASE_COUNT })}
              price={options.bundle.product.priceString}
              /*
               * The UNIT price, under the real one. Not a struck-through
               * reference figure: that notation announces a price reduction,
               * and this pack has never sold at another price, which makes the
               * announcement false. See docs/LEGAL-REVIEW.md, Count 5.
               *
               * Derived from what the store will actually charge, so it cannot
               * drift away from it, and null when the currency or price is
               * unusable rather than guessed at.
               */
              unit={bundleUnit}
              note={t('paywall.option.bundleNote')}
              bestLabel={twoWays ? t('paywall.option.best') : undefined}
              selected={selected === options.bundle}
              onPress={() => setChoice('bundle')}
            />
          ) : null}
        </View>
      ) : null}

      {selected && phase.kind !== 'loading' && phase.kind !== 'unavailable' ? (
        <Pressable
          onPress={() => buy(selected)}
          disabled={waiting}
          accessibilityRole="button"
          accessibilityState={{ disabled: waiting }}
          accessibilityLabel={t(buyingSingle ? 'paywall.unlockCaseLabel' : 'paywall.unlockLabel', {
            price: selected.product.priceString,
          })}
          style={({ pressed }) => [styles.cta, waiting && styles.ctaBusy, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>
            {/* Always the localised store price. Never a hardcoded one. */}
            {phase.kind === 'settling'
              ? t('paywall.settling')
              : busy
                ? t('common.working')
                : t('paywall.unlock', { price: selected.product.priceString })}
          </Text>
        </Pressable>
      ) : null}

      {/*
        California AB 2426: advertising a digital good as bought or owned
        without disclosing that it is a licence, and that the licence can become
        unavailable, is unlawful there from 1 January 2025. It has to sit at the
        point of the transaction, which is here -- not in a settings panel the
        buyer never opens. See docs/LEGAL-REVIEW.md, Count 6.
      */}
      {selected && phase.kind !== 'loading' && phase.kind !== 'unavailable' ? (
        <Text style={styles.licenceNote}>{t('paywall.licenceNote')}</Text>
      ) : null}

      {unavailableReason ? null : (
        <Pressable
          onPress={restore}
          disabled={busy}
          accessibilityRole="button"
          hitSlop={theme.hit.slop}
        >
          <Text style={styles.restore}>{t('common.restorePurchases')}</Text>
        </Pressable>
      )}

      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={theme.hit.slop}>
        <Text style={styles.notNow}>{t('paywall.notNow')}</Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * One of the two things on sale.
 *
 * Selection is drawn with a border and a filled radio mark, not by colour alone
 * — the two cards would otherwise differ by one accent hue, and a player who
 * cannot separate those hues would have no way to tell which one the button is
 * about to charge them for.
 */
function OptionCard(props: {
  label: string;
  price: string;
  unit?: string | null;
  note: string;
  bestLabel?: string | undefined;
  selected: boolean;
  onPress: () => void;
}) {
  const { label, price, unit, note, bestLabel, selected, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[label, price, unit, note].filter(Boolean).join('. ')}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      {bestLabel ? (
        <View style={styles.bestPill}>
          <Text style={styles.bestText}>{bestLabel}</Text>
        </View>
      ) : null}
      <View style={styles.cardHead}>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
        <Text style={styles.cardLabel} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text style={styles.cardPrice}>{price}</Text>
      {/*
        The card without a unit price still reserves its line.

        Measured in the harness: without this the two prices sat twenty points
        apart, and so did the two notes under them. Prices are the whole thing
        being compared here, and a comparison whose numbers are not on one
        baseline makes the reader do the aligning.

        Below the price now, not above it. A figure sitting above the real one
        reads as the price that was crossed out even without the line through
        it, which is the impression this change exists to remove.
      */}
      {unit ? <Text style={styles.unit}>{unit}</Text> : <View style={styles.unitSpacer} />}
      {note ? (
        <Text style={styles.cardNote} numberOfLines={3}>
          {note}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  content: { padding: theme.space.lg, gap: theme.space.md, flexGrow: 1, justifyContent: 'center' },
  title: { ...theme.type.title, color: theme.color.text },
  body: { ...theme.type.body, color: theme.color.textDim },
  list: { gap: theme.space.xs, marginVertical: theme.space.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  /** Drawn, not a "·" character standing in for an icon. */
  bulletMark: { width: 3, height: 16, borderRadius: 1.5, backgroundColor: theme.color.accent },
  bullet: { ...theme.type.body, color: theme.color.text, flexShrink: 1 },
  spinner: { marginVertical: theme.space.lg },
  problem: {
    backgroundColor: theme.color.surface,
    borderLeftWidth: 2,
    borderLeftColor: theme.color.danger,
    borderRadius: theme.radius.chip,
    padding: theme.space.md,
    gap: theme.space.sm,
  },
  problemText: { ...theme.type.body, color: theme.color.dangerText },
  retry: { minHeight: theme.hit.min, justifyContent: 'center' },
  retryText: { ...theme.type.body, color: theme.color.text, textDecorationLine: 'underline' },

  chooseLabel: {
    ...theme.type.meta,
    color: theme.color.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cards: { flexDirection: 'row', gap: theme.space.md, alignItems: 'stretch' },
  /**
   * `overflow: hidden` is what lets the pill sit flush in the corner: it is
   * positioned on the card's edge and clipped to the card's own radius, rather
   * than needing a radius that happens to match.
   */
  card: {
    flex: 1,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.rule,
    borderRadius: theme.radius.chip + 4,
    overflow: 'hidden',
    padding: theme.space.md,
    // Room for the pill along the top edge.
    paddingTop: theme.space.lg + theme.space.xs,
    gap: theme.space.xs,
  },
  /**
   * The extra border width is taken out of the padding, so selecting a card
   * cannot move the text inside it by a pixel. Two cards side by side make that
   * shift very visible.
   */
  cardSelected: {
    borderColor: theme.color.accent,
    borderWidth: 2,
    padding: theme.space.md - 1,
    paddingTop: theme.space.lg + theme.space.xs - 1,
  },
  bestPill: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.color.accent,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: theme.radius.chip,
    // Matches the card's own corner, so the pill fills it instead of leaving a
    // square edge inside a rounded one.
    borderTopRightRadius: theme.radius.chip + 4,
  },
  /**
   * 700, not 600. A named Android family resolves through `Typeface.create`,
   * which understands only normal and bold, so every numeric weight below 700
   * renders as regular — the bug that made the evidence marking invisible.
   */
  bestText: { ...theme.type.meta, color: theme.color.bg, fontWeight: '700' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.color.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: theme.color.accent },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.accent },
  cardLabel: { ...theme.type.body, color: theme.color.text, fontWeight: '700', flexShrink: 1 },
  cardPrice: { ...theme.type.title, color: theme.color.text },
  cardNote: { ...theme.type.meta, color: theme.color.textDim },
  /**
   * `lineThrough` rather than a drawn rule: a View laid over the text would need
   * the text's measured width, and would sit wrong the moment a currency symbol
   * changed the string's length.
   */
  unit: {
    ...theme.type.meta,
    color: theme.color.textDim,
  },
  unitSpacer: { height: theme.type.meta.lineHeight },

  licenceNote: { ...theme.type.meta, color: theme.color.textDim, textAlign: 'center' },

  cta: {
    minHeight: theme.hit.min + 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.chip,
    marginTop: theme.space.sm,
  },
  ctaBusy: { opacity: 0.5 },
  ctaText: { ...theme.type.body, color: theme.color.bg, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  restore: {
    ...theme.type.meta,
    color: theme.color.textDim,
    textAlign: 'center',
    paddingVertical: theme.space.md,
  },
  notNow: { ...theme.type.meta, color: theme.color.textDim, textAlign: 'center' },

  done: {
    flex: 1,
    backgroundColor: theme.color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.xl,
    gap: theme.space.md,
  },
  doneMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: theme.color.solved,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.sm,
  },
  doneTick: { fontSize: 30, lineHeight: 36, color: theme.color.solved, fontWeight: '700' },
  /* `danger` is the non-text token and is used as the ring here; the glyph
     inside takes `dangerText`, which is the one that passes contrast. */
  failedMark: { borderColor: theme.color.danger },
  failedTick: { color: theme.color.dangerText },
  doneTitle: { ...theme.type.title, color: theme.color.text, textAlign: 'center' },
  doneBody: { ...theme.type.body, color: theme.color.textDim, textAlign: 'center' },
  doneCta: { alignSelf: 'stretch', marginTop: theme.space.lg, paddingHorizontal: theme.space.lg },
});
