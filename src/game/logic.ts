import { NPCData, ShellItem, Vector3D } from '../types/game';

export const ISLAND_RADIUS = 32;

/**
 * Calculates 2D Euclidean distance on the X-Z ground plane.
 */
export function distance2D(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x1 - x2;
  const dz = z1 - z2;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculates 3D Euclidean distance.
 */
export function distance3D(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dz = z1 - z2;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Procedural mathematical terrain height formula.
 * Creates an organic island with:
 * - Sandy beaches at y ~ 0.0 to 0.2 at r ~ 22-30
 * - Village center plateau at y ~ 0.5 to 1.0
 * - Windmill knoll in the east at y ~ 1.2
 * - High scenic stargazer peak in the north at y ~ 4.5
 * - Ocean dropping off smoothly past radius 30
 */
export function getTerrainHeight(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);
  if (dist > 33) return -0.4;

  // Stargazer peak (North, centered around x=0, z=-20)
  const peakDist = Math.sqrt(x * x + (z + 20) * (z + 20));
  const peakHeight = Math.max(0, 4.8 * Math.exp(-(peakDist * peakDist) / 50));

  // Windmill knoll (East, centered around x=18, z=12)
  const knollDist = Math.sqrt((x - 18) * (x - 18) + (z - 12) * (z - 12));
  const knollHeight = Math.max(0, 1.3 * Math.exp(-(knollDist * knollDist) / 45));

  // Pavilion rise (West, centered around x=-14, z=-14)
  const pavDist = Math.sqrt((x + 14) * (x + 14) + (z + 14) * (z + 14));
  const pavHeight = Math.max(0, 1.1 * Math.exp(-(pavDist * pavDist) / 40));

  // Base island dome with gentle roll
  const baseDome = Math.max(0, 0.7 * (1 - (dist / 28) * (dist / 28)));
  const bumps = 0.15 * Math.sin(x * 0.3) * Math.cos(z * 0.3);

  // Pier flat extension (-x, +z)
  const pierDist = Math.sqrt((x + 16) * (x + 16) + (z - 18) * (z - 18));
  const pierHeight = Math.max(0, 0.4 * Math.exp(-(pierDist * pierDist) / 25));

  let h = baseDome + peakHeight + knollHeight + pavHeight + bumps + pierHeight;

  // Shoreline fade-out
  if (dist > 24) {
    const fade = Math.max(0, 1 - (dist - 24) / 7);
    h = h * fade;
  }

  return Math.max(0.05, h);
}

/**
 * Clamps coordinates to remain safely on the island boundary.
 */
export function clampToIsland(
  x: number,
  z: number,
  maxRadius: number = ISLAND_RADIUS
): { x: number; z: number } {
  const currentRadius = Math.sqrt(x * x + z * z);
  if (currentRadius <= maxRadius) {
    return { x, z };
  }
  const factor = maxRadius / currentRadius;
  return {
    x: x * factor,
    z: z * factor,
  };
}

/**
 * Checks whether player is close enough to interact with an NPC.
 */
export function canInteractWithNpc(
  playerPos: Vector3D,
  npcPos: [number, number, number],
  interactionRadius: number = 3.2
): boolean {
  return distance2D(playerPos.x, playerPos.z, npcPos[0], npcPos[2]) <= interactionRadius;
}

/**
 * Finds the closest NPC in interactive range, or null.
 */
export function findClosestNpc(
  playerPos: Vector3D,
  npcs: NPCData[],
  maxRadius: number = 3.5
): NPCData | null {
  let closest: NPCData | null = null;
  let minDistance = maxRadius;

  for (const npc of npcs) {
    const dist = distance2D(playerPos.x, playerPos.z, npc.position[0], npc.position[2]);
    if (dist < minDistance) {
      minDistance = dist;
      closest = npc;
    }
  }

  return closest;
}

/**
 * Checks if the player collided with any uncollected shells.
 */
export function checkShellCollisions(
  playerPos: Vector3D,
  shells: ShellItem[],
  collectedSet: Set<string>,
  pickupRadius: number = 1.7
): string | null {
  for (const shell of shells) {
    if (collectedSet.has(shell.id)) continue;
    const dist = distance3D(
      playerPos.x,
      playerPos.y,
      playerPos.z,
      shell.position[0],
      shell.position[1],
      shell.position[2]
    );
    if (dist <= pickupRadius) {
      return shell.id;
    }
  }
  return null;
}

/**
 * Calculates overall portfolio exploration percentage.
 */
export function calculatePortfolioProgress(
  visitedNpcsCount: number,
  collectedShellsCount: number,
  totalNpcs: number = 5,
  totalShells: number = 8
): {
  percentage: number;
  npcPercent: number;
  shellPercent: number;
  isComplete: boolean;
} {
  const npcWeight = 0.65;
  const shellWeight = 0.35;

  const npcRatio = totalNpcs > 0 ? Math.min(1, visitedNpcsCount / totalNpcs) : 0;
  const shellRatio = totalShells > 0 ? Math.min(1, collectedShellsCount / totalShells) : 0;

  const percentage = Math.round((npcRatio * npcWeight + shellRatio * shellWeight) * 100);

  return {
    percentage,
    npcPercent: Math.round(npcRatio * 100),
    shellPercent: Math.round(shellRatio * 100),
    isComplete: visitedNpcsCount >= totalNpcs && collectedShellsCount >= totalShells,
  };
}

/**
 * Returns a playful island rank / title based on exploration progress.
 */
export function getCompletionTitle(
  visitedCount: number,
  totalNpcs: number,
  shellsCount: number,
  totalShells: number
): string {
  if (visitedCount >= totalNpcs && shellsCount >= totalShells) {
    return '🌟 Master Islander & Chief Architect';
  }
  if (visitedCount >= totalNpcs) {
    return '🧭 Island Ambassador & Portfolio Scholar';
  }
  if (visitedCount >= 3 || shellsCount >= 4) {
    return '⛵ Seasoned Explorer';
  }
  if (visitedCount >= 1 || shellsCount >= 1) {
    return '🌿 Curious Wanderer';
  }
  return '🌱 New Arrival';
}

/**
 * Formats seconds into MM:SS format.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
