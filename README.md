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

Each repository turns the plugin on in its committed `.claude/settings.json`. On each machine, once per clone, from
the repository's folder:

```sh
claude plugin marketplace add denis-coccodi/everise-agents --scope project
claude plugin install everise@everise --scope project
```

Then start Claude Code there as usual. To coordinate work across both repositories, start the orchestrator from one
with the other added:

```sh
claude --agent everise:orchestrator --add-dir ../everise-frontend
```

It's optional: without it, Claude Code works in the repository as usual, and agents run only when asked.

## Change it

Edit the plugin in `plugins/everise/`, run `npm test` (the guard's tests, with Node 24), and bump `version` in
`plugins/everise/.claude-plugin/plugin.json`. To try a change before it's merged, start Claude Code with
`--plugin-dir <path to plugins/everise>`. After an update, `claude plugin update everise@everise` in each repository.
