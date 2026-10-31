/**
 * Tiny WebSocket client for the island's multiplayer server (see /server).
 *
 * The game is fully playable without it: when VITE_MULTIPLAYER_URL is not set
 * at build time, or the server can't be reached, the status stays
 * 'disabled' / 'offline' and the HUD simply shows a solo adventure.
 */

export type NetStatus = 'disabled' | 'connecting' | 'online' | 'offline';

export interface NetPlayer {
  id: string;
  name: string;
  color: string;
  level: number;
  x: number;
  y: number;
  z: number;
  r: number;
  moving: boolean;
}

export interface NetChat {
  id: string;
  name: string;
  text: string;
}

export interface MultiplayerEvents {
  onStatus: (status: NetStatus) => void;
  onWelcome: (selfId: string, players: NetPlayer[]) => void;
  onPlayerJoin: (player: NetPlayer) => void;
  onPlayerLeave: (id: string, name: string) => void;
  onPlayerUpdate: (player: NetPlayer) => void;
  onChat: (chat: NetChat) => void;
}

export interface LocalProfile {
  name: string;
  color: string;
  level: number;
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
export const MULTIPLAYER_URL: string = (env.VITE_MULTIPLAYER_URL ?? '').trim();

/** Colours handed out to adventurers; picked once and remembered. */
export const ADVENTURER_COLORS = ['#38bdf8', '#f472b6', '#a78bfa', '#34d399', '#fb923c', '#facc15', '#f87171', '#2dd4bf'];

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private events: MultiplayerEvents;
  private profile: LocalProfile;
  private status: NetStatus = 'disabled';
  private retryMs = 1500;
  private retryTimer = 0;
  private closedByUser = false;
  private lastSentState = '';

  constructor(profile: LocalProfile, events: MultiplayerEvents) {
    this.profile = profile;
    this.events = events;
  }

  get enabled(): boolean {
    return MULTIPLAYER_URL.length > 0;
  }

  connect() {
    if (!this.enabled) {
      this.setStatus('disabled');
      return;
    }
    this.closedByUser = false;
    this.open();
  }

  disconnect() {
    this.closedByUser = true;
    window.clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
    this.setStatus(this.enabled ? 'offline' : 'disabled');
  }

  updateProfile(profile: LocalProfile) {
    this.profile = profile;
    this.send({ t: 'profile', name: profile.name, color: profile.color, level: profile.level });
  }

  sendState(s: { x: number; y: number; z: number; r: number; moving: boolean }) {
    const msg = {
      t: 'state',
      x: round(s.x),
      y: round(s.y),
      z: round(s.z),
      r: round(s.r),
      m: s.moving ? 1 : 0,
    };
    const key = `${msg.x},${msg.y},${msg.z},${msg.r},${msg.m}`;
    if (key === this.lastSentState) return; // standing still: nothing new to say
    this.lastSentState = key;
    this.send(msg);
  }

  sendChat(text: string) {
    this.send({ t: 'chat', text: text.slice(0, 140) });
  }

  private open() {
    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(MULTIPLAYER_URL);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.retryMs = 1500;
      this.lastSentState = '';
      this.setStatus('online');
      this.send({ t: 'hello', name: this.profile.name, color: this.profile.color, level: this.profile.level });
    };
    ws.onmessage = (ev) => this.handle(ev.data);
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (!this.closedByUser) this.scheduleRetry();
    };
    ws.onerror = () => ws.close();
  }

  private scheduleRetry() {
    this.setStatus('offline');
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => this.open(), this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, 30000);
  }

  private handle(raw: unknown) {
    if (typeof raw !== 'string') return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.t) {
      case 'welcome': {
        const players = Array.isArray(msg.players) ? msg.players.map(toPlayer).filter(isPlayer) : [];
        this.events.onWelcome(String(msg.id), players);
        break;
      }
      case 'join': {
        const p = toPlayer(msg.player);
        if (p) this.events.onPlayerJoin(p);
        break;
      }
      case 'leave':
        this.events.onPlayerLeave(String(msg.id), String(msg.name ?? 'Someone'));
        break;
      case 'player': {
        const p = toPlayer(msg.player);
        if (p) this.events.onPlayerUpdate(p);
        break;
      }
      case 'chat':
        this.events.onChat({ id: String(msg.id), name: String(msg.name), text: String(msg.text) });
        break;
    }
  }

  private send(msg: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private setStatus(s: NetStatus) {
    if (s === this.status) return;
    this.status = s;
    this.events.onStatus(s);
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function toPlayer(v: unknown): NetPlayer | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  if (typeof o.id !== 'string') return null;
  return {
    id: o.id,
    name: typeof o.name === 'string' ? o.name : 'Adventurer',
    color: typeof o.color === 'string' && /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : '#38bdf8',
    level: Math.max(1, Math.min(99, Math.floor(num(o.level)) || 1)),
    x: num(o.x),
    y: num(o.y),
    z: num(o.z),
    r: num(o.r),
    moving: o.m === 1 || o.m === true,
  };
}

function isPlayer(p: NetPlayer | null): p is NetPlayer {
  return p !== null;
}
