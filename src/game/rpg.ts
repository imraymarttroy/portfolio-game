import { CAMPFIRE_POS, LIGHTHOUSE_POS, PAVILION_POS, SUMMIT_POS, WINDMILL_POS } from './world';
import { NPCData, ShellItem } from '../types/game';

/**
 * MMORPG-style progression: experience, levels, zones and quests.
 * Everything here is pure so it can be unit-tested without a renderer.
 */

export const XP_REWARDS = {
  meetNpc: 100,
  discussTopic: 25,
  collectCoin: 60,
  discoverZone: 40,
  completeQuest: 150,
} as const;

export const MAX_LEVEL = 10;

/** Total XP needed to reach `level` (level 1 starts at 0 XP). */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return 50 * l * (l - 1);
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  current: number;
  /** XP needed to finish the current level (0 at max level). */
  needed: number;
  /** 0..1 progress through the current level (1 at max level). */
  ratio: number;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, totalXp);
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, current: xp - xpForLevel(MAX_LEVEL), needed: 0, ratio: 1 };
  }
  const base = xpForLevel(level);
  const needed = xpForLevel(level + 1) - base;
  const current = xp - base;
  return { level, current, needed, ratio: current / needed };
}

/** Max health and energy grow a little with each level, MMO style. */
export function getMaxStats(level: number): { hp: number; energy: number } {
  return { hp: 100 + (level - 1) * 20, energy: 100 + (level - 1) * 10 };
}

export const ZONES = [
  'Village Green',
  'Family Campfire',
  'Stargazer Peak',
  'Lighthouse Pier',
  'Windmill Knoll',
  'Crystal Pavilion',
  'Sandy Shore',
] as const;
export type ZoneName = (typeof ZONES)[number];

/** Landmark zones: you're "in" one when within its radius of the landmark. */
const ZONE_AREAS: { name: ZoneName; x: number; z: number; r: number }[] = [
  { name: 'Family Campfire', x: CAMPFIRE_POS.x, z: CAMPFIRE_POS.z, r: 6 },
  { name: 'Crystal Pavilion', x: PAVILION_POS.x, z: PAVILION_POS.z, r: 8 },
  { name: 'Stargazer Peak', x: SUMMIT_POS.x, z: SUMMIT_POS.z, r: 9 },
  { name: 'Lighthouse Pier', x: LIGHTHOUSE_POS.x, z: LIGHTHOUSE_POS.z, r: 9 },
  { name: 'Windmill Knoll', x: WINDMILL_POS.x, z: WINDMILL_POS.z, r: 9 },
];

export function getZoneName(pos: { x: number; z: number }): ZoneName {
  for (const a of ZONE_AREAS) {
    if (Math.hypot(pos.x - a.x, pos.z - a.z) < a.r) return a.name;
  }
  if (Math.hypot(pos.x, pos.z) > 24) return 'Sandy Shore';
  return 'Village Green';
}

export function getTopicIds(npcs: NPCData[]): string[] {
  const ids: string[] = [];
  for (const npc of npcs) {
    for (const opt of npc.dialogue.options) {
      if (opt.topicId) ids.push(`${npc.id}:${opt.topicId}`);
    }
  }
  return ids;
}

export interface ProgressSnapshot {
  visitedNpcs: Set<string>;
  collectedShells: Set<string>;
  discussedTopics: Set<string>;
  discoveredZones: Set<string>;
}

export interface QuestStatus {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  goal: number;
  complete: boolean;
  /** Short objective lines with their own done-state, for the tracker. */
  objectives: { label: string; done: boolean }[];
}

export function getQuests(
  progress: ProgressSnapshot,
  npcs: NPCData[],
  shells: ShellItem[]
): QuestStatus[] {
  const topicIds = getTopicIds(npcs);
  const make = (
    id: string,
    title: string,
    icon: string,
    description: string,
    objectives: { label: string; done: boolean }[]
  ): QuestStatus => {
    const done = objectives.filter((o) => o.done).length;
    return {
      id,
      title,
      icon,
      description,
      progress: done,
      goal: objectives.length,
      complete: objectives.length > 0 && done === objectives.length,
      objectives,
    };
  };

  return [
    make(
      'meet_family',
      'Gather Round the Campfire',
      '🔥',
      'Introduce yourself to every villager sitting around the Family Campfire.',
      npcs.map((n) => ({ label: `Talk to ${n.name}`, done: progress.visitedNpcs.has(n.id) }))
    ),
    make(
      'coin_hunter',
      'Coins of the Island',
      '🪙',
      'Find the hidden peso coins scattered across the island. Each one holds a piece of the story.',
      shells.map((s) => ({ label: s.name, done: progress.collectedShells.has(s.id) }))
    ),
    make(
      'cartographer',
      'Island Cartographer',
      '🗺️',
      'Set foot in every region of the island.',
      ZONES.map((z) => ({ label: `Discover ${z}`, done: progress.discoveredZones.has(z) }))
    ),
    make(
      'scholar',
      'Portfolio Scholar',
      '📜',
      'Ask the villagers about every part of Raymart’s work.',
      topicIds.map((t) => {
        const [npcId] = t.split(':');
        const npc = npcs.find((n) => n.id === npcId);
        const opt = npc?.dialogue.options.find((o) => `${npcId}:${o.topicId}` === t);
        return { label: `${npc?.name ?? npcId}: ${opt?.text ?? t}`, done: progress.discussedTopics.has(t) };
      })
    ),
  ];
}

/** XP from progress alone, so a saved game can always rebuild its total. */
export function computeTotalXp(
  progress: ProgressSnapshot,
  npcs: NPCData[],
  shells: ShellItem[]
): number {
  const completed = getQuests(progress, npcs, shells).filter((q) => q.complete).length;
  return (
    progress.visitedNpcs.size * XP_REWARDS.meetNpc +
    progress.discussedTopics.size * XP_REWARDS.discussTopic +
    progress.collectedShells.size * XP_REWARDS.collectCoin +
    progress.discoveredZones.size * XP_REWARDS.discoverZone +
    completed * XP_REWARDS.completeQuest
  );
}

// ---------------------------------------------------------------------------
// Save game (localStorage). Wrapped in try/catch: storage can be unavailable.
// ---------------------------------------------------------------------------

const SAVE_KEY = 'rt-adventures-save-v1';

export interface SaveData {
  playerName: string;
  playerColor: string;
  visitedNpcs: string[];
  collectedShells: string[];
  discussedTopics: string[];
  discoveredZones: string[];
}

export function loadSave(): SaveData | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData>;
    const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
    return {
      playerName: typeof data.playerName === 'string' ? sanitizeName(data.playerName) : '',
      playerColor:
        typeof data.playerColor === 'string' && /^#[0-9a-f]{6}$/i.test(data.playerColor) ? data.playerColor : '',
      visitedNpcs: arr(data.visitedNpcs),
      collectedShells: arr(data.collectedShells),
      discussedTopics: arr(data.discussedTopics),
      discoveredZones: arr(data.discoveredZones),
    };
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: progress just won't persist.
  }
}

export function clearSave(): void {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** Cleans a display name typed by the player. */
export function sanitizeName(name: string): string {
  return name.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 16);
}

export function randomAdventurerName(): string {
  const first = ['Brave', 'Swift', 'Lucky', 'Sunny', 'Kind', 'Bold', 'Merry', 'Clever'];
  const second = ['Tarsier', 'Carabao', 'Mango', 'Banca', 'Agila', 'Sampaguita', 'Jeepney', 'Bituin'];
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
  return `${pick(first)}${pick(second)}`;
}
