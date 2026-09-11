import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/ui/theme';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
import type { LocaleTag } from '@/i18n/locales';
import { useTranslator } from '@/i18n/useTranslator';
import { useSettingsStore } from '@/settings/settingsStore';
import { feedback } from '@/settings/feedback';
import { Section, ToggleRow } from '@/settings/SettingsList';

/**
 * The first screen anybody sees. Language, sound, haptics, motion — once.
 *
 * ## Why this exists at all
 *
 * The app shipped in five languages and asked about none of them. A Spanish
 * player got an English front door and had to find Settings to fix it, which is
 * the one screen a new player has no reason to open. The language picker was
 * there the whole time; it was just behind the game instead of in front of it.
 *
 * ## Why language is first, and applies instantly
 *
 * Tapping a language re-renders this screen in it immediately, before anything
 * is confirmed. That is the only honest preview — a picker that waits until you
 * press Done asks you to choose a language you have not seen the app speak.
 * `useTranslator` is memoised on the locale tag, so the whole screen changes on
 * the tap with no extra wiring.
 *
 * Endonyms only, never "Spanish". The one person guaranteed to need this row is
 * the person who cannot read the language it would otherwise be written in.
 *
 * ## Why the rest is here too
 *
 * Sound, vibration and reduce-motion are the three settings whose wrong value is
 * felt immediately and fixed late: somebody on a commute wants the sound off
 * before the first message tone, not after it. Reduce Motion in particular is an
 * accessibility setting, and asking for it after the animated landing sequence
 * has already played is asking too late.
 *
 * Nothing else belongs here. Volume is a slider that needs sound already on to
 * mean anything, and every other preference is either derived or rare. Four
 * questions is a screen; nine is a form.
 *
 * ## Why it cannot be skipped, and why that is fine
 *
 * There is no "skip" affordance because every row already has a working default
 * — the button says "Start playing", not "Save". A player who taps straight
 * through has lost nothing and has still seen that these controls exist, which
 * is most of the point.
 */
export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTranslator();

  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  /**
   * Memoised, NOT inline — an inline literal is a fresh object every render and
   * loops `setOptions` until React throws "Maximum update depth exceeded". The
   * same note is on every other screen in this app, for the same reason.
   *
   * `headerShown: false` because this screen is its own title, and a navigation
   * bar would offer a back gesture to a screen the player has not been to yet.
   */
  const screenOptions = useMemo(() => ({ headerShown: false }), []);

  const chooseLanguage = useCallback(
    (localeTag: LocaleTag) => {
      if (localeTag === settings.localeTag) return;
      update({ localeTag });
      feedback.selection();
    },
    [settings.localeTag, update],
  );

  /**
   * Mark the setup done and get out of the way.
   *
   * `back()` rather than `replace('/landing')`, and the difference matters:
   * `app/index.tsx` owns the decision about what comes next, and it pushes the
   * landing screen the moment it sees this flag set. Navigating straight to the
   * landing from here would race that effect and push it twice.
   */
  const done = useCallback(() => {
    update({ hasChosenSetup: true });
    feedback.notify('success');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [update, router]);

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + theme.space.xl, paddingBottom: insets.bottom + theme.space.lg },
        ]}
      >
        <View style={styles.head}>
          <Text style={styles.title}>{t('setup.title')}</Text>
          <Text style={styles.body}>{t('setup.body')}</Text>
        </View>

        <Section title={t('setup.languageSection')} footnote={t('setup.languageNote')}>
          {SUPPORTED_LOCALES.map((locale) => {
            const selected = locale.tag === settings.localeTag;
            return (
              <Pressable
                key={locale.tag}
                onPress={() => chooseLanguage(locale.tag as LocaleTag)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                // The English name is here and nowhere visible: a screen reader
                // set to English still has to be able to say which row this is.
                accessibilityLabel={`${locale.endonym}. ${locale.english}`}
                style={({ pressed }) => [styles.langRow, pressed && styles.pressed]}
              >
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={[styles.langText, selected && styles.langTextOn]}>
                  {locale.endonym}
                </Text>
              </Pressable>
            );
          })}
        </Section>

        <Section title={t('setup.feelSection')}>
          {/* Existing keys, not new ones. These three rows say exactly what the
              Settings screen says, because they are the same three settings and
              two wordings for one control is how a translation drifts apart. */}
          <ToggleRow
            label={t('settings.sound.label')}
            detail={t('settings.sound.detail')}
            value={settings.soundEnabled}
            onValueChange={(soundEnabled) => {
              update({ soundEnabled });
              feedback.selection();
            }}
          />
          <ToggleRow
            label={t('settings.haptics.label')}
            detail={t('settings.haptics.detail')}
            value={settings.hapticsEnabled}
            onValueChange={(hapticsEnabled) => {
              // Fire before writing: turning it off should still confirm the
              // tap that turned it off.
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

        <Pressable
          onPress={done}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{t('setup.done')}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  content: { paddingHorizontal: theme.space.lg, gap: theme.space.xl },

  head: { gap: theme.space.xs },
  title: { ...theme.type.title, color: theme.color.text, fontSize: 28, lineHeight: 34 },
  body: { ...theme.type.body, color: theme.color.textDim },

  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    // The 44pt floor. A language list is the one place a mis-tap is most
    // annoying, because the label you land on is one you cannot read.
    minHeight: theme.hit.min,
    paddingVertical: theme.space.xs,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.color.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: theme.color.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.color.accent },
  langText: { ...theme.type.body, color: theme.color.text },
  langTextOn: { fontWeight: '600' },

  cta: {
    minHeight: theme.hit.min + 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.chip,
    backgroundColor: theme.color.accent,
  },
  ctaText: { ...theme.type.body, color: theme.color.bg, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
