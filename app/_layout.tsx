import { useEffect, useRef } from 'react';
import { Stack, Link } from 'expo-router';
import { Pressable, AppState, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useTranslator } from '@/i18n/useTranslator';
import { render } from '@/i18n/message';
import { hydrateSettings } from '@/settings/persistence';
import { SettingsGlyph } from '@/settings/SettingsList';
import { syncProgress, useAuth, completeOAuthRedirect } from '@/auth';
import { useRevenueCatIdentity } from '@/entitlements/useRevenueCatIdentity';
import { stopBed } from '@/audio';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '@/ui/theme';

/**
 * Declared at module scope, NOT inline in the JSX.
 *
 * An inline object literal is a fresh reference every render, so `Stack.Screen`
 * calls setOptions, the navigator re-renders, a new literal is created, and it
 * loops until React throws "Maximum update depth exceeded". That is exactly what
 * a `<Stack.Screen options={{ ... }} />` inside the paywall screen did.
 */
const rootScreenOptions = {
  headerStyle: { backgroundColor: theme.color.bg },
  headerTintColor: theme.color.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.color.bg },
} as const;

const paywallOptions = {
  title: '',
  presentation: 'modal',
  headerShown: false,
} as const;

const debugOptions = { title: 'Test Store harness' } as const;

/**
 * Empty title, like the paywall's: the screen carries its own heading, and an
 * untranslated one in the bar would be the only English on screen for four of
 * the five languages. Not a modal — it is the second step of a flow that started
 * on the sign-in screen, so back belongs there.
 */
const resetOptions = { title: '' } as const;

/**
 * Unconfigured, expo-router titles a route after its FILE — so these bars read
 * `sign-in` and `language`, in lowercase, with a hyphen in one of them. Caught
 * in the browser harness on the sign-in screen, which is in the demo video.
 *
 * Empty rather than translated: both screens already carry their own heading,
 * and a second copy of it in the bar is worse than none. An empty parent title
 * also makes the back label fall back to the system word for Back, in the
 * reader's own language. `settings.tsx` sets its own translated title through a
 * memoised options object, which is the other sanctioned way.
 */
const blankTitleOptions = { title: '' } as const;

/**
 * No bar at all on the front door.
 *
 * The screen carries its own wordmark, and a header here would offer a back
 * button to a home screen the player has not been shown yet. `gestureEnabled`
 * off for the same reason: swiping back out of the landing would drop somebody
 * onto the case grid with the choice still unmade, and the home screen would
 * simply push them straight back here.
 */
const landingOptions = { headerShown: false, gestureEnabled: false } as const;

/*
 * Same as the landing: no header and no back gesture.
 *
 * Setup is the first screen on a first launch, so there is nothing behind it to
 * swipe back to -- and a header would draw a back button that either does
 * nothing or drops the player onto a home grid they have not set up yet.
 */
const setupOptions = { headerShown: false, gestureEnabled: false } as const;

/**
 * The only way into Settings, and for a while there was none at all.
 *
 * `app/settings.tsx`, `app/language.tsx` and `app/sign-in.tsx` were all built
 * and all unreachable - nothing in the app linked to any of them, so on a
 * device the game had no settings, no language picker and no account. They were
 * only ever opened by typing a route during development, which is exactly why
 * nobody noticed.
 */
function SettingsLink() {
  const t = useTranslator();
  return (
    <Link href="/settings" asChild>
      {/*
        A mark, not the word.

        "Settings" spelled out in a header bar reads as a prototype — no shipped
        app labels that control — and it was also the widest thing in the bar, so
        it crowded the title beside it. The label survives as
        `accessibilityLabel`, which is where it was always doing the real work: a
        screen reader still announces the word, and it is still translated.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.title')}
        hitSlop={theme.hit.slop}
      >
        <SettingsGlyph />
      </Pressable>
    </Link>
  );
}

/**
 * Empty title, deliberately.
 *
 * Unconfigured, expo-router titles a route after its FILE, so this bar read
 * `index` on the first screen of the game - and a child's back button then read
 * `< index` too, because iOS takes the back label from the parent's title.
 *
 * Empty rather than 'Read Receipts': the screen already carries that as a
 * masthead, and saying it twice in forty points of vertical space is worse than
 * not saying it. The bar still earns its place - it owns the safe area and it
 * holds the settings link - and an empty parent title makes the back label fall
 * back to the system word for Back, in the reader's own language.
 */
const indexOptions = {
  title: '',
  headerRight: () => <SettingsLink />,
} as const;

const rootStyle = { flex: 1, backgroundColor: theme.color.bg } as const;

export default function RootLayout() {
  /*
   * Tell RevenueCat who is signed in, at the root, on every launch.
   *
   * Without this the SDK stays on an anonymous id it generates per install, so a
   * purchase belongs to a HANDSET rather than to an account. Signing into the
   * same account on a second phone produced a fresh anonymous id with no
   * entitlements, and the cases somebody had paid for were simply missing, with
   * nothing in the app able to explain it.
   *
   * It belongs here rather than on the sign-in screen because the case that
   * matters most is the launch where nobody visits that screen at all: the
   * session is restored from secure storage and the player expects to already
   * own what they bought.
   */
  const { status } = useAuth();
  useRevenueCatIdentity(status.kind === 'signedIn' ? status.user.id : null);

  /*
   * Read stored preferences once, at the root, before any screen renders.
   *
   * This used to be called from app/settings.tsx and nowhere else, which meant
   * the store sat on DEFAULT_SETTINGS until the player happened to open
   * Settings. Every preference was therefore ignored at launch - including
   * `localeTag`, so somebody who had chosen German got an English home screen
   * every time and only saw their own language after visiting a screen that
   * had nothing to do with it.
   *
   * It also silently disabled the first-run walkthrough, which waits for
   * `hydrated` before deciding anything: the flag never flipped, so the check
   * never ran. A screen that reads a preference cannot be the screen
   * responsible for loading it.
   */
  useEffect(() => {
    void hydrateSettings();
  }, []);

  /** For the OAuth result alerts below. Read through a ref, see the note there. */
  const t = useTranslator();

  /**
   * Back up progress when the app goes away.
   *
   * `syncProgress` was called from exactly one place — the sign-in screen — so a
   * player who signed in and then went off and solved four cases uploaded
   * nothing at all. Their account existed and `case_progress` stayed empty,
   * which is precisely the "signed up and it never reached the table" report,
   * and it also meant the one thing an account is for, carrying progress to
   * another phone, silently did not work.
   *
   * Backgrounding is the right moment for it: it is when a session actually
   * ends, it costs one round trip rather than one per message read, and it is
   * the last instant before the OS is entitled to kill the process. Sync is a
   * no-op when nobody is signed in, so this stays free for guests.
   */
  /**
   * The other half of Google and Apple sign-in.
   *
   * `signInWithProvider` opens the system browser and returns immediately --
   * the actual result comes back as a deep link to
   * `privatetexts://auth/callback?code=...`, which wakes the app here. This is
   * the only place that listens, because a listener per screen would race to
   * spend a single-use code and the loser would report a failure that did not
   * happen.
   *
   * Two sources, and both are needed. `addEventListener` catches the link when
   * the app is already running, which is the normal case: the browser opened
   * over a live app. `getInitialURL` catches the link that started a cold
   * process, which is what happens when the OS killed the app while the player
   * was busy authenticating.
   *
   * `completeOAuthRedirect` returns null for any link that is not an OAuth
   * callback, so every other deep link -- `?open=<case>`, password recovery --
   * falls through untouched to whoever else handles it.
   */
  /*
   * Read through a ref so the effect below can stay `[]`.
   *
   * Putting `t` in the dependency array would re-register the listener on every
   * language change, and re-running the effect calls `getInitialURL()` again --
   * which would hand the same callback URL back for a second exchange. The code
   * in it is single-use, so the second attempt fails and the player is told
   * their sign-in broke immediately after it worked.
   */
  const translate = useRef(t);
  translate.current = t;

  /** Callback URLs already spent. The same guard, for the same single-use code. */
  const handledUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const handle = (url: string | null) => {
      if (url === null || cancelled) return;
      if (handledUrls.current.has(url)) return;
      handledUrls.current.add(url);

      void (async () => {
        const result = await completeOAuthRedirect(url);
        // null means this was not an OAuth callback at all -- `?open=<case>`,
        // password recovery, anything else. Not ours, say nothing.
        if (result === null || cancelled) return;

        if (result.kind === 'signedIn') {
          // A successful exchange fires onAuthStateChange, which useAuth is
          // already listening to, so the signed-in UI appears on its own.
          // Progress is pulled down here because signing in is exactly when
          // another device's saves become relevant -- the same call the
          // sign-in screen makes.
          void syncProgress();
          Alert.alert('', translate.current('auth.provider.signedIn'));
          return;
        }

        /*
         * Cancelled and failed both get said out loud, and that is the point of
         * handling them at all. The player has just come back from a browser
         * into an app that looks exactly as they left it; silence there is
         * indistinguishable from a button that does nothing.
         */
        Alert.alert(
          '',
          result.kind === 'cancelled'
            ? translate.current('auth.provider.cancelled')
            : render(result.reason, translate.current),
        );
      })();
    };

    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    void Linking.getInitialURL().then(handle);

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        void syncProgress();
        // The session is configured not to play in the background, but an
        // explicit stop also frees the decoded loop rather than leaving it
        // resident for however long the OS keeps the process alive.
        stopBed();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={rootStyle}>
      <StatusBar style="light" />
      <Stack screenOptions={rootScreenOptions}>
        {/* Presentation belongs to the navigator, not to the screen component. */}
        <Stack.Screen name="index" options={indexOptions} />
        <Stack.Screen name="landing" options={landingOptions} />
        <Stack.Screen name="setup" options={setupOptions} />
        <Stack.Screen name="paywall" options={paywallOptions} />
        <Stack.Screen name="debug" options={debugOptions} />
        <Stack.Screen name="reset-password" options={resetOptions} />
        <Stack.Screen name="sign-in" options={blankTitleOptions} />
        <Stack.Screen name="language" options={blankTitleOptions} />
      </Stack>
    </GestureHandlerRootView>
  );
}
