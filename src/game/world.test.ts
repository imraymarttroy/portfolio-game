import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSurfaceHeight,
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

// A tall post (like the lighthouse base) the player must walk around, not through.
const POST = { ax: 0, az: 0, bx: 0, bz: 0, radius: 1, height: 99, tag: 'post' };

test('player cannot walk through a tall obstacle', () => {
  let x = POST.ax - 4;
  const z = POST.az;
  for (let i = 0; i < 120; i++) {
    const r = stepPlayer(x, z, 7.2 * 0.016, 0, [POST]);
    x = r.x;
    const gap = Math.hypot(x - POST.ax, r.z - POST.az);
    assert.ok(gap >= POST.radius + PLAYER_RADIUS - 1e-3, `penetrated post: gap ${gap}`);
  }
});

test('player slides along a tall obstacle instead of sticking to it', () => {
  // Aim slightly off-centre: the player should end up past the post.
  let x = POST.ax - 4;
  let z = POST.az + 0.3;
  for (let i = 0; i < 200; i++) {
    const r = stepPlayer(x, z, 7.2 * 0.016, 0, [POST]);
    x = r.x;
    z = r.z;
  }
  assert.ok(x > POST.ax + 1, 'player should have slid around the post');
});

test('jumping clears low obstacles but not tall ones', () => {
  const bush = STATIC_COLLIDERS.find((c) => c.tag === 'bush')!;
  assert.equal(resolveCollisions(bush.ax, bush.az, [bush], PLAYER_RADIUS, 0).hit, true);
  assert.equal(resolveCollisions(bush.ax, bush.az, [bush], PLAYER_RADIUS, 0.8).hit, false);
  assert.equal(resolveCollisions(POST.ax + 0.5, POST.az, [POST], PLAYER_RADIUS, 2.5).hit, true);
});

test('villagers stand clear of buildings', () => {
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
