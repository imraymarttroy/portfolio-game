import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distance2D,
  distance3D,
  clampToIsland,
  canInteractWithNpc,
  findClosestNpc,
  checkShellCollisions,
  calculatePortfolioProgress,
  getCompletionTitle,
  formatDuration,
  getTerrainHeight,
} from './logic';
import { NPCData, ShellItem } from '../types/game';

test('distance2D computes flat plane distances accurately', () => {
  assert.equal(distance2D(0, 0, 3, 4), 5);
  assert.equal(distance2D(10, 10, 10, 10), 0);
  assert.ok(Math.abs(distance2D(-2, -2, 2, 2) - 5.6568) < 0.001);
});

test('distance3D calculates Euclidean spatial distance', () => {
  assert.equal(distance3D(0, 0, 0, 1, 2, 2), 3);
  assert.equal(distance3D(5, 5, 5, 5, 5, 5), 0);
});

test('getTerrainHeight returns valid elevation and stays above water on island', () => {
  const centerH = getTerrainHeight(0, 0);
  assert.ok(centerH > 0.4, 'Center island should have good positive elevation');

  const peakH = getTerrainHeight(0, -20);
  assert.ok(peakH > 4.0, 'Stargazer peak should be elevated above 4m');

  const beachH = getTerrainHeight(26, 0);
  assert.ok(beachH >= 0.05 && beachH < 1.0, 'Beach slope should be near sea level');
});

test('clampToIsland limits coordinates within max radius', () => {
  const inside = clampToIsland(10, 10, 30);
  assert.equal(inside.x, 10);
  assert.equal(inside.z, 10);

  const outside = clampToIsland(40, 0, 30);
  assert.equal(outside.x, 30);
  assert.equal(outside.z, 0);
});

test('canInteractWithNpc evaluates distance threshold correctly', () => {
  const player = { x: 5, y: 1, z: 5 };
  const npcClose: [number, number, number] = [6, 1, 6];
  const npcFar: [number, number, number] = [15, 1, 15];

  assert.equal(canInteractWithNpc(player, npcClose, 3.0), true);
  assert.equal(canInteractWithNpc(player, npcFar, 3.0), false);
});

test('findClosestNpc picks the nearest NPC within range', () => {
  const dummyNpcs: Partial<NPCData>[] = [
    { id: 'npc1', name: 'Npc 1', position: [10, 0, 10] },
    { id: 'npc2', name: 'Npc 2', position: [2, 0, 2] },
    { id: 'npc3', name: 'Npc 3', position: [20, 0, 20] },
  ];

  const player = { x: 1, y: 0, z: 1 };
  const found = findClosestNpc(player, dummyNpcs as NPCData[], 4.0);
  assert.equal(found?.id, 'npc2');
});

test('checkShellCollisions detects pickup when player is close', () => {
  const shells: Partial<ShellItem>[] = [
    { id: 's1', position: [5, 1, 5] },
    { id: 's2', position: [10, 1, 10] },
  ];

  const collected = new Set<string>();
  const player = { x: 5.2, y: 1.1, z: 5.1 };

  const picked = checkShellCollisions(player, shells as ShellItem[], collected, 1.5);
  assert.equal(picked, 's1');

  collected.add('s1');
  const pickedAgain = checkShellCollisions(player, shells as ShellItem[], collected, 1.5);
  assert.equal(pickedAgain, null);
});

test('calculatePortfolioProgress handles intermediate and completed states', () => {
  const start = calculatePortfolioProgress(0, 0, 5, 8);
  assert.equal(start.percentage, 0);
  assert.equal(start.isComplete, false);

  const halfNpcs = calculatePortfolioProgress(5, 0, 5, 8);
  assert.equal(halfNpcs.npcPercent, 100);
  assert.equal(halfNpcs.percentage, 65);

  const full = calculatePortfolioProgress(5, 8, 5, 8);
  assert.equal(full.percentage, 100);
  assert.equal(full.isComplete, true);
});

test('getCompletionTitle returns appropriate ranks', () => {
  assert.equal(getCompletionTitle(0, 5, 0, 8), '🌱 New Arrival');
  assert.equal(getCompletionTitle(1, 5, 0, 8), '🌿 Curious Wanderer');
  assert.equal(getCompletionTitle(3, 5, 4, 8), '⛵ Seasoned Explorer');
  assert.equal(getCompletionTitle(5, 5, 2, 8), '🧭 Island Ambassador & Portfolio Scholar');
  assert.equal(getCompletionTitle(5, 5, 8, 8), '🌟 Master Islander & Chief Architect');
});

test('formatDuration formats mm:ss accurately', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(65), '01:05');
  assert.equal(formatDuration(600), '10:00');
});
