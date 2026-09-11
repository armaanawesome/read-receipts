import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { theme } from '@/ui/theme';
import { useTranslator } from '@/i18n/useTranslator';
import { feedback } from '@/settings/feedback';
import { signInWithProvider, type OAuthProvider } from '@/auth';
import type { Message } from '@/i18n/message';

/**
 * Continue with Google / Continue with Apple.
 *
 * Shared by the landing screen and the sign-in screen, which is the whole
 * reason it is a component: the same two buttons in two places, drifting apart,
 * is how one of them ends up with the newer error handling.
 *
 * ## Why these do not look like Google's and Apple's own buttons
 *
 * Both companies publish button artwork and require it: Google wants their "G"
 * on a white or blue field, Apple wants their mark and one of their approved
 * wordings. This project ships no SVG library and no brand assets, and an
 * approximation drawn by hand is worse than not imitating them at all -- it is
 * a trademark problem AND it looks wrong beside the real thing.
 *
 * So these are the app's own buttons, in the app's own type and colours, saying
 * plainly what they do. That is defensible today and honest about what has not
 * been done yet. Before a store submission, drop in the official assets -- the
 * note is in docs/STORE-COMPLIANCE.md so it is not rediscovered late.
 *
 * ## The order is not arbitrary
 *
 * Apple sits above Google because Apple's own guidance asks for Sign in with
 * Apple to be presented no less prominently than other options. One array,
 * ordered once, rather than a conditional in the JSX.
 */

interface Props {
  /** Told what happened, so the caller can show it in its own notice area. */
  readonly onResult: (message: Message) => void;
  /** Layout from the caller; this component owns no margins of its own. */
  readonly style?: object;
}

const PROVIDERS: readonly {
  readonly id: OAuthProvider;
  readonly labelKey: 'auth.continueApple' | 'auth.continueGoogle';
}[] = [
  { id: 'apple', labelKey: 'auth.continueApple' },
  { id: 'google', labelKey: 'auth.continueGoogle' },
];

export function AuthProviderButtons({ onResult, style }: Props) {
  const t = useTranslator();
  /** Which one is mid-flight, so only that button shows a spinner. */
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const start = useCallback(
    async (provider: OAuthProvider) => {
      if (busy !== null) return;
      setBusy(provider);
      feedback.selection();

      const result = await signInWithProvider(provider);

      /*
       * `opened` is not success. The browser is up and the answer arrives later
       * as a deep link, handled in app/_layout.tsx -- so the button stops
       * spinning and says nothing, because claiming anything here would be
       * claiming it before the player has even seen the provider's page.
       */
      if (result.kind === 'unconfigured') {
        onResult({ key: 'auth.provider.unconfigured' });
        feedback.notify('warning');
      } else if (result.kind === 'failed') {
        onResult(result.reason);
        feedback.notify('warning');
      }

      setBusy(null);
    },
    [busy, onResult],
  );

  return (
    <View style={[styles.root, style]}>
      {PROVIDERS.map(({ id, labelKey }) => {
        const spinning = busy === id;
        return (
          <Pressable
            key={id}
            onPress={() => void start(id)}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy !== null, busy: spinning }}
            accessibilityLabel={t(labelKey)}
            style={({ pressed }) => [
              styles.button,
              busy !== null && !spinning && styles.dimmed,
              pressed && styles.pressed,
            ]}
          >
            {spinning ? (
              <ActivityIndicator color={theme.color.text} />
            ) : (
              <Text style={styles.label}>{t(labelKey)}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** The separator between the provider buttons and the email form. */
export function AuthProviderDivider() {
  const t = useTranslator();
  return (
    <View style={styles.divider}>
      <View style={styles.rule} />
      <Text style={styles.dividerText}>{t('auth.orEmail')}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.space.sm },

  button: {
    // theme.hit.min is the 44pt floor; the extra six matches the landing
    // screen's primary button so the three do not stair-step.
    minHeight: theme.hit.min + 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.rule,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
  },
  label: { ...theme.type.body, color: theme.color.text, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  /** The one not being used, while the other is working. */
  dimmed: { opacity: 0.4 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.color.rule },
  dividerText: { ...theme.type.meta, color: theme.color.textDim },
});
