// The guard hook's decisions on sample commands: run with `node --test`.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const GUARD = fileURLToPath(new URL('../plugins/everise/hooks/guard.ts', import.meta.url));

// A clean git repository with a folder in it, for the commands that look at the checkout.
const repo = mkdtempSync(join(tmpdir(), 'everise-guard-'));
execFileSync('git', ['init', '-q', '-b', 'main', repo]);
execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'chore: init']);
mkdirSync(join(repo, 'libs'));

function decide(command: string) {
  const r = spawnSync('node', [GUARD], { input: JSON.stringify({ tool_input: { command }, cwd: repo }), encoding: 'utf8' });
  if (r.status === 2) return 'block';
  if (r.status === 0) return r.stdout.includes('"ask"') ? 'ask' : 'allow';
  throw new Error(`guard exited ${r.status}: ${r.stderr}`);
}

const cases = {
  block: [
    'git add -A',
    'git add .',
    'git stash',
    'git stash pop',
    'git reset --hard',
    'git clean -fd',
    'git checkout .',
    'git push -f origin feature/x',
    'git push origin main',
    'git commit -m "feat: on main"',
    'git switch -c new-thing origin/main',
    'git checkout -b release/2026',
    'git worktree add ../wt -b wip origin/main',
    'git branch -m worktree-agent-1',
    'git tag -a prod-2026-11-19 -m x',
    'gh pr merge 1 --repo denis-coccodi/no-such-repository --squash',
    'gh api -X PUT repos/o/r/branches/main/protection',
    'gh api repos/o/r/rulesets -f name=x',
    'npx prettier --write libs',
    'npx prettier --write .',
    'npx prettier --write "libs/**/*.ts"',
  ],
  ask: [
    'curl -X POST https://apis.everise.dev/api/events -d "{}"',
    'curl -s -X DELETE https://everise.dev/api/x',
    'Invoke-RestMethod -Uri https://apis.everise.dev/api/events -Method Post -Body $b',
    'npx wrangler deploy',
    'npx wrangler deploy --env staging',
    'npm run deploy',
    'npm run deploy:staging',
    'gh workflow run deploy-production.yaml',
  ],
  allow: [
    'git add src/a.ts',
    'git stash push -u -m "wip-x"',
    'git push --force-with-lease origin feature/x',
    'git switch -c feature/new-thing origin/main',
    'git checkout -b bugfix/x',
    'git worktree add ../wt -b hotfix/broken origin/main',
    'git branch -m worktree-agent-1 feature/renamed',
    'git branch --show-current',
    'git tag prod-2026-11-19-1430',
    'gh api repos/o/r/branches/main/protection',
    'npx prettier --write src/a.ts docs/index.md',
    'npx prettier --check libs',
    'curl -s https://apis.everise.dev/api/tags',
    'curl -X POST https://staging.apis.everise.dev/api/events -d x',
    'Invoke-RestMethod -Uri https://apis.everise.dev/api/tags',
    'npx wrangler dev --port 8791 --ip 127.0.0.1',
    'npm test',
  ],
};

for (const [expected, commands] of Object.entries(cases)) {
  for (const command of commands) {
    test(`${expected}: ${command}`, () => assert.equal(decide(command), expected));
  }
}

test('blocks switching branches in a checkout with uncommitted changes', () => {
  const dirty = mkdtempSync(join(tmpdir(), 'everise-guard-'));
  execFileSync('git', ['init', '-q', '-b', 'main', dirty]);
  execFileSync('git', ['-C', dirty, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'chore: init']);
  execFileSync('git', ['-C', dirty, 'checkout', '-q', '-b', 'feature/a']);
  execFileSync('git', ['-C', dirty, 'commit', '-q', '--allow-empty', '-m', 'feat: a'], { env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
  // A tracked file, then changed.
  const file = join(dirty, 'a.txt');
  spawnSync('node', ['-e', `require('fs').writeFileSync(${JSON.stringify(file)}, 'a')`]);
  execFileSync('git', ['-C', dirty, 'add', 'a.txt']);
  const r = spawnSync('node', [GUARD], {
    input: JSON.stringify({ tool_input: { command: 'git switch main' }, cwd: dirty }),
    encoding: 'utf8',
  });
  assert.equal(r.status, 2);
});
