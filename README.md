# Cosa Nostra — O Ouro Amarelo da Sicília

Jogo web multiplayer (3–4 jogadores) completo: backend Node.js autoritativo (WebSocket),
cliente Three.js com tabuleiro 3D procedural da Sicília.

## Como rodar

```bash
npm install
npm start            # servidor em http://localhost:8420
# ou: node server/server.js 8430   (porta customizada)
npm test             # teste de integração headless (protocolo WebSocket + partida completa)
```

Abra `http://localhost:8420` em 3–4 abas/navegadores, crie a sala (3 ou 4 jogadores),
compartilhe o código de 6 caracteres e marque "pronto" para iniciar.

## Arquitetura

```
server/
  server.js          HTTP estático + WebSocket (ws) + salas/timers/sincronização
  game/data.js       12 distritos, ligações, rota Palermo–Messina, 18 eventos, taxas
  game/engine.js     motor autoritativo: rodadas, renda, 6 ações, disputas (5 passos),
                     cobranças/tensão, eventos, negociação e juramento, vitória
client/
  index.html         UI (lobby, HUD, modais de disputa/negociação/juramento/evento/vitória)
  css/style.css      vidro fosco + dourado, serifas nos títulos
  js/app.js          rede + interface + seleção de distritos por raycast
  js/board3d.js      cena 3D (madeira envelhecida procedural, mar animado, capangas,
                     limões dourados, rota tracejada, luz de fim de tarde, poeira)
  js/audio.js        sons WebAudio discretos + ambiente siciliano
  js/data-client.js  espelho dos dados estáticos para o cliente
test/simulate.js     4 clientes headless: sala, chat, partida completa até a vitória
```

- Estado 100% autoritativo no servidor; apostas de disputa nunca saem dele (segredo).
- Reconexão: o assento é preservado; basta reabrir e entrar com o mesmo código.
- Histórico de partida (crônica + snapshots por ação) disponível no estado.
