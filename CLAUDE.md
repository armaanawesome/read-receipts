@AGENTS.md

## Before any task: check what he pushed

Since 2026-09-10 a second person commits to this repo. Their work reaches this
machine only through GitHub, so **start every task by looking** — before
reading code, before planning, before answering a question about the codebase:

```bash
git fetch origin && git status -sb && git log --oneline HEAD..origin/master
```

If `origin/master` is ahead, read what landed before touching a file
(`git log -p HEAD..origin/master` for the diff). Planning against a stale
checkout produces a confident plan for code that no longer exists; editing
against one produces a conflict somebody else has to resolve.

- Working tree clean: `git pull --rebase origin master`.
- Local commits of your own: rebase, never merge — the history has to stay
  readable for two people.

Then say what came in. The user is not watching the repo commit by commit, and
"he changed X while you were away" is usually the most useful sentence in the
reply.

Pushing your own work in the same turn as the commit is the other half of this
rule — see `AGENTS.md` §3.
