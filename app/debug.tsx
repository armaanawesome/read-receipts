import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Redirect } from 'expo-router';

import { theme } from '@/ui/theme';
import { audioLog, audioSessionReady, clearAudioLog, playBed, stopBed, MENU_BED } from '@/audio';
import { CUES, CUE_IDS } from '@/audio/cues';
import { resolveBedVolume, resolveVolume } from '@/audio/volume';
import { feedback } from '@/settings/feedback';
import { useSettingsStore } from '@/settings/settingsStore';
import { useEntitlements } from '@/entitlements/useEntitlements';
import {
  getCasePackOffering,
  purchaseCasePack,
  restorePurchases,
  diagnoseEntitlements,
} from '@/entitlements/revenuecat';

/** Verification harness for the RevenueCat Test Store. Not part of the game. */
export default function DebugPurchaseScreen() {
  /*
   * Dev builds only, checked HERE rather than only on the link that reaches it.
   *
   * `app/index.tsx` wraps its "Test Store harness" link in `__DEV__`, which
   * hides the entrance and nothing else. The route itself is a file under
   * `app/`, so expo-router still published it, and `app/_layout.tsx` still
   * registered its screen - leaving `privatetexts://debug` open in a release
   * build, where it exposes a live purchase and restore harness plus internal
   * entitlement diagnostics to anyone who types the URL.
   *
   * Before the hooks on purpose. `__DEV__` is a build-time constant, so this
   * branch is fixed for the life of the bundle and cannot change the hook order
   * between renders - and in a release build Metro drops the rest as dead code.
   */
  if (!__DEV__) return <Redirect href="/" />;

  const { entitlementIds, loading, error, refresh } = useEntitlements();
  const [log, setLog] = useState<string[]>([]);
  /*
   * The audio half of this screen.
   *
   * Same reason the RevenueCat half exists: a subsystem that reports success and
   * produces nothing needs somewhere to state what it actually did. Four rounds
   * of audio fixes shipped without one — see HANDOFF §7j and the note at the top
   * of src/audio/diagnostics.ts.
   */
  const settings = useSettingsStore((s) => s.settings);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  /** Bumped to re-read the log, which is module state rather than store state. */
  const [audioTick, setAudioTick] = useState(0);
  // StoreKit and Play Billing queue duplicate calls; the UI must not let the
  // user fire a second purchase while one is in flight.
  const [buying, setBuying] = useState(false);

  const say = (line: string) => setLog((l) => [...l, line]);

  async function handlePurchase() {
    if (buying) return;
    setBuying(true);
    try {
      say('Fetching current offering...');
      const offering = await getCasePackOffering();
      if (!offering) {
        say('No current offering. Check the "default" offering in the dashboard.');
        return;
      }
      const pkg = offering.availablePackages[0];
      if (!pkg) {
        say(`Offering "${offering.identifier}" has no packages.`);
        return;
      }
      say(`Purchasing ${pkg.product.identifier} (${pkg.product.priceString})...`);
      const outcome = await purchaseCasePack(pkg);
      switch (outcome.kind) {
        case 'purchased': {
          say('Purchased. Checking what it actually granted...');
          // The whole point of this screen. A purchase reporting success proves
          // nothing about whether the gate opens, and the two reasons it might
          // not need opposite fixes.
          const d = await diagnoseEntitlements();
          say(`  expects:   ${d.expected}`);
          say(`  active:    ${d.activeIds.length ? d.activeIds.join(', ') : '(none)'}`);
          say(`  all:       ${d.allIds.length ? d.allIds.join(', ') : '(none)'}`);
          say(`  products:  ${d.purchasedProductIds.length ? d.purchasedProductIds.join(', ') : '(none)'}`);
          say(d.ok ? 'OK. ' + d.fix : 'NOT UNLOCKED. ' + d.fix);
          break;
        }
        case 'cancelled':
          say('Cancelled by user (this is not an error).');
          break;
        case 'failed':
          say(`Failed: ${String((outcome.error as { message?: string })?.message ?? outcome.error)}`);
          break;
      }
    } catch (e) {
      say(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBuying(false);
    }
  }

  async function handleRestore() {
    try {
      const ids = await restorePurchases();
      say(`Restored: ${ids.length ? ids.join(', ') : 'nothing'}`);
      await refresh();
    } catch (e) {
      say(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.meta}>Platform: {Platform.OS}</Text>
      <Text style={styles.meta}>
        Entitlements:{' '}
        {loading ? 'loading...' : entitlementIds.length ? entitlementIds.join(', ') : 'none'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, buying && styles.buttonBusy]}
        onPress={handlePurchase}
        disabled={buying}
        accessibilityState={{ disabled: buying }}
      >
        <Text style={styles.buttonText}>{buying ? 'Working...' : 'Buy case pack'}</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.buttonGhost]} onPress={handleRestore}>
        <Text style={styles.buttonText}>Restore purchases</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.buttonGhost]}
        onPress={async () => {
          const d = await diagnoseEntitlements();
          say(`expects:  ${d.expected}`);
          say(`active:   ${d.activeIds.length ? d.activeIds.join(', ') : '(none)'}`);
          say(`all:      ${d.allIds.length ? d.allIds.join(', ') : '(none)'}`);
          say(`products: ${d.purchasedProductIds.length ? d.purchasedProductIds.join(', ') : '(none)'}`);
          say(d.ok ? 'OK. ' + d.fix : 'NOT UNLOCKED. ' + d.fix);
        }}
      >
        <Text style={styles.buttonText}>Why is it still locked?</Text>
      </Pressable>

      {/* ------------------------------------------------------------ audio */}
      <Text style={styles.heading}>Audio</Text>

      {/* The three settings that can each independently zero a sound, shown as
          stored rather than as defaults — a stale `soundVolume` on disk is
          invisible from every other screen in the app. */}
      <Text style={styles.meta}>
        settings {settingsHydrated ? 'read from disk' : 'STILL DEFAULTS (not hydrated)'}
      </Text>
      <Text style={styles.meta}>
        soundEnabled {String(settings.soundEnabled)} · soundVolume {settings.soundVolume} ·
        reduceMotion {String(settings.reduceMotion)}
      </Text>
      <Text style={styles.meta}>session configured: {String(audioSessionReady())}</Text>
      <Text style={styles.meta}>
        bed gain {resolveBedVolume(settings).toFixed(3)} ·{' '}
        {CUE_IDS.map((id) => `${id} ${resolveVolume(settings, CUES[id]).toFixed(3)}`).join(' · ')}
      </Text>

      {CUE_IDS.map((id) => (
        <Pressable
          key={id}
          style={[styles.button, styles.buttonGhost]}
          onPress={() => {
            feedback.cue(id);
            setAudioTick((n) => n + 1);
          }}
        >
          <Text style={styles.buttonText}>Play cue: {id}</Text>
        </Pressable>
      ))}
      <Pressable
        style={[styles.button, styles.buttonGhost]}
        onPress={() => {
          // Stop first: playBed is idempotent on the track, so replaying the bed
          // already playing would otherwise report nothing at all.
          stopBed();
          playBed(MENU_BED, settings);
          setAudioTick((n) => n + 1);
        }}
      >
        <Text style={styles.buttonText}>Play bed: menu</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.buttonGhost]}
        onPress={() => {
          clearAudioLog();
          setAudioTick((n) => n + 1);
        }}
      >
        <Text style={styles.buttonText}>Clear audio log</Text>
      </Pressable>

      <View style={styles.log} key={audioTick}>
        {audioLog().length === 0 ? (
          <Text style={styles.logLine}>
            (nothing yet — the audio layer has not been asked for a sound)
          </Text>
        ) : (
          audioLog().map((e, i) => (
            <Text
              key={i}
              style={[styles.logLine, e.kind === 'failed' ? styles.error : null]}
            >
              {e.kind} {e.subject} — {e.detail}
            </Text>
          ))
        )}
      </View>

      <View style={styles.log}>
        {log.map((line, i) => (
          <Text key={i} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: theme.space.lg,
    gap: theme.space.md,
    backgroundColor: theme.color.bg,
    flexGrow: 1,
  },
  meta: { ...theme.type.meta, color: theme.color.textDim },
  heading: { ...theme.type.body, color: theme.color.text, marginTop: theme.space.lg },
  error: { ...theme.type.meta, color: theme.color.dangerText },
  button: {
    backgroundColor: theme.color.bubbleYou,
    padding: theme.space.md,
    borderRadius: theme.radius.chip,
    alignItems: 'center',
  },
  buttonGhost: { backgroundColor: theme.color.surface },
  buttonBusy: { opacity: 0.5 },
  buttonText: { ...theme.type.body, color: theme.color.text },
  log: { marginTop: theme.space.lg, gap: theme.space.xs },
  logLine: { ...theme.type.meta, color: theme.color.textDim, fontFamily: theme.font.mono },
});
