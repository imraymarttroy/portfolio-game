import { getTerrainHeight, ISLAND_RADIUS } from './logic';

/**
 * Island world layout + lightweight character physics.
 *
 * Everything solid on the island is described here as a capsule on the
 * ground plane (a segment with a radius; a circle is a segment of length 0).
 * The scene builds its meshes from the same data, so what you see is what
 * you bump into.
 */

export interface Collider {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  radius: number;
  /** Height above the ground at the player's feet. Jump higher than this to clear it. */
  height: number;
  tag: string;
}

export const PLAYER_RADIUS = 0.45;
const WALL = 99;

const circle = (x: number, z: number, radius: number, height: number, tag: string): Collider => ({
  ax: x, az: z, bx: x, bz: z, radius, height, tag,
});

const capsule = (
  ax: number, az: number, bx: number, bz: number, radius: number, height: number, tag: string
): Collider => ({ ax, az, bx, bz, radius, height, tag });

// ---------------------------------------------------------------------------
// Landmarks (positions shared with IslandScene)
// ---------------------------------------------------------------------------

export const LIGHTHOUSE_POS = { x: -18, z: 19 };
export const WINDMILL_POS = { x: 18, z: 12 };
export const PAVILION_POS = { x: -14, z: -14 };
/** Family campfire in the middle of the island. */
export const CAMPFIRE_POS = { x: 0, z: 1 };
/** Distance from the fire to where each family member sits. */
export const CAMPFIRE_SEAT_RADIUS = 3.2;
/** Summit lookout with the telescope (where the old campfire used to be). */
export const SUMMIT_POS = { x: 0, z: -20 };

/**
 * A seat around the family campfire. Angle 0 points toward the player's spawn
 * (+z), which is left open so Raymart can walk in and join. Returns the seat
 * position and the rotation that makes a character face the fire.
 */
export function campfireSeat(angleDeg: number): { x: number; z: number; rotation: number } {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: CAMPFIRE_POS.x + Math.sin(a) * CAMPFIRE_SEAT_RADIUS,
    z: CAMPFIRE_POS.z + Math.cos(a) * CAMPFIRE_SEAT_RADIUS,
    rotation: a + Math.PI,
  };
}

export const PAVILION_DECK_RADIUS = 4.3;
export const PAVILION_DECK_TOP = 0.35;
export const PAVILION_POST_RADIUS = 3.4;

/** Pier runs from its landward end out to sea; planks are 2.4 wide. */
export const PIER = {
  startX: -16,
  startZ: 18,
  stepX: -0.3,
  stepZ: 0.75,
  planks: 12,
  halfWidth: 1.2,
  deckTop: 0.4,
};
const PIER_END = {
  x: PIER.startX + PIER.stepX * (PIER.planks - 1),
  z: PIER.startZ + PIER.stepZ * (PIER.planks - 1),
};

// ---------------------------------------------------------------------------
// Foliage layout
// ---------------------------------------------------------------------------

export interface BushSpot { x: number; z: number; y: number }

export function getBushes(): BushSpot[] {
  const bushes: BushSpot[] = [];
  for (let i = 0; i < 18; i++) {
    const angle = (i * Math.PI) / 9;
    const r = 9 + ((i * 11) % 12);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = getTerrainHeight(x, z);
    if (y < 0.2) continue;
    bushes.push({ x, z, y });
  }
  return bushes;
}

// ---------------------------------------------------------------------------
// Static colliders
// ---------------------------------------------------------------------------

function buildStaticColliders(): Collider[] {
  const list: Collider[] = [];

  // Bushes: low enough to hop over.
  for (const b of getBushes()) {
    list.push(circle(b.x, b.z, 0.6, 0.5, 'bush'));
  }

  // Lighthouse stone foundation.
  list.push(circle(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.z, 4.0, WALL, 'lighthouse'));

  // Windmill stone base.
  list.push(circle(WINDMILL_POS.x, WINDMILL_POS.z, 3.7, WALL, 'windmill'));

  // Pavilion: six posts around the deck and the cafe counter in the middle.
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    list.push(
      circle(
        PAVILION_POS.x + Math.cos(angle) * PAVILION_POST_RADIUS,
        PAVILION_POS.z + Math.sin(angle) * PAVILION_POST_RADIUS,
        0.2,
        WALL,
        'pavilion-post'
      )
    );
  }
  list.push(capsule(PAVILION_POS.x - 0.8, PAVILION_POS.z, PAVILION_POS.x + 0.8, PAVILION_POS.z, 0.42, 1.1, 'counter'));

  // Family campfire in the middle of the island (the family's seats are NPC colliders).
  list.push(circle(CAMPFIRE_POS.x, CAMPFIRE_POS.z, 1.15, 0.7, 'campfire'));

  // Summit lookout telescope.
  list.push(circle(SUMMIT_POS.x + 2.2, SUMMIT_POS.z - 0.8, 0.35, WALL, 'telescope'));

  // Pier pilings stick up only under the deck, so they don't block walking.
  return list;
}

export const STATIC_COLLIDERS: Collider[] = buildStaticColliders();

export const NPC_RADIUS = 0.55;
export const NPC_HEIGHT = 2.0;

export function npcColliders(npcs: { id: string; position: [number, number, number] }[]): Collider[] {
  return npcs.map((n) => circle(n.position[0], n.position[2], NPC_RADIUS, NPC_HEIGHT, `npc:${n.id}`));
}

// ---------------------------------------------------------------------------
// Walkable surfaces
// ---------------------------------------------------------------------------

function closestOnSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  let t = lenSq > 0 ? ((px - ax) * abx + (pz - az) * abz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + abx * t, z: az + abz * t, t };
}

/** Is (x, z) on the pier deck? */
export function isOnPier(x: number, z: number): boolean {
  // Extend half a plank past both ends so the deck edges count.
  const ex = PIER.stepX * 0.5;
  const ez = PIER.stepZ * 0.5;
  const c = closestOnSegment(x, z, PIER.startX - ex, PIER.startZ - ez, PIER_END.x + ex, PIER_END.z + ez);
  const dx = x - c.x;
  const dz = z - c.z;
  return dx * dx + dz * dz <= PIER.halfWidth * PIER.halfWidth;
}

const PAVILION_DECK_Y = getTerrainHeight(PAVILION_POS.x, PAVILION_POS.z) + PAVILION_DECK_TOP;

/** Height the player stands at: terrain, or a deck built on top of it. */
export function getSurfaceHeight(x: number, z: number): number {
  let h = getTerrainHeight(x, z);

  const pdx = x - PAVILION_POS.x;
  const pdz = z - PAVILION_POS.z;
  if (pdx * pdx + pdz * pdz <= PAVILION_DECK_RADIUS * PAVILION_DECK_RADIUS) {
    h = Math.max(h, PAVILION_DECK_Y);
  }

  if (isOnPier(x, z)) {
    h = Math.max(h, PIER.deckTop);
  }

  return h;
}

/** Can the player stand here at all (island or pier)? */
export function isWalkable(x: number, z: number, maxRadius: number = ISLAND_RADIUS - 1.5): boolean {
  return x * x + z * z <= maxRadius * maxRadius || isOnPier(x, z);
}

// ---------------------------------------------------------------------------
// Movement resolution
// ---------------------------------------------------------------------------

/**
 * Pushes a circle of `radius` at (x, z) out of every collider it overlaps.
 * Pushing along the contact normal is what makes the player slide along
 * trunks and walls instead of sticking to them.
 *
 * `heightAboveGround` lets a jumping player clear low obstacles.
 */
export function resolveCollisions(
  x: number,
  z: number,
  colliders: Collider[],
  radius: number = PLAYER_RADIUS,
  heightAboveGround: number = 0,
  iterations: number = 4
): { x: number; z: number; hit: boolean } {
  let hit = false;

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;

    for (const c of colliders) {
      if (heightAboveGround >= c.height) continue;

      const p = closestOnSegment(x, z, c.ax, c.az, c.bx, c.bz);
      let dx = x - p.x;
      let dz = z - p.z;
      const minDist = c.radius + radius;
      const distSq = dx * dx + dz * dz;
      if (distSq >= minDist * minDist) continue;

      const dist = Math.sqrt(distSq);
      if (dist < 1e-6) {
        // Exactly on the collider's axis: push toward the island centre.
        const len = Math.hypot(x, z);
        dx = len > 1e-6 ? -x / len : 1;
        dz = len > 1e-6 ? -z / len : 0;
        x = p.x + dx * minDist;
        z = p.z + dz * minDist;
      } else {
        const push = minDist - dist;
        x += (dx / dist) * push;
        z += (dz / dist) * push;
      }
      moved = true;
      hit = true;
    }

    if (!moved) break;
  }

  return { x, z, hit };
}

/**
 * One step of player movement: apply the desired displacement, keep the
 * player on land (or the pier), and slide around anything solid.
 */
export function stepPlayer(
  fromX: number,
  fromZ: number,
  dx: number,
  dz: number,
  colliders: Collider[],
  heightAboveGround: number = 0,
  maxRadius: number = ISLAND_RADIUS - 1.5
): { x: number; z: number; hit: boolean } {
  // Sub-step fast moves so a big frame can't tunnel through a thin post.
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(dist / (PLAYER_RADIUS * 0.5)));
  let x = fromX;
  let z = fromZ;
  let hit = false;

  for (let s = 0; s < steps; s++) {
    let nx = x + dx / steps;
    let nz = z + dz / steps;

    if (!isWalkable(nx, nz, maxRadius)) {
      if (isOnPier(x, z)) {
        // Walking off the side of the pier: try each axis so we slide along it.
        if (isWalkable(nx, z, maxRadius)) nz = z;
        else if (isWalkable(x, nz, maxRadius)) nx = x;
        else { nx = x; nz = z; }
      } else {
        // Shoreline: clamp to the island edge (this also slides along it).
        const r = Math.hypot(nx, nz);
        nx = (nx / r) * maxRadius;
        nz = (nz / r) * maxRadius;
      }
      hit = true;
    }

    const res = resolveCollisions(nx, nz, colliders, PLAYER_RADIUS, heightAboveGround);
    hit = hit || res.hit;

    // If pushing out of an obstacle would shove us into the sea, stay put.
    if (!isWalkable(res.x, res.z, maxRadius + 0.01)) {
      break;
    }
    x = res.x;
    z = res.z;
  }

  return { x, z, hit };
}
