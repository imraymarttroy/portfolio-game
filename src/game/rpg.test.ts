import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTotalXp,
  getLevelInfo,
  getQuests,
  getTopicIds,
  getZoneName,
  MAX_LEVEL,
  sanitizeName,
  XP_REWARDS,
  xpForLevel,
  ZONES,
} from './rpg';
import { ISLAND_NPCS, ISLAND_SHELLS } from '../data/portfolioData';

const empty = () => ({
  visitedNpcs: new Set<string>(),
  collectedShells: new Set<string>(),
  discussedTopics: new Set<string>(),
  discoveredZones: new Set<string>(),
});

test('level curve starts at level 1 and rises with XP', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(getLevelInfo(0).level, 1);
  assert.equal(getLevelInfo(xpForLevel(2) - 1).level, 1);
  assert.equal(getLevelInfo(xpForLevel(2)).level, 2);
  assert.equal(getLevelInfo(999999).level, MAX_LEVEL);
  assert.equal(getLevelInfo(999999).ratio, 1);
  const mid = getLevelInfo(xpForLevel(3) + 50);
  assert.equal(mid.level, 3);
  assert.equal(mid.current, 50);
  assert.ok(mid.ratio > 0 && mid.ratio < 1);
});

test('zones match the island landmarks', () => {
  assert.equal(getZoneName({ x: 0, z: 1 }), 'Family Campfire');
  assert.equal(getZoneName({ x: 0, z: -20 }), 'Stargazer Peak');
  assert.equal(getZoneName({ x: -18, z: 19 }), 'Lighthouse Pier');
  assert.equal(getZoneName({ x: 18, z: 12 }), 'Windmill Knoll');
  assert.equal(getZoneName({ x: -14, z: -14 }), 'Crystal Pavilion');
  assert.equal(getZoneName({ x: 10, z: -5 }), 'Village Green');
  assert.equal(getZoneName({ x: 26, z: -6 }), 'Sandy Shore');
});

test('quests track progress and complete', () => {
  const p = empty();
  let quests = getQuests(p, ISLAND_NPCS, ISLAND_SHELLS);
  assert.equal(quests.length, 4);
  assert.ok(quests.every((q) => !q.complete));

  ISLAND_NPCS.forEach((n) => p.visitedNpcs.add(n.id));
  ZONES.forEach((z) => p.discoveredZones.add(z));
  quests = getQuests(p, ISLAND_NPCS, ISLAND_SHELLS);
  assert.ok(quests.find((q) => q.id === 'meet_family')!.complete);
  assert.ok(quests.find((q) => q.id === 'cartographer')!.complete);
  assert.ok(!quests.find((q) => q.id === 'coin_hunter')!.complete);
});

test('total XP is rebuilt from progress, including quest bonuses', () => {
  const p = empty();
  assert.equal(computeTotalXp(p, ISLAND_NPCS, ISLAND_SHELLS), 0);
  p.collectedShells.add(ISLAND_SHELLS[0].id);
  assert.equal(computeTotalXp(p, ISLAND_NPCS, ISLAND_SHELLS), XP_REWARDS.collectCoin);

  ISLAND_SHELLS.forEach((s) => p.collectedShells.add(s.id));
  assert.equal(
    computeTotalXp(p, ISLAND_NPCS, ISLAND_SHELLS),
    ISLAND_SHELLS.length * XP_REWARDS.collectCoin + XP_REWARDS.completeQuest
  );
});

test('finishing everything reaches a satisfying level', () => {
  const p = empty();
  ISLAND_NPCS.forEach((n) => p.visitedNpcs.add(n.id));
  ISLAND_SHELLS.forEach((s) => p.collectedShells.add(s.id));
  ZONES.forEach((z) => p.discoveredZones.add(z));
  getTopicIds(ISLAND_NPCS).forEach((t) => p.discussedTopics.add(t));
  const level = getLevelInfo(computeTotalXp(p, ISLAND_NPCS, ISLAND_SHELLS)).level;
  assert.ok(level >= 6, `expected level 6+, got ${level}`);
});

test('sanitizeName keeps names short and safe', () => {
  assert.equal(sanitizeName('  Juan <script> '), 'Juan script');
  assert.equal(sanitizeName('A'.repeat(40)).length, 16);
  assert.equal(sanitizeName('Niño_23'), 'Niño_23');
});
