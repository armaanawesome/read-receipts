import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from '@/i18n/strings';

/**
 * The claim menu said "on the record" when it meant "in a comparison slot".
 *
 * Those are different facts with different lifetimes. Reading a message puts
 * its claims on the record permanently — `availableClaims` derives from
 * `readMessageIds` and nothing ever removes one. A pin is one of the board's
 * two slots: a third pin evicts the oldest, and proving a contradiction clears
 * both.
 *
 * So the blue confirmation disappeared the moment the player ran a check, and
 * holding the same message again showed nothing — the game looking as though it
 * had forgotten a statement it had not forgotten. Reported from one Bothy group
 * chat; it was never about that chat, or that case.
 */
const menu = readFileSync(join('src', 'ui', 'ClaimMenu.tsx'), 'utf8');
const route = readFileSync(join('app', 'thread', '[threadId].tsx'), 'utf8');
const catalogue = readFileSync(join('src', 'i18n', 'strings.ts'), 'utf8');

describe('the record line tells the truth', () => {
  it('draws the record line from read state, not from the pins', () => {
    expect(menu).toContain('recorded: boolean;');
    expect(menu).toContain('{recorded ? <Text style={styles.recorded}>');
    // The wrong source. Every use of the pin list is now the slot line.
    expect(menu).not.toContain('pinnedClaimIds.includes(');
  });

  it('asks the store what has been READ, which is what records a claim', () => {
    expect(route).toContain('recorded={active !== null && readMessageIds.includes(active.id)}');
  });

  /** It was a bare English string in a five-language game, and lowercase, which
      is exactly why hardcodedText.test.ts walked past it. */
  it('says it through the catalogue, in the words the board already uses', () => {
    expect(menu).not.toContain("on the record'");
    expect(menu).toContain("t('board.record')");
  });
});

describe('the slot line says what the tap will do', () => {
  it('names the slot rather than showing a tick', () => {
    expect(menu).toContain("t('claim.unpin', { n: slot + 1 })");
    expect(menu).toContain("t('claim.pin')");
    expect(menu).toContain('const slot = pinnedClaimIds.indexOf(c.id);');
  });

  /**
   * The trap underneath the original bug: picking an already-pinned claim
   * REMOVES it. A player who held the message again to confirm was undoing the
   * thing they were confirming, and nothing on screen said so.
   */
  it('warns that picking a pinned claim unpins it', () => {
    expect(EN['claim.unpin']).toContain('unpin');
  });

  it('carries both new keys in all five locales', () => {
    expect(EN['claim.pin']).toBeTruthy();
    expect(EN['claim.unpin']).toBeTruthy();
    expect(catalogue.match(/'claim\.pin':/g)).toHaveLength(5);
    expect(catalogue.match(/'claim\.unpin':/g)).toHaveLength(5);
  });

  /** The old key promised an action the menu never performed. */
  it('has dropped the heading that claimed the tap did the recording', () => {
    expect(catalogue).not.toContain("'claim.heading'");
    expect((EN as Record<string, string>)['claim.heading']).toBeUndefined();
  });
});
