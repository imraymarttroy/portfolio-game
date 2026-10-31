// Starts the server, connects two fake adventurers and checks that joins,
// movement and chat reach the other player. Run: npm test (inside /server).
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT = 18787;
const URL = `ws://127.0.0.1:${PORT}`;

const server = spawn(process.execPath, ['index.mjs'], {
  cwd: new globalThis.URL('.', import.meta.url).pathname,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => d.toString().includes('listening') && resolve());
  server.on('exit', (code) => reject(new Error(`server exited early (${code})`)));
});

function connect(name) {
  const ws = new WebSocket(URL);
  const inbox = [];
  const waiters = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    inbox.push(msg);
    waiters.forEach((w) => w());
  };
  const waitFor = (pred, label) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${name} timed out waiting for ${label}`)), 3000);
      const check = () => {
        const hit = inbox.find(pred);
        if (hit) {
          clearTimeout(timer);
          resolve(hit);
        }
      };
      waiters.push(check);
      check();
    });
  const opened = new Promise((r) => (ws.onopen = r));
  return { ws, waitFor, opened, send: (m) => ws.send(JSON.stringify(m)) };
}

try {
  const a = connect('A');
  await a.opened;
  a.send({ t: 'hello', name: 'Alpha<script>', color: '#ff0000', level: 3 });
  const welcomeA = await a.waitFor((m) => m.t === 'welcome', 'welcome');
  assert.equal(welcomeA.players.length, 0);

  const b = connect('B');
  await b.opened;
  b.send({ t: 'hello', name: 'Bravo', color: 'not-a-colour', level: 999 });
  const welcomeB = await b.waitFor((m) => m.t === 'welcome', 'welcome');
  assert.equal(welcomeB.players.length, 1);
  assert.equal(welcomeB.players[0].name, 'Alphascript', 'names are sanitised');

  const join = await a.waitFor((m) => m.t === 'join', 'join');
  assert.equal(join.player.name, 'Bravo');
  assert.equal(join.player.color, '#38bdf8', 'bad colours fall back');
  assert.equal(join.player.level, 99, 'levels are clamped');

  b.send({ t: 'state', x: 5, y: 1, z: -3, r: 1.5, m: 1 });
  const moved = await a.waitFor((m) => m.t === 'player' && m.player.x === 5, 'movement');
  assert.equal(moved.player.z, -3);
  assert.equal(moved.player.m, 1);

  b.send({ t: 'chat', text: 'Kumusta!' });
  const chatA = await a.waitFor((m) => m.t === 'chat', 'chat');
  assert.equal(chatA.text, 'Kumusta!');
  assert.equal(chatA.name, 'Bravo');
  await b.waitFor((m) => m.t === 'chat', 'own chat echo');

  b.ws.close();
  const leave = await a.waitFor((m) => m.t === 'leave', 'leave');
  assert.equal(leave.name, 'Bravo');

  a.ws.close();
  console.log('multiplayer smoke test passed');
} finally {
  server.kill();
}
