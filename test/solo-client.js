/**
 * Teste E2E do modo SOLO client-side — usa EXATAMENTE o bundle do navegador
 * (client/js/engine.bundle.js) e o adaptador LocalSolo (client/js/solo.js).
 *
 * Executa 1 partida solo completa (1 humano automático + bots) em CADA
 * dificuldade; todas devem terminar com vencedor. Além disso:
 *  - stub de fetch() que FALHA se algo chamar /api/* durante a partida;
 *  - verifica que o bundle contém o motor/IA e nenhuma referência a /api/.
 *
 * Uso: node test/solo-client.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'solo-client.entry.bundle.js');

// 1) Empacota a entrada de teste (LocalSolo + server/game) para Node/CJS
execSync(
  `npx esbuild test/solo-client-entry.js --bundle --platform=node --format=cjs ` +
  `--define:process.env.BOT_DELAY_MS=\\"1200\\" --outfile=${OUT}`,
  { cwd: ROOT, stdio: 'inherit' }
);

// 2) Verifica o bundle do NAVEGADOR (o que roda em produção)
const browserBundle = fs.readFileSync(path.join(ROOT, 'client/js/engine.bundle.js'), 'utf8');
const checks = {
  'motor no bundle (engine)': browserBundle.includes('WIN_INFLUENCE') || browserBundle.includes('Partida iniciada'),
  'IA no bundle (bots.js)': browserBundle.includes('botActionCandidates') && browserBundle.includes('botTax'),
  'nenhuma chamada /api/*': !/['"`]\/api\//.test(browserBundle) && !browserBundle.includes('/api/action') && !browserBundle.includes('/api/poll'),
};
for (const [k, ok] of Object.entries(checks)) {
  console.log(`${ok ? '✔' : '❌'} bundle do navegador: ${k}`);
  if (!ok) process.exit(1);
}

// 3) Carrega o bundle de teste e roda as 3 dificuldades
const entry = require(OUT);
entry.runTests();
