import { describe, it, expect } from 'vitest';
import { CASES } from '../../content/cases/index';
import { CASE_PACK_ENTITLEMENT } from './ids';
import { PAID_CASE_COUNT, perCasePrice } from './pricing';

/**
 * The paywall advertises a number of cases. That number has to be true.
 *
 * The copy this replaced said "A second full-length case", written when there
 * were two. Twelve cases later it was still saying it, on the one screen where a
 * wrong count is a wrong claim about what somebody is buying. Nothing caught it,
 * because a stale sentence is not a failing test until somebody writes one.
 */
describe('PAID_CASE_COUNT', () => {
  const paid = CASES.filter((c) => c.requiredEntitlementId === CASE_PACK_ENTITLEMENT);

  it('matches the number of cases the pack actually unlocks', () => {
    expect(
      paid.length,
      `the paywall advertises ${PAID_CASE_COUNT} cases but ${paid.length} require the entitlement`,
    ).toBe(PAID_CASE_COUNT);
  });

  it('leaves some cases free, or the paywall is the first screen anybody meets', () => {
    expect(CASES.length).toBeGreaterThan(paid.length);
  });
});

describe('perCasePrice', () => {
  /**
   * The whole point: this is DERIVED from what the store will actually charge,
   * not a figure chosen to look good beside it. If it ever stops being the real
   * price divided by the real count, it becomes the misleading reference price
   * it replaced. See docs/LEGAL-REVIEW.md, Count 5.
   */
  it('is the real price divided by the number of cases', () => {
    expect(perCasePrice(12, 'USD', 'en-US')).toBe('$1.00');
    expect(perCasePrice(6, 'USD', 'en-US')).toBe('$0.50');
  });

  /**
   * The reason this is computed rather than written as a literal: a dollar sign
   * beside a euro price is worse than no unit price at all.
   */
  it('follows the currency rather than assuming dollars', () => {
    const eur = perCasePrice(12, 'EUR', 'de-DE');
    expect(eur).not.toBeNull();
    expect(eur).not.toContain('$');
  });

  /** Intl knows JPY has no minor unit; a hardcoded 2dp would invent one. */
  it('respects a zero-decimal currency', () => {
    expect(perCasePrice(1200, 'JPY', 'ja-JP')).not.toContain('.');
  });

  /**
   * Keeps the minor unit. Showing "$1" for a price that works out at 0.83 would
   * overstate the unit price — the same family of mistake as the struck-through
   * figure this replaced, just in the other direction.
   */
  it('keeps the minor unit rather than rounding up to a whole one', () => {
    expect(perCasePrice(10, 'USD', 'en-US')).toBe('$0.83');
  });

  /** Decoration must never throw on the paywall, and must never show a wrong number. */
  it('returns null rather than throwing on a bad currency or price', () => {
    expect(perCasePrice(12, 'NOT_A_CURRENCY')).toBeNull();
    expect(perCasePrice(12, '')).toBeNull();
    expect(perCasePrice(0, 'USD')).toBeNull();
    expect(perCasePrice(Number.NaN, 'USD')).toBeNull();
    expect(perCasePrice(-5, 'USD')).toBeNull();
  });
});
