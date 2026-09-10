# Read Receipts — working agreement

`HANDOFF.md` is the authority on project state. This file is about *how to work*,
and it is short on purpose.

Guidelines 1–4 are Andrej Karpathy's, from the `karpathy-guidelines` skill. The
notes under each are what this repo has learned the hard way.

**The ladder runs first** (`ponytail`). Stop at the first rung that holds: does
this need to exist → is it already in this repo → stdlib → platform → installed
dep → one line → minimum code that works. Deletion over addition. Shortest
working diff wins — *after* you understand the problem, never instead of it.

One place this repo overrides ponytail: **a rule you can state is a rule you
should execute.** See §2 — the tests here exist because comments rotted.

## 0. Expo HAS CHANGED

Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing any code. Not the latest docs — v57 specifically.

## 1. Think before coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

State assumptions. If several readings exist, present them rather than picking
silently. If a simpler approach exists, say so.

**Here:** when a test fails on a translated pack, run the diagnostic before
touching anything — *if it fails for `<pack> · en` too, the rule is wrong; if
only the locale fails, the translation is wrong.* Four of the last six real
defects were in the rule or in the English, not in the translation that
surfaced them. Rules have been rewritten to match a pack that was correct all
along, and a case was two commits from being made unsolvable that way.

## 2. Simplicity first

**Minimum code that solves the problem. Nothing speculative.**

No features beyond what was asked. No abstractions for single-use code. No
error handling for impossible states.

**Here:** the exception is *executable* rules. A convention in a comment rots;
the same convention as a test does not. `renameLeak.test.ts` exists because a
manual `grep -c "\bName\b"` returned 0 twice while the name was present — `\b`
does not match in this shell. Write the check, not the note.

## 3. Surgical changes

**Touch only what you must. Clean up only your own mess.**

Don't improve adjacent code. Don't refactor what isn't broken. Match existing
style. Mention unrelated dead code rather than deleting it.

**Here, the sharpest version of this rule:** *an English fix does not imply a
translation fix.* When `Answer him, Donal` was corrected at source, two of four
locales were already neutral — `le` and `lui` do not inflect. Mirroring the
edit into them anyway broke a voice test, because that pack substitutes
kept-versus-dropped **accents** for the English's apostrophes, and a
replacement with no accent in it made a careful character type like a careless
one. Check whether the locale actually has the problem first.

Scope commits to explicit paths. `git add -A` sweeps a running agent's
half-written files into your commit; it has happened.

**Push when you commit.** Since 2026-09-10 two people work on this repo, and
GitHub is the only view either of them has of the other's work. A commit
sitting unpushed is invisible, and two people building on different baselines
is where the merge pain starts. `git push origin master` belongs in the same
turn as the commit, not at the end of a session. Docs and comments go up with
the code they describe — write both for somebody who was not in the
conversation.

## 4. Goal-driven execution

**Define success criteria. Loop until verified.**

"Add validation" → "write tests for invalid inputs, then make them pass."
For multi-step work, state the plan with a verification per step.

**Here:** `.\check.cmd`, never `npx vitest` by hand — it `cd`s to the project
root, and running vitest from the parent directory picks up unrelated projects
and resolves `tsc` to a squatter package. Both failures look alarming and
neither is real.

**And a green suite is not a playthrough.** It proves no case is unsolvable, no
thread unreachable, no contradiction undeclared, no translation missing an id.
It proves nothing about whether a case is enjoyable or a purchase completes.
Every defect found in translation was found by an agent *reading for sense* —
stale names, three shapes of player-gender leak, a place name spoken nowhere.
None by the suite.

## 5. The player has no gender, age or face

Enforced by `content/cases/playerNeutral.test.ts`, which knows three shapes and
is blind to a fourth. Read its `WHAT THIS CANNOT SEE` block before trusting it.

## Standing process

`/using-superpowers` and `/find-skills` at the start of every task, and tell
every subagent to do the same. `/storytelling` for a case as a whole,
`/anti-ai-writing` for in-game message text, `/viral-hooks` for a blurb,
`/impeccable` and `/ui-ux-pro-max` before UI work. Invoke them; don't work from
memory of them.

## Tooling that is actually installed

`ponytail` (the ladder, always on), `karpathy-guidelines`, and `ecc`. From ecc,
the ones that fit this repo — do not go shopping beyond them:

| Want | Use |
|---|---|
| Review a diff before commit | `ecc:typescript-reviewer` agent |
| Kill dead code after a rename sweep | `ecc:refactor-clean` |
| Coverage gaps in the engine | `ecc:test-coverage` |

**GateGuard makes the first Bash and the first Edit of a session cost a
fact-statement.** That is the point of it — but batch accordingly: one wide
`git status` beats five narrow probes.

## Machine

Windows, PowerShell 5.1: no `&&`, no `claude` CLI, Node absent from the tool
shell's PATH. A Bash heredoc cannot write a TS file containing a template
literal. See `HANDOFF.md` §10 — every row in that table cost somebody an hour.
