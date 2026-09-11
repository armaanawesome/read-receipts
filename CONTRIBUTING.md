# Contributing to Read Receipts

Two people work on this repo. This file is the part that is easy to skip and
expensive to skip: who owns what you write.

---

## 1. Sign your commits off

Every commit needs a `Signed-off-by` line:

```bash
git commit -s -m "your message"
```

That adds:

```
Signed-off-by: Your Name <your@email>
```

By adding it you certify the [Developer Certificate of Origin
1.1](https://developercertificate.org/) — in short, that you wrote the change or
have the right to submit it, and that you are happy for it to be distributed
under this project's licences.

## 2. What licence your contribution is under

The repo is split (see `LICENSE` and `CONTENT-LICENSE`):

| What you touched | Your contribution is licensed as |
|---|---|
| Code — `src/`, `app/`, `supabase/`, `tools/`, tests, config, docs | MIT, same as the rest of the code |
| Content — `content/cases/`, `assets/`, `docs/storybook.*` | You grant Armaan Ebrahim a perpetual, worldwide, royalty-free, irrevocable licence to use, adapt, translate, publish and sell it as part of Read Receipts, including in commercial releases |

**You keep your copyright either way.** Neither line assigns it. What the second
one does is make it possible to sell a game containing your writing without
coming back to you for permission on every release — which, without something in
writing, is genuinely required.

### Why this file exists at all

Absent a written agreement, whoever writes a thing owns it. On a project that
sells what it produces, that means a contributor can later object to a release
and there is no clean answer. If the result counts as a joint work it is worse
in a different direction: under US law either joint author can license the whole
thing to anybody without asking the other, owing only an accounting of profits.

Neither outcome is what either of us wants. Two minutes and a `-s` flag avoids
both. See `docs/LEGAL-REVIEW.md`, Count 12.

If you are not comfortable with the content licence above, say so before you
write the content rather than after. That is a completely reasonable position
and there are other ways to structure it — but it has to be agreed in writing
first.

---

## 3. How to actually work here

`AGENTS.md` is the working agreement and it is short. The three rules that cost
somebody an hour to learn:

**Run `./check.cmd`, never `npx vitest` by hand.** Run bare, vitest picks up
unrelated projects from the parent directory and resolves `tsc` to a squatter
package. Both failures look alarming and neither is real.

**Scope commits to explicit paths. Never `git add -A`.** It sweeps a running
agent's half-written files into your commit. It has happened here.

**Push in the same turn as you commit.** GitHub is the only view either of us
has of the other's work, and two people building on different baselines is where
the merge pain starts.

Before starting anything:

```bash
git fetch origin && git status -sb && git log --oneline HEAD..origin/master
```

## 4. Before you open a PR

- [ ] `./check.cmd` is green — typecheck clean, all tests passing
- [ ] Commits are signed off (`-s`)
- [ ] New player-facing text is in `src/i18n/strings.ts`, in all five locales, never hardcoded in a screen
- [ ] If you touched an asset, `assets/ASSET-LICENCES.md` has a row for it
- [ ] If you changed what data leaves the device, the privacy panel in `src/settings/about.ts` and `PRIVACY.md` say so

That last one is not boilerplate. The panel told players their progress never
left the device for as long as it took somebody to notice, in five languages.

## 5. New here?

Read `docs/ORIENTATION.md`. It is a ten-minute door in, and deliberately not the
1,600-line handoff log.
