import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { theme } from '@/ui/theme';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
import { useTranslator } from '@/i18n/useTranslator';
import { render } from '@/i18n/message';
import { useSettingsStore } from '@/settings/settingsStore';
import { clearAllProgress, hydrateSettings } from '@/settings/persistence';
import { feedback } from '@/settings/feedback';
import { VolumeSlider } from '@/settings/VolumeSlider';
import {
  ActionRow,
  CustomRow,
  DisclosureRow,
  ExpandableRow,
  Section,
  ToggleRow,
  ValueRow,
} from '@/settings/SettingsList';
import { LICENCES, PRIVACY_POINTS, versionLine } from '@/settings/about';
import { restoreErrorMessage, restoreIsBusy, restoreStatusLine, type RestoreState } from '@/settings/restore';
import { restorePurchases } from '@/entitlements/revenuecat';
import { useEntitlements } from '@/entitlements/useEntitlements';
import { useCaseStore } from '@/state/caseStore';
import { deleteAccount, useAuth } from '@/auth';

/**
 * Preferences, purchases, and the things a player needs when something has gone
 * wrong: restore a purchase they already made, and erase progress they want back.
 *
 * The screen is deliberately thin. Every decision it makes — what a volume step
 * means, what the restore row should say, how a version with no build number
 * formats — is a tested function in src/settings, because none of that is
 * testable once it is inside a component this project has no renderer for.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTranslator();

  /**
   * Memoised, NOT inline — see the comment in app/_layout.tsx. An inline literal
   * is a fresh object every render and loops setOptions until React throws
   * "Maximum update depth exceeded". It can no longer live at module scope now
   * that the title is translated, so the stability has to come from here:
   * `useTranslator` memoises `t` on the locale tag, which makes this object
   * change identity exactly when the language does and never otherwise.
   */
  const screenOptions = useMemo(() => ({ title: t('settings.title') }), [t]);

  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  const { unavailableReason, refresh } = useEntitlements();
  const [restore, setRestore] = useState<RestoreState>({ kind: 'idle' });
  const [erased, setErased] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<'privacy' | 'licences' | 'support' | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const { status } = useAuth();

  // Safe to call from more than one screen; the second caller awaits the first read.
  useEffect(() => {
    void hydrateSettings();
  }, []);

  const language =
    SUPPORTED_LOCALES.find((l) => l.tag === settings.localeTag)?.endonym ?? settings.localeTag;

  const onRestore = useCallback(async () => {
    // A build with purchases switched off must say why rather than spin and fail.
    if (unavailableReason !== null) {
      setRestore({ kind: 'unavailable', reason: unavailableReason });
      return;
    }
    setRestore({ kind: 'working' });
    try {
      const entitlementIds = await restorePurchases();
      setRestore({ kind: 'restored', entitlementIds });
      // The CustomerInfo listener is what actually unlocks gated UI, but the
      // player may have arrived here from a locked case; refresh so going back
      // shows it open.
      await refresh();
      feedback.notify('success');
    } catch (e) {
      setRestore({ kind: 'failed', message: restoreErrorMessage(e) });
      feedback.notify('warning');
    }
  }, [unavailableReason, refresh]);

  const onReset = useCallback(() => {
    /**
     * Alert, not an inline confirm. This is the one irreversible thing on the
     * screen, and it is the same protected-focus pattern the accusation already
     * uses — a native alert cannot be dismissed by the mis-tap that follows the
     * first one.
     */
    Alert.alert(
      t('settings.reset.confirm'),
      t('settings.reset.confirmBody'),
      [
        { text: t('settings.reset.keep'), style: 'cancel' },
        {
          text: t('settings.reset.erase'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const count = await clearAllProgress();
                // The in-memory case has to go too, or the screen the player
                // returns to still shows the progress they just erased.
                useCaseStore.getState().reset();
                setErased(
                  count === 0
                    ? t('settings.reset.erasedNone')
                    : count === 1
                      ? t('settings.reset.erasedOne')
                      : t('settings.reset.erasedMany', { count }),
                );
                feedback.notify('success');
              } catch {
                setErased(t('settings.reset.failed'));
                feedback.notify('warning');
              }
            })();
          },
        },
      ],
    );
  }, [t]);

  /**
   * Delete the account, not the device.
   *
   * Required by Apple 5.1.1(v) and Google Play's data deletion policy for any
   * app that lets a player create an account, and by GDPR Art. 17 underneath
   * both. See docs/LEGAL-REVIEW.md, Count 4.
   *
   * Two confirmations rather than one. Erasing progress is recoverable by
   * replaying; this is not, and it takes the email address with it. The second
   * alert restates what actually goes, because the first one is the one people
   * tap through.
   */
  const onDeleteAccount = useCallback(() => {
    Alert.alert(
      t('settings.account.deleteConfirm'),
      t('settings.account.deleteBody'),
      [
        { text: t('settings.account.deleteKeep'), style: 'cancel' },
        {
          text: t('settings.account.deleteGo'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await deleteAccount();
              if (result.kind === 'deleted') {
                setAccountNotice(t('settings.account.deleted'));
                feedback.notify('success');
                return;
              }
              // `skipped` means there was no account to delete, which from this
              // row is indistinguishable from a failure to the player.
              setAccountNotice(render(result.reason, t));
              feedback.notify('warning');
            })();
          },
        },
      ],
    );
  }, [t]);

  const restoreStatus = restoreStatusLine(restore);
  // Rendered here, not built as a sentence in src/settings — same reason as the
  // sign-in notice: the words have to come from the catalogue the player is on.
  const restoreLine = restoreStatus === null ? undefined : render(restoreStatus, t);
  const build =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode;

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.space.xl }]}
      >
        {/* The one identity moment on the screen: the same tick row the briefing
            sheet opens with, so this reads as part of the same file. */}
        <View style={styles.ticks} pointerEvents="none">
          {Array.from({ length: 24 }).map((_, i) => (
            <View key={i} style={[styles.tick, i % 4 === 0 && styles.tickMajor]} />
          ))}
        </View>

        {/* First, because it is the only row here that teaches rather than
            configures - and the player most likely to open Settings looking for
            help is the one who skipped it. */}
        {/* Sign-in had no entrance anywhere in the app until now. */}
        <Section
          title={t('settings.account.section')}
          footnote={accountNotice ?? undefined}
        >
          <ActionRow label={t('signIn.title')} onPress={() => router.push('/sign-in')} />
          {/*
            Only when there is an account to delete. Offering it to a signed-out
            player is a button that can only fail, and offering it when accounts
            are unavailable advertises a system this build does not have.
          */}
          {status.kind === 'signedIn' ? (
            <ActionRow
              label={t('settings.account.delete')}
              detail={t('settings.account.deleteDetail')}
              destructive
              onPress={onDeleteAccount}
            />
          ) : null}
        </Section>

        {/*
          This used to open a five-page slideshow. There is no slideshow any
          more — the walkthrough runs inside the Bakehouse, on the real inbox and
          the real board — so the row turns those prompts back on rather than
          navigating anywhere. Confirmed with an alert because the effect is not
          on this screen, and an invisible change reads as a dead button.
        */}
        <Section title={t('settings.help.section')}>
          <ActionRow
            label={t('tutorial.replayRow')}
            onPress={() => {
              update({ tutorialDismissed: false });
              feedback.selection();
              Alert.alert(t('tutorial.replayTitle'), t('tutorial.replayBody'));
            }}
          />
        </Section>

        <Section title={t('settings.sound.section')}>
          <ToggleRow
            label={t('settings.sound.label')}
            detail={t('settings.sound.detail')}
            value={settings.soundEnabled}
            onValueChange={(soundEnabled) => {
              update({ soundEnabled });
              feedback.selection();
            }}
          />
          <CustomRow label={t('settings.volume.label')}>
            <VolumeSlider
              volume={settings.soundVolume}
              disabled={!settings.soundEnabled}
              onChange={(soundVolume) => {
                update({ soundVolume });
                feedback.selection();
                // Preview at the level just chosen, so the control is judged by
                // ear rather than by counting bars.
                feedback.cue('pin');
              }}
            />
          </CustomRow>
        </Section>

        <Section title={t('settings.feel.section')}>
          <ToggleRow
            label={t('settings.haptics.label')}
            detail={t('settings.haptics.detail')}
            value={settings.hapticsEnabled}
            onValueChange={(hapticsEnabled) => {
              // Fire before writing: turning it off should still confirm the tap
              // that turned it off.
              feedback.selection();
              update({ hapticsEnabled });
            }}
          />
          <ToggleRow
            label={t('settings.motion.label')}
            detail={t('settings.motion.detail')}
            value={settings.reduceMotion}
            onValueChange={(reduceMotion) => {
              update({ reduceMotion });
              feedback.selection();
            }}
          />
        </Section>

        <Section
          title={t('settings.language.section')}
          footnote={t('settings.language.footnote')}
        >
          <DisclosureRow
            label={t('settings.language.label')}
            // The value is an endonym and stays in its own language, always.
            value={language}
            accessibilityHint={t('settings.language.hint')}
            onPress={() => router.push('/language')}
          />
        </Section>

        <Section title={t('settings.purchases.section')} footnote={restoreLine}>
          <ActionRow
            label={t('common.restorePurchases')}
            detail={t('settings.restore.detail')}
            busy={restoreIsBusy(restore)}
            onPress={() => void onRestore()}
          />
        </Section>

        <Section title={t('settings.progress.section')} footnote={erased ?? undefined}>
          <ActionRow
            label={t('settings.reset.label')}
            detail={t('settings.reset.detail')}
            destructive
            onPress={onReset}
          />
        </Section>

        <Section title={t('settings.about.section')}>
          <ExpandableRow
            label={t('settings.about.privacy')}
            expanded={openPanel === 'privacy'}
            onPress={() => setOpenPanel((p) => (p === 'privacy' ? null : 'privacy'))}
          >
            {PRIVACY_POINTS.map((point) => (
              <Text key={point} style={styles.prose}>
                {t(point)}
              </Text>
            ))}
          </ExpandableRow>

          <ExpandableRow
            label={t('settings.about.licences')}
            expanded={openPanel === 'licences'}
            onPress={() => setOpenPanel((p) => (p === 'licences' ? null : 'licences'))}
          >
            {LICENCES.map((l) => (
              <View key={l.name} style={styles.licence}>
                <Text style={styles.licenceName}>{l.name}</Text>
                <Text style={styles.licenceKind}>{l.licence}</Text>
              </View>
            ))}
          </ExpandableRow>

          {/*
            Several cases are built on grief and one on suicide. Nothing here is
            a crisis service and it does not pretend to be -- it points at a
            directory that covers every country, because a single national
            number is wrong for most of the people reading it.
          */}
          <ExpandableRow
            label={t('settings.about.support')}
            expanded={openPanel === 'support'}
            onPress={() => setOpenPanel((p) => (p === 'support' ? null : 'support'))}
          >
            <Text style={styles.prose}>{t('settings.support.body')}</Text>
          </ExpandableRow>

          <ValueRow
            label={t('settings.about.version')}
            value={versionLine(Constants.expoConfig?.version, build)}
          />
        </Section>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  content: { padding: theme.space.lg, gap: theme.space.xl },

  ticks: { flexDirection: 'row', justifyContent: 'space-between', height: 6 },
  tick: { width: StyleSheet.hairlineWidth, height: 3, backgroundColor: theme.color.rule },
  tickMajor: { height: 6, backgroundColor: theme.color.textDim },

  prose: { ...theme.type.meta, color: theme.color.textDim, lineHeight: 18 },

  licence: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space.sm },
  licenceName: { ...theme.type.meta, color: theme.color.textDim, flex: 1 },
  licenceKind: { ...theme.type.claim, fontSize: 11, color: theme.color.textDim },
});
