---
name: workspace
description: How Everise's two repositories (everise-backend, everise-frontend) and the Claude windows and agents working on them fit together - one git worktree per change, who owns a checkout, ports, the work board, the order of a change that spans both repos, and the everise plugin's guard. Use before starting a change in either repository, when making or removing a worktree, when work spans both repositories, or when another session or agent is working at the same time.
---

# Working across Everise's repositories

Everise is two repositories, side by side in one folder:

- **`everise-backend`:** the API, an Express app in a Cloudflare Worker with its data in a Durable Object.
- **`everise-frontend`:** the Angular site, served by a Worker that forwards `/api` to the backend.

Each has its own `CLAUDE.md`, skills and agents, and its own rules for branches, tests and docs (the `feature-branch`,
`trunk-based`, `deploy` and `docs-site` skills of the repository you're in). This plugin holds only what both share:
this skill, the orchestrator agent, and the guard and session-start hooks.

## Nobody shares a checkout

Several Claude windows and agents work on these repositories at once. Two of them in one checkout overwrite each
other's files, branches and staged changes.

- **One worktree per change.** Make it from `origin/main` on its own branch, under the repository's
  `.claude/worktrees/` (ignored by git and the tools):
  `git -C <repo> worktree add <repo>/.claude/worktrees/<name> -b feature/<description> origin/main`. An agent started
  with `isolation: "worktree"` gets one made for it, but only in the repository its session was started in.
- **A main checkout belongs to the window open on it.** Don't switch its branch, commit there or run `npm install`
  there. The session-start hook lists every worktree and what's uncommitted in yours.
- **A new worktree needs `npm ci`.** A backend one also needs copies of the main checkout's untracked `.env` and
  `.dev.vars`, never committed. The frontend has none.
- **Stage files by name, never `git stash`.** The stash is shared by every worktree: set work aside with a WIP commit.
- **One owner per area.** Before starting, check nobody else holds the same files: the board, `git worktree list`,
  `gh pr list`.
- **Remove your worktree once its PR is merged or dropped** (`git worktree remove <path>`), never another session's.

## Ports

- **Backend `wrangler dev`:** 8791, 8792, … with `--ip 127.0.0.1`. On Windows a stopped wrangler can keep its port.
- **Frontend dev server:** 4201, 4202, …. Port 4200 belongs to the window open on `everise-frontend`.

## The work board

When the orchestrator coordinates work, it keeps a board in `.claude/board.md` in the main checkout of the repository
it was started in (ignored by git): who holds which files, branch, worktree, port and PR, and who holds staging. Read
it before starting work alongside it.

## A change across both repositories

1. **The backend first:** the new endpoint or field, switched off in production behind a `FEATURES` flag if it isn't
   finished, merged (so staging has it).
2. **Then the frontend,** against that API: method, path, request and response fields, the flag.
3. **Never the other way round:** a frontend that calls an API staging doesn't have yet breaks staging.

Only one change uses staging at a time: a manual staging deploy replaces what staging runs.

## The guard

The plugin's guard hook runs before every shell command, in both repositories.

**It blocks:**
- staging everything (`git add -A`, `.`, `-u`), and `git stash` without a unique message;
- discarding all changes (`reset --hard`, `clean -f`, `checkout .`);
- force pushes, pushes to `main`, and commits on `main` or a detached HEAD;
- switching branches in a checkout with uncommitted changes;
- a branch not named `feature/`, `bugfix/` or `hotfix/<description>`, and a production tag not named
  `prod-YYYY-MM-DD-HHMM`;
- `gh pr merge` before the PR's `test` check passed;
- writes to branch protection or rulesets;
- `prettier --write` on a folder or a glob.

**It asks the user first** before a deploy by hand (Wrangler, the npm deploy scripts, the production workflow) and
before a write to production (everise.dev, apis.everise.dev).

If it blocks something you need, say why to the user; don't work around it.
