import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CASES } from './index';
import type { CaseScript } from '@/engine';

/**
 * Writes docs/storybook.md and docs/storybook.html — the whole game as one
 * readable document, for reading passes and review notes.
 *
 * It lives in the test suite on purpose. The storybook was hand-edited once
 * while it was a throwaway artefact, and a fresh generation would have silently
 * erased those edits. Regenerating on every `check.cmd` means the document can
 * never drift from `content/cases/`, and the only way to change it is to change
 * the source — which is the right way round.
 */

/**
 * Resolved from this file's own location, NOT written out as a path.
 *
 * It was an absolute path into one contributor's home directory
 * (`C:/Users/armaa/...`), so on any other machine this test threw ENOENT and
 * `check.cmd` could never go green — which matters more than a failing test
 * usually would, because AGENTS.md §4 tells the next person to stop and
 * investigate on a red suite. The second person to clone this repo met that
 * wall on their first run.
 *
 * `import.meta.url` is the same mechanism vitest.config.mts already uses for its
 * aliases, and it does not care about the working directory the suite was
 * launched from.
 */
const DIR = fileURLToPath(new URL('../../docs', import.meta.url));

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const clock = (minutes: number) => {
  const w = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`;
};

const paras = (text: string) =>
  text
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => `<p>${esc(l)}</p>`)
    .join('');

const slug = (id: string) => `case-${id}`;

const mdQuote = (text: string) =>
  text
    .split('\n')
    .map((l) => (l.trim() === '' ? '>' : `> ${l}`))
    .join('\n');

function mdChapter(script: CaseScript, i: number): string {
  const names = new Map(script.characters.map((c) => [c.id, c.name]));
  const places = new Map(script.places.map((p) => [p.id, p.name]));
  const name = (id: string) => (id === 'you' ? 'You' : (names.get(id) ?? id));
  const out: string[] = [];
  const push = (...l: string[]) => out.push(...l, '');
  const free = script.requiredEntitlementId === undefined;

  push(`## ${i + 1}. ${script.title}`);
  push(`*${script.blurb}*`);
  push(
    `\`${free ? 'FREE' : 'PAID'}\` · ${script.characters.length} characters · ` +
      `${script.threads.length} threads · ` +
      `${script.threads.reduce((n, t) => n + t.messages.length, 0)} messages`,
  );

  if (script.briefing) {
    const b = script.briefing;
    push('### The briefing');
    push(mdQuote(b.opening));
    push(
      `**${name(b.victimId)}** — found at ${places.get(b.foundAt.placeId)}, ${clock(b.foundAt.minutes)}.`,
      '',
      `*Cause.* ${b.causeOfDeath}`,
      '',
      `*Ruling.* ${b.ruling}`,
    );
  }

  push('### The threads');
  for (const t of script.threads) {
    push(`#### ${t.title}`);
    const gates: string[] = [];
    if (t.requiresContradictionIds.length > 0) {
      gates.push(`opens once you prove ${t.requiresContradictionIds.join(' and ')}`);
    }
    if ((t.requiresReadMessageIds ?? []).length > 0) gates.push('opens when somebody mentions them');
    if (gates.length > 0) push(`*${gates.join('; ')}*`);
    for (const m of t.messages) push(`**${name(m.senderId)}**`, mdQuote(m.body));
  }

  push('### What breaks it');
  const required = new Set(script.solution.requiredContradictionIds);
  for (const c of script.contradictions) {
    push(`**${required.has(c.id) ? 'REQUIRED' : 'optional'}** — \`${c.id}\``, c.revelation);
  }
  for (const m of script.motives) push(`**Motive — ${name(m.characterId)}**`, m.summary);

  if (script.confrontation) {
    const c = script.confrontation;
    const killer = name(script.solution.killerId);
    push('### The confrontation');
    push(`**${killer}**`, mdQuote(c.opening));
    for (const b of c.beats) {
      push('**You**', mdQuote(b.press));
      push(b.rebuttal === '' ? `**${killer}** — *says nothing*` : `**${killer}**`);
      if (b.rebuttal !== '') push(mdQuote(b.rebuttal));
    }
    push('*If you press with something that does not land:*');
    push(c.deflections.map((d) => `- ${d}`).join('\n'));
    push('### The confession');
    push(mdQuote(c.confession));
  }

  push('### Afterwards');
  push(mdQuote(script.solution.epilogue));
  if (script.coda) {
    push(`### ${script.coda.from}`);
    for (const m of script.coda.messages) push(mdQuote(m));
  }
  push('---');
  return out.join('\n');
}

function htmlChapter(script: CaseScript, i: number): string {
  const names = new Map(script.characters.map((c) => [c.id, c.name]));
  const places = new Map(script.places.map((p) => [p.id, p.name]));
  const name = (id: string) => (id === 'you' ? 'You' : (names.get(id) ?? id));
  const free = script.requiredEntitlementId === undefined;
  const o: string[] = [];

  o.push(`<section class="chapter" id="${slug(script.id)}">`);
  o.push(`<header class="chapter-head">`);
  o.push(`<div class="num">${String(i + 1).padStart(2, '0')}</div>`);
  o.push(`<h2>${esc(script.title)}</h2>`);
  o.push(`<p class="blurb">${esc(script.blurb)}</p>`);
  o.push(`<p class="meta"><span class="tag ${free ? 'free' : ''}">${free ? 'Free' : 'Paid'}</span>`);
  o.push(
    `<span>${script.characters.length} characters</span><span>${script.threads.length} threads</span>` +
      `<span>${script.threads.reduce((n, t) => n + t.messages.length, 0)} messages</span>` +
      `<span>${script.solution.requiredContradictionIds.length} proofs to accuse</span></p></header>`,
  );

  if (script.briefing) {
    const b = script.briefing;
    o.push(`<h3>The briefing</h3><div class="set">${paras(b.opening)}</div>`);
    o.push(
      `<dl class="facts"><dt>Found</dt><dd>${esc(name(b.victimId))}, at ` +
        `${esc(places.get(b.foundAt.placeId) ?? '')}, ${clock(b.foundAt.minutes)}</dd>` +
        `<dt>Cause</dt><dd>${esc(b.causeOfDeath)}</dd>` +
        `<dt>Ruling</dt><dd>${esc(b.ruling)}</dd></dl>`,
    );
  }

  o.push(`<h3>The threads</h3>`);
  for (const t of script.threads) {
    o.push(`<div class="thread"><h4>${esc(t.title)}</h4>`);
    const gates: string[] = [];
    if (t.requiresContradictionIds.length > 0) {
      gates.push(`Locked until you prove ${t.requiresContradictionIds.join(' and ')}`);
    }
    if ((t.requiresReadMessageIds ?? []).length > 0) {
      gates.push('Found only when somebody mentions them');
    }
    if (gates.length > 0) o.push(`<p class="gate">${esc(gates.join(' · '))}</p>`);
    for (const m of t.messages) {
      o.push(
        `<div class="msg${m.senderId === 'you' ? ' mine' : ''}">` +
          `<span class="who">${esc(name(m.senderId))}</span>${paras(m.body)}</div>`,
      );
    }
    o.push(`</div>`);
  }

  o.push(`<h3>What breaks it</h3>`);
  const required = new Set(script.solution.requiredContradictionIds);
  for (const c of script.contradictions) {
    const req = required.has(c.id);
    o.push(
      `<div class="proof${req ? ' required' : ''}"><span class="who">` +
        `${req ? 'Required' : 'Optional'} · ${esc(c.id)}</span>${paras(c.revelation)}</div>`,
    );
  }
  for (const m of script.motives) {
    o.push(
      `<div class="proof motive"><span class="who">Motive · ${esc(name(m.characterId))}</span>` +
        `${paras(m.summary)}</div>`,
    );
  }

  if (script.confrontation) {
    const c = script.confrontation;
    const killer = name(script.solution.killerId);
    o.push(`<h3>The confrontation</h3>`);
    o.push(`<div class="msg them"><span class="who">${esc(killer)}</span>${paras(c.opening)}</div>`);
    for (const b of c.beats) {
      o.push(`<div class="msg mine"><span class="who">You</span>${paras(b.press)}</div>`);
      o.push(
        b.rebuttal === ''
          ? `<div class="msg them"><span class="who">${esc(killer)}</span><p class="nothing">says nothing</p></div>`
          : `<div class="msg them"><span class="who">${esc(killer)}</span>${paras(b.rebuttal)}</div>`,
      );
    }
    o.push(`<p class="gate">If you press with something that does not land:</p>`);
    o.push(`<ul class="deflect">${c.deflections.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`);
    o.push(`<h3>The confession</h3><div class="set confession">${paras(c.confession)}</div>`);
  }

  o.push(`<h3>Afterwards</h3><div class="set">${paras(script.solution.epilogue)}</div>`);

  if (script.coda) {
    o.push(`<h3>${esc(script.coda.from)}</h3><div class="thread coda">`);
    for (const m of script.coda.messages) {
      o.push(`<div class="msg"><span class="who">${esc(script.coda.from)}</span>${paras(m)}</div>`);
    }
    o.push(`</div>`);
  }

  o.push(`<p class="top"><a href="#contents">Back to contents</a></p></section>`);
  return o.join('\n');
}

const CSS = `
:root{--paper:#F0F1EE;--ink:#1A1D21;--quiet:#5F666E;--rule:#D3D6D0;
  --accent:#1F5563;--flag:#8A3324;--card:#F7F8F5;}
@media (prefers-color-scheme: dark){:root{--paper:#131619;--ink:#DCE0DB;--quiet:#8B9199;
  --rule:#2B3037;--accent:#6FA8B8;--flag:#C97B62;--card:#181C20;}}
:root[data-theme="dark"]{--paper:#131619;--ink:#DCE0DB;--quiet:#8B9199;--rule:#2B3037;
  --accent:#6FA8B8;--flag:#C97B62;--card:#181C20;}
:root[data-theme="light"]{--paper:#F0F1EE;--ink:#1A1D21;--quiet:#5F666E;--rule:#D3D6D0;
  --accent:#1F5563;--flag:#8A3324;--card:#F7F8F5;}
*{box-sizing:border-box;}
body{background:var(--paper);color:var(--ink);
  font-family:Georgia,"Iowan Old Style","Palatino Linotype",Palatino,serif;
  font-size:1.0625rem;line-height:1.62;margin:0;padding:0 1.25rem 6rem;
  -webkit-text-size-adjust:100%;}
.wrap{max-width:38rem;margin:0 auto;}
h1,h2,h3,h4{text-wrap:balance;}
.mast{border-bottom:2px solid var(--ink);padding:4rem 0 1.5rem;margin-bottom:2.5rem;}
.mast h1{font-size:2.1rem;line-height:1.15;margin:0 0 .75rem;letter-spacing:-.01em;}
.mast .kicker{font-family:ui-monospace,Menlo,Consolas,monospace;text-transform:uppercase;
  letter-spacing:.14em;font-size:.7rem;color:var(--accent);margin:0 0 1rem;}
.mast p{color:var(--quiet);margin:0 0 .75rem;font-size:.95rem;}
.stats{display:flex;flex-wrap:wrap;gap:.4rem 1.25rem;margin-top:1.25rem;
  font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.75rem;text-transform:uppercase;
  letter-spacing:.08em;color:var(--quiet);font-variant-numeric:tabular-nums;}
.stats b{color:var(--ink);font-weight:600;}
.contents{margin:0 0 4rem;}
.contents h2{font-size:.72rem;text-transform:uppercase;letter-spacing:.14em;
  font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--quiet);
  border-bottom:1px solid var(--rule);padding-bottom:.5rem;margin:0 0 1rem;}
.contents ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.9rem;}
.contents li{display:grid;grid-template-columns:2.2rem 1fr;gap:.75rem;align-items:baseline;}
.contents .n{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.8rem;
  color:var(--accent);font-variant-numeric:tabular-nums;}
.contents a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--rule);font-weight:600;}
.contents a:hover{border-bottom-color:var(--accent);}
.contents .b{display:block;color:var(--quiet);font-size:.9rem;margin-top:.15rem;}
.chapter{border-top:2px solid var(--ink);padding-top:2.5rem;margin-top:4.5rem;scroll-margin-top:1rem;}
.chapter-head .num{font-size:.75rem;letter-spacing:.14em;color:var(--accent);
  font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;}
.chapter-head h2{font-size:1.85rem;margin:.35rem 0 .6rem;line-height:1.2;}
.blurb{font-style:italic;color:var(--quiet);margin:0 0 1rem;font-size:1.02rem;}
.meta{display:flex;flex-wrap:wrap;gap:.35rem .9rem;font-size:.68rem;text-transform:uppercase;
  letter-spacing:.09em;color:var(--quiet);margin:0 0 .5rem;
  font-family:ui-monospace,Menlo,Consolas,monospace;}
.tag{border:1px solid var(--rule);padding:.1rem .45rem;}
.tag.free{border-color:var(--accent);color:var(--accent);}
h3{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.72rem;text-transform:uppercase;
  letter-spacing:.14em;color:var(--quiet);border-bottom:1px solid var(--rule);
  padding-bottom:.45rem;margin:3rem 0 1.5rem;font-weight:500;}
h4{font-size:1.05rem;margin:0 0 .25rem;}
.set{margin:0 0 1.5rem;}
.set p{margin:0 0 1rem;}
.confession{border-left:3px solid var(--accent);padding-left:1.25rem;}
.facts{display:grid;grid-template-columns:auto 1fr;gap:.4rem 1rem;margin:0 0 2rem;font-size:.95rem;}
.facts dt{font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:var(--quiet);
  padding-top:.28rem;font-family:ui-monospace,Menlo,Consolas,monospace;}
.facts dd{margin:0;}
.thread{margin:0 0 2.5rem;}
.gate{font-size:.68rem;text-transform:uppercase;letter-spacing:.09em;color:var(--accent);
  margin:.25rem 0 1.1rem;font-family:ui-monospace,Menlo,Consolas,monospace;}
.msg{border-left:2px solid var(--rule);padding:.1rem 0 .1rem 1rem;margin:0 0 1.15rem;}
.msg.mine{border-left-color:var(--accent);}
.msg .who{display:block;font-size:.66rem;text-transform:uppercase;letter-spacing:.1em;
  color:var(--quiet);margin-bottom:.3rem;font-family:ui-monospace,Menlo,Consolas,monospace;}
.msg.mine .who{color:var(--accent);}
.msg p{margin:0 0 .55rem;font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,
  "Helvetica Neue",Arial,sans-serif;font-size:.97rem;line-height:1.55;}
.msg p:last-child{margin-bottom:0;}
.nothing{font-style:italic;color:var(--quiet);}
.coda .msg{border-left-color:var(--accent);}
.proof{background:var(--card);border:1px solid var(--rule);padding:1rem 1.15rem;margin:0 0 1rem;}
.proof.required{border-left:3px solid var(--flag);}
.proof.motive{border-left:3px solid var(--accent);}
.proof .who{display:block;font-size:.64rem;text-transform:uppercase;letter-spacing:.11em;
  color:var(--quiet);margin-bottom:.5rem;font-family:ui-monospace,Menlo,Consolas,monospace;}
.proof.required .who{color:var(--flag);}
.proof p{margin:0 0 .6rem;font-size:.95rem;}
.proof p:last-child{margin-bottom:0;}
.deflect{margin:0 0 1.5rem;padding-left:1.1rem;}
.deflect li{margin-bottom:.5rem;font-size:.95rem;color:var(--quiet);}
.top{margin:3rem 0 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.7rem;
  text-transform:uppercase;letter-spacing:.1em;}
.top a{color:var(--quiet);text-decoration:none;border-bottom:1px solid var(--rule);}
.top a:hover{color:var(--accent);}
a:focus-visible{outline:2px solid var(--accent);outline-offset:3px;}
@media (max-width:520px){.mast h1{font-size:1.7rem;}.chapter-head h2{font-size:1.5rem;}
  body{font-size:1rem;}}
`;

it('writes the storybook', () => {
  const messages = CASES.reduce(
    (n, c) => n + c.threads.reduce((m, t) => m + t.messages.length, 0),
    0,
  );
  const words = CASES.reduce(
    (n, c) =>
      n +
      c.threads.reduce(
        (m, t) => m + t.messages.reduce((k, x) => k + x.body.split(/\s+/).length, 0),
        0,
      ),
    0,
  );
  const freeCount = CASES.filter((c) => c.requiredEntitlementId === undefined).length;

  const head: string[] = [];
  const push = (...l: string[]) => head.push(...l, '');
  push('# Read Receipts — every case, as written');
  push(
    'Generated by `content/cases/storybook.gen.test.ts` on every test run, so it ' +
      'cannot drift from what ships. **Do not hand-edit this file — it will be ' +
      'overwritten.** Change `content/cases/*.ts` instead.',
  );
  push(
    'Read it as a book. Where you want something changed, name the case and quote the ' +
      'line — that is enough for me to find it.',
  );
  push(
    `**${CASES.length} cases · ${messages} messages · ${(words / 1000).toFixed(1)}k words in the ` +
      'messages alone**, before briefings, confessions and epilogues.',
  );
  push('## The fifteen');
  CASES.forEach((c, i) => {
    head.push(
      `${i + 1}. **${c.title}**${c.requiredEntitlementId === undefined ? ' `FREE`' : ''} — ${c.blurb}`,
    );
  });
  head.push('', '---', '');
  writeFileSync(`${DIR}/storybook.md`, head.join('\n') + CASES.map(mdChapter).join('\n'), 'utf8');

  const toc = CASES.map(
    (c, i) =>
      `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span>` +
      `<a href="#${slug(c.id)}">${esc(c.title)}</a>` +
      `${c.requiredEntitlementId === undefined ? ' <span class="n">free</span>' : ''}` +
      `<span class="b">${esc(c.blurb)}</span></span></li>`,
  ).join('');

  writeFileSync(
    `${DIR}/storybook.html`,
    `<style>${CSS}</style>
<div class="wrap">
<header class="mast">
  <p class="kicker">Read Receipts · reading edition</p>
  <h1>Every case, as written</h1>
  <p>Generated from the game's own content files on every test run, so it cannot drift from what ships.</p>
  <p>Read it as a book. Where you want something changed, name the case and quote the line — that is enough for me to find it.</p>
  <div class="stats">
    <span><b>${CASES.length}</b> cases</span>
    <span><b>${messages}</b> messages</span>
    <span><b>${(words / 1000).toFixed(1)}k</b> words of messages</span>
    <span><b>${freeCount}</b> free</span>
  </div>
</header>
<nav class="contents" id="contents"><h2>The fifteen</h2><ol>${toc}</ol></nav>
${CASES.map(htmlChapter).join('\n')}
</div>`,
    'utf8',
  );
});
