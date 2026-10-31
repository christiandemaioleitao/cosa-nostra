// Push via GitHub API (fallback quando o transporte git falha): cria blobs,
// tree, commit e atualiza refs/heads/main.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const TOKEN = execSync('git remote get-url origin', { cwd: __dirname + '/..' }).toString()
  .replace('https://x-access-token:', '').replace(/@github\.com.*/, '').trim();
const REPO = 'christiandemaioleitao/cosa-nostra';
const ROOT = path.resolve(__dirname, '..');
const FILES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'server/game/bots.js', 'server/game/rooms.js', 'server/game/cloudstore.js',
      'client/index.html', 'client/js/app.js', 'test/solo.js', 'test/solo-probe.js',
      'test/solo-smoke.js', 'test/launch-prod.js',
    ];
const api = async (url, method, body) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}${url}`, {
    method, headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'deploy', 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
};
(async () => {
  const base = await api('/git/ref/heads/main');
  const baseSha = base.object.sha;
  const baseCommit = await api(`/git/commits/${baseSha}`);
  const tree = [];
  for (const f of FILES) {
    const content = fs.readFileSync(path.join(ROOT, f));
    const blob = await api('/git/blobs', 'POST', { content: content.toString('base64'), encoding: 'base64' });
    tree.push({ path: f, mode: '100644', type: 'blob', sha: blob.sha });
    console.log('blob ok:', f);
  }
  const newTree = await api('/git/trees', 'POST', { base_tree: baseSha, tree });
  const commit = await api('/git/commits', 'POST', {
    message: 'Solo-only: lobby direto para partida contra robos (mesa 3/4 + dificuldade), multiplayer desativado por flag (cod. preservado), auto-ready/start, fix de ordem token/code no transporte HTTP',
    tree: newTree.sha, parents: [baseSha],
  });
  await api('/git/refs/heads/main', 'PATCH', { sha: commit.sha, force: false });
  console.log('PUSH OK via API — commit', commit.sha);
})().catch(e => { console.error('FALHA:', e.message); process.exit(1); });
