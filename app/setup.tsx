import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/ui/theme';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
import type { LocaleTag } from '@/i18n/locales';
import { useTranslator } from '@/i18n/useTranslator';
import { useSettingsStore } from '@/settings/settingsStore';
import { feedback } from '@/settings/feedback';
import { Section, ToggleRow } from '@/settings/SettingsList';
import { useBed, MENU_BED } from '@/audio';
import { DEMO_CASE_ID } from '@content/cases';

/**
 * Language, sound, haptics, motion — once, at the end of the front door.
 *
 * ## Where this sits, and why it moved
 *
 * It used to run FIRST, before the landing. The reasoning was sound on paper:
 * the landing is the translated pitch, so asking about language after it means
 * pitching in English to somebody who cannot read English.
 *
 * It was wrong in the room. Opening a game on a preferences form buries the one
 * screen that explains what the game IS underneath a settings list, and the
 * first thing anybody sees — a player, a judge, a recording — should be the
 * three bubbles, not four toggles. So the order is now:
 *
 *     landing -> sign in (or guest) -> setup -> the case
 *
 * The cost is real and is accepted: a Spanish speaker reads the landing in
 * English, because DEFAULT_LOCALE is 'en' and nothing reads the device locale.
 * Seeding that default from the phone's own language would remove the cost
 * entirely and is the obvious next move if it ever matters.
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

  /*
   * Asks the player to decide about sound while they can hear what they are
   * deciding about — the toggle below turns this bed off under their finger,
   * which is a far better answer to "do you want sound" than a switch with no
   * consequence until two screens later.
   *
   * (This used to be the first screen in the app and therefore the first sound
   * it could make. It is now the last step of onboarding, so the landing has
   * already played; the point about the toggle is what still matters.)
   */
  useBed(MENU_BED);

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
   * Where to go when this screen is finished.
   *
   * Passed in rather than worked out here, because the two callers know the
   * answer and this screen does not. The landing's guest button sends
   * `next=demo`; the sign-in screen sends `demo` or `home` depending on whether
   * the tutorial is already solved, which it can only tell AFTER its sync has
   * landed.
   *
   * Absent means somebody reached this screen outside the onboarding chain --
   * the gate in `app/index.tsx` catching an install that predates this flag --
   * and the right answer there is to go back where they came from.
   */
  const { next } = useLocalSearchParams<{ next?: string }>();

  /** Mark the setup done and hand off to whatever comes next. */
  const done = useCallback(() => {
    update({ hasChosenSetup: true });
    feedback.notify('success');
    feedback.cue('tap');

    // The case is never already on the stack, so replacing into it is safe.
    if (next === 'demo') {
      router.replace(`/case/${DEMO_CASE_ID}/threads`);
      return;
    }

    /*
     * Everything else wants the home screen that is ALREADY MOUNTED underneath
     * this one -- not a second copy of it.
     *
     * `router.replace('/')` does not reuse it. React Navigation's REPLACE swaps
     * the route at the CURRENT index and does not look down the stack for a
     * route of the same name, so replacing into '/' from here leaves the
     * original index mounted at position 0 and stacks a fresh one on top. Two
     * live copies of the home screen: two `useBed(MENU_BED)` loops, two
     * `useEntitlements()` RevenueCat listeners that only unregister on an
     * unmount the buried one never gets, and a back press that appears to do
     * nothing because it pops to the other copy of the screen you are looking
     * at.
     *
     * `back()` is always available on the paths that reach here -- every one of
     * them arrived by replacing a screen that was itself pushed over index.
     */
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [update, router, next]);

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
