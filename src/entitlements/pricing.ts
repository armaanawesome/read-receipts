/**
 * The per-case unit price shown under the pack's real price.
 *
 * Imports nothing, so the arithmetic is testable in plain Node — the same split
 * `src/audio/volume.ts` and `src/ui/wallpapers.ts` use, and for the same reason.
 *
 * ## The real price is NOT here, and must never be
 *
 * `app/paywall.tsx` renders `pkg.product.priceString`, which is the store's own
 * localised string for what the player will actually be charged. That stays
 * true. A hardcoded price is wrong the moment somebody opens the app in another
 * currency, and wrong in a way that looks like a lie rather than a bug.
 *
 * **The real price lives in the RevenueCat dashboard.** Setting the case pack to
 * $10 is a dashboard change, not a code change.
 *
 * ## What this file used to be, and why it changed
 *
 * It used to compute a *reference* price — twelve units of the local currency,
 * rendered struck through beside the real one. It was never a former price; the
 * pack has never sold at another one, and the file said so in its own docstring.
 *
 * That is the problem. A strike-through is the universally understood notation
 * for a price reduction, so showing one against a price that was never charged
 * is a misleading price indication: Directive 98/6/EC Art. 6a as amended by the
 * Omnibus Directive requires any announced reduction to state the lowest price
 * of the previous 30 days, the UK's DMCC Act 2024 says the same, and the FTC's
 * Guides Against Deceptive Pricing require a former-price comparison to rest on
 * a bona fide price actually offered. See docs/LEGAL-REVIEW.md, Count 5.
 *
 * The message worth keeping was never the strike-through — it was *this pack is
 * good value per case*. So the figure is now the real price divided by the
 * number of cases. It is a unit price, it is true by construction, and it moves
 * with the store instead of drifting away from it.
 */

/**
 * How many cases the pack unlocks.
 *
 * `pricing.test.ts` asserts this against the case content, so adding a
 * thirteenth paid case fails the suite rather than quietly leaving the paywall
 * advertising twelve.
 */
export const PAID_CASE_COUNT = 12;

/**
 * What one case works out at, formatted for the store's currency.
 *
 * `total` is `product.price` — the numeric price for the pack, in major units,
 * as the store reported it. Divided rather than assumed, so the line stays true
 * when the dashboard price changes.
 *
 * Two decimal places here, unlike the old reference figure: this is a real
 * derived amount, and rounding 0.83 up to 1 would overstate it. Zero-decimal
 * currencies are handled by Intl, which knows JPY has no minor unit.
 *
 * Returns null when `Intl` is unavailable, the currency code is one it rejects,
 * or the price is not a usable number. A missing unit price is a small blemish;
 * a thrown exception on the paywall is a lost sale, and a wrong number is the
 * mistake this file exists to stop. The caller renders nothing on null.
 */
export function perCasePrice(
  total: number,
  currencyCode: string,
  locale?: string,
): string | null {
  if (!Number.isFinite(total) || total <= 0) return null;

  const each = total / PAID_CASE_COUNT;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(each);
  } catch {
    return null;
  }
}
