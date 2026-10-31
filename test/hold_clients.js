/** Mantém 2 clientes conectados e prontos na sala informada (para teste manual no browser). */
const WebSocket = require('ws');
const code = process.argv[2];
const mk = (name) => new Promise((res) => {
  const ws = new WebSocket('ws://localhost:8420');
  ws.on('open', () => ws.send(JSON.stringify({ type: 'join_room', name, code })));
  ws.on('message', (m) => {
    const d = JSON.parse(m);
    if (d.type === 'joined') { ws.send(JSON.stringify({ type: 'ready', ready: true })); console.log(name, 'pronto'); res(); }
  });
});
Promise.all([mk('Corleone'), mk('Ciccio')]).then(() => {
  console.log('dois clientes ativos na sala', code);
  setInterval(() => {}, 1 << 30); // mantém o processo vivo
});
