// Raymart Troy Adventures — realtime multiplayer server.
//
// Relays positions and chat between everyone exploring the island.
// It keeps no database: players exist only while connected.
//
//   npm install && npm start          (listens on $PORT, default 8787)
//
// Environment:
//   PORT             port to listen on (hosting providers usually set this)
//   ALLOWED_ORIGINS  comma-separated list of sites allowed to connect,
//                    e.g. "https://imraymarttroy.online". Empty = allow all.
//   MAX_PLAYERS      connection cap (default 100)

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 8787;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 100;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const WORLD_LIMIT = 200; // generous bound on coordinates
const STATE_MIN_INTERVAL_MS = 45; // ~20 updates per second max
const CHAT_MIN_INTERVAL_MS = 800;
const CHAT_MAX_LEN = 140;
const MAX_MESSAGE_BYTES = 1024;

/** @type {Map<string, {ws: import('ws').WebSocket, id: string, name: string, color: string, level: number, x: number, y: number, z: number, r: number, m: number, lastState: number, lastChat: number, alive: boolean, ready: boolean}>} */
const players = new Map();

const server = http.createServer((req, res) => {
  // Health check / status page for the hosting provider.
  res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify({ ok: true, online: [...players.values()].filter((p) => p.ready).length }));
});

const wss = new WebSocketServer({
  server,
  maxPayload: MAX_MESSAGE_BYTES,
  verifyClient: ({ origin }, done) => {
    if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) return done(false, 403, 'Origin not allowed');
    if (players.size >= MAX_PLAYERS) return done(false, 503, 'Island is full');
    done(true);
  },
});

const cleanName = (v) =>
  String(v ?? '')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .trim()
    .slice(0, 16) || 'Adventurer';
const cleanColor = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#38bdf8');
const cleanLevel = (v) => Math.max(1, Math.min(99, Math.floor(Number(v)) || 1));
const cleanCoord = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, Math.round(n * 100) / 100)) : 0;
};
const cleanText = (v) =>
  String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, CHAT_MAX_LEN);

const publicView = (p) => ({ id: p.id, name: p.name, color: p.color, level: p.level, x: p.x, y: p.y, z: p.z, r: p.r, m: p.m });

function broadcast(msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p.ready && p.id !== exceptId && p.ws.readyState === p.ws.OPEN) p.ws.send(data);
  }
}

wss.on('connection', (ws) => {
  const id = randomUUID().slice(0, 8);
  const player = {
    ws, id, name: 'Adventurer', color: '#38bdf8', level: 1,
    x: 0, y: 0.5, z: 8, r: 0, m: 0,
    lastState: 0, lastChat: 0, alive: true, ready: false,
  };
  players.set(id, player);

  ws.on('pong', () => (player.alive = true));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;
    const now = Date.now();

    switch (msg.t) {
      case 'hello': {
        if (player.ready) return;
        player.name = cleanName(msg.name);
        player.color = cleanColor(msg.color);
        player.level = cleanLevel(msg.level);
        player.ready = true;
        const others = [...players.values()].filter((p) => p.ready && p.id !== id).map(publicView);
        ws.send(JSON.stringify({ t: 'welcome', id, players: others }));
        broadcast({ t: 'join', player: publicView(player) }, id);
        break;
      }
      case 'profile': {
        if (!player.ready) return;
        player.name = cleanName(msg.name);
        player.color = cleanColor(msg.color);
        player.level = cleanLevel(msg.level);
        broadcast({ t: 'player', player: publicView(player) }, id);
        break;
      }
      case 'state': {
        if (!player.ready || now - player.lastState < STATE_MIN_INTERVAL_MS) return;
        player.lastState = now;
        player.x = cleanCoord(msg.x);
        player.y = cleanCoord(msg.y);
        player.z = cleanCoord(msg.z);
        player.r = cleanCoord(msg.r);
        player.m = msg.m ? 1 : 0;
        broadcast({ t: 'player', player: publicView(player) }, id);
        break;
      }
      case 'chat': {
        if (!player.ready || now - player.lastChat < CHAT_MIN_INTERVAL_MS) return;
        const text = cleanText(msg.text);
        if (!text) return;
        player.lastChat = now;
        // Echo to everyone, including the sender, so all logs agree.
        broadcast({ t: 'chat', id, name: player.name, text });
        break;
      }
    }
  });

  ws.on('close', () => {
    players.delete(id);
    if (player.ready) broadcast({ t: 'leave', id, name: player.name });
  });
});

// Drop connections that stopped answering pings (closed laptops, lost signal).
const heartbeat = setInterval(() => {
  for (const p of players.values()) {
    if (!p.alive) {
      p.ws.terminate();
      continue;
    }
    p.alive = false;
    p.ws.ping();
  }
}, 15000);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => {
  console.log(`Island multiplayer server listening on :${PORT}`);
});
