// Lança as 3 partidas solo de produção em paralelo (processos independentes).
const { spawn } = require('child_process');
for (const d of ['facil', 'medio', 'dificil']) {
  const out = require('fs').openSync(`../prod-${d}.log`, 'w');
  const p = spawn('node', ['test/solo.js', 'https://cosa-nostra-beta.vercel.app'], {
    cwd: __dirname + '/..', env: { ...process.env, ONLY: d }, stdio: ['ignore', out, out], detached: true,
  });
  p.unref();
  console.log('lançado', d, 'pid', p.pid);
}
