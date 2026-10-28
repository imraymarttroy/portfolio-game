import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSurfaceHeight,
  getTrees,
  isOnPier,
  npcColliders,
  PLAYER_RADIUS,
  resolveCollisions,
  STATIC_COLLIDERS,
  stepPlayer,
} from './world';
import { getTerrainHeight } from './logic';
import { ISLAND_NPCS } from '../data/portfolioData';

const ALL = [...STATIC_COLLIDERS, ...npcColliders(ISLAND_NPCS)];

test('player cannot walk through a tree', () => {
  const tree = STATIC_COLLIDERS.find((c) => c.tag === 'tree')!;
  let x = tree.ax - 4;
  const z = tree.az;
  for (let i = 0; i < 120; i++) {
    const r = stepPlayer(x, z, 7.2 * 0.016, 0, [tree]);
    x = r.x;
    const gap = Math.hypot(x - tree.ax, r.z - tree.az);
    assert.ok(gap >= tree.radius + PLAYER_RADIUS - 1e-3, `penetrated tree: gap ${gap}`);
  }
});

test('player slides along a tree instead of sticking to it', () => {
  const tree = STATIC_COLLIDERS.find((c) => c.tag === 'tree')!;
  // Aim slightly off-centre: the player should end up past the trunk.
  let x = tree.ax - 4;
  let z = tree.az + 0.3;
  for (let i = 0; i < 200; i++) {
    const r = stepPlayer(x, z, 7.2 * 0.016, 0, [tree]);
    x = r.x;
    z = r.z;
  }
  assert.ok(x > tree.ax + 1, 'player should have slid around the tree');
});

test('jumping clears low obstacles but not trees', () => {
  const bush = STATIC_COLLIDERS.find((c) => c.tag === 'bush')!;
  const tree = STATIC_COLLIDERS.find((c) => c.tag === 'tree')!;
  assert.equal(resolveCollisions(bush.ax, bush.az, [bush], PLAYER_RADIUS, 0).hit, true);
  assert.equal(resolveCollisions(bush.ax, bush.az, [bush], PLAYER_RADIUS, 0.8).hit, false);
  assert.equal(resolveCollisions(tree.ax + 0.5, tree.az, [tree], PLAYER_RADIUS, 2.5).hit, true);
});

test('villagers stand clear of buildings and trees', () => {
  for (const npc of ISLAND_NPCS) {
    const r = resolveCollisions(npc.position[0], npc.position[2], STATIC_COLLIDERS, 0.55);
    assert.equal(r.hit, false, `${npc.id} is inside scenery`);
  }
});

test('spawn point is free of obstacles', () => {
  assert.equal(resolveCollisions(0, 8, ALL).hit, false);
});

test('pier and pavilion deck raise the floor above the terrain', () => {
  assert.ok(isOnPier(-18, 23));
  assert.ok(getSurfaceHeight(-18.5, 25) >= 0.4);
  assert.ok(getSurfaceHeight(-12, -14) > getTerrainHeight(-12, -14));
});

test('every planted tree has a matching collider', () => {
  assert.equal(STATIC_COLLIDERS.filter((c) => c.tag === 'tree').length, getTrees().length);
});
