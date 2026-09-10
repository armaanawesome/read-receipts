import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * The other direction.
 *
 * `translate.test.ts` checks consistency *within* the catalogue.
 * `orphanKeys.test.ts` checks catalogue → screens. Nothing checked
 * screens → catalogue, and that is precisely the gap that let four surfaces
 * ship in English inside a five-language game long after everything around them
 * was translated: the thread list, the briefing CTA, the claim menu heading,
 * and four screen-reader labels.
 *
 * Two of those were not merely untranslated but wrong. `BriefingScreen` read
 * "Open her messages" while case 1's victim is Tom Vardy, and
 * `ConfrontationScreen` read "Put it to her" across sixteen cases that do not
 * all end with a woman. Both were invisible to every existing test.
 */

/** Screen-reader labels are the easy ones to miss: nothing on screen shows them. */
const A11Y_LITERAL = /accessibilityLabel="[^"]+"/g;

/**
 * An English sentence sitting directly inside a Text element.
 *
 * The first letter is `[A-Za-z]`, not `[A-Z]`, and that one character is the
 * whole reason `ClaimMenu` shipped the bare string `on the record` inside a
 * five-language game. The guard only ever looked for sentences that began
 * with a capital, so a lowercase label walked straight past it.
 */
const VISIBLE_LITERAL = /<Text[^>]*>\s*[A-Za-z][a-z]+ [a-z][^<{}]{6,}/g;

/**
 * `app/debug.tsx` is the Test Store harness — a developer screen reached only
 * from the debug route, never part of a playthrough. Translating it would cost
 * a translator real work on strings no player will ever see, which is the same
 * waste `orphanKeys.test.ts` exists to prevent.
 */
const NOT_PLAYER_FACING = [join('app', 'debug.tsx')];

function screens(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!p.includes('node_modules') && !p.includes(`${sep}.`)) walk(p);
      } else if (entry.name.endsWith('.tsx')) {
        found.push(p);
      }
    }
  };
  walk(root);
  return found.filter((p) => !NOT_PLAYER_FACING.some((skip) => p.endsWith(skip)));
}

describe('no screen speaks English at the player directly', () => {
  const files = [...screens('app'), ...screens('src')];

  it('finds screens to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('routes every accessibility label through the catalogue', () => {
    const offenders = files.flatMap((f) => {
      const hits = readFileSync(f, 'utf8').match(A11Y_LITERAL) ?? [];
      return hits.map((h) => `${f}: ${h}`);
    });
    expect(offenders).toEqual([]);
  });

  it('routes every visible sentence through the catalogue', () => {
    const offenders = files.flatMap((f) => {
      const hits = readFileSync(f, 'utf8').match(VISIBLE_LITERAL) ?? [];
      return hits.map((h) => `${f}: ${h.replace(/\s+/g, ' ').trim()}`);
    });
    expect(offenders).toEqual([]);
  });
});
