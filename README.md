# everise-agents

Everise's shared [Claude Code](https://code.claude.com) setup, as a plugin: what both of Everise's repositories,
[everise-backend](https://github.com/denis-coccodi/everise-backend) and
[everise-frontend](https://github.com/denis-coccodi/everise-frontend), use. Each repository keeps its own agents and
skills; this holds only what they share.

| Part | What it does |
| --- | --- |
| `everise:orchestrator` agent | Plans work across both repositories and keeps each feature's plan in a GitHub issue, hands each piece to an agent in its own worktree, keeps a work board, follows each change to a merged PR. Never edits code. |
| `everise:workspace` skill | How the two repositories and the sessions working on them fit together: one git worktree per change, ownership, ports, the board, the order of a change across both. |
| Guard hook | Runs before every shell command. Blocks the git commands that trample other sessions' work (`git add -A`, `git stash`, `reset --hard`, force pushes, commits or pushes to `main`), branches not named `feature/`, `bugfix/` or `hotfix/`, `gh pr merge` before `test` passed, writes to branch protection, `prettier --write` on a folder. Asks first before a deploy or a write to production. |
| Session-start hook | Tells each session its checkout, branch, uncommitted files and the repository's other worktrees. |

## Install

The hooks are TypeScript, which Node runs as it is: they need Node 22.18 or later on the `PATH`, and nothing installed.
Each repository turns the plugin on in its committed `.claude/settings.json`. On each machine, once per clone, from
the repository's folder:

```sh
claude plugin marketplace add denis-coccodi/everise-agents --scope project
claude plugin install everise@everise --scope project
```

After an update: `claude plugin update everise@everise` in each repository.

## Use

Claude Code works in either repository as usual; agents run only when asked. To coordinate work across both, run
`npm run orchestrator` from either repository's main checkout. It starts the orchestrator with the other repository
added (`--add-dir`), which brings that repository's agents and skills along; a setting can't do that. It needs `claude`
on the `PATH`.

Changing the plugin: see [CLAUDE.md](CLAUDE.md).
