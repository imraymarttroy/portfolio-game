import * as THREE from 'three';

/**
 * Canvas-texture sprites for MMORPG-style floating text: nameplates over
 * characters and quest markers ("!" / "?") over villagers.
 */

const FONT_STACK = "'Poppins', 'Segoe UI', system-ui, sans-serif";

export interface NameplateOptions {
  name: string;
  subtitle?: string;
  /** CSS colour for the name text. */
  color?: string;
  /** Small level badge shown before the name. */
  level?: number;
}

/** Height in world units of one nameplate sprite. */
const PLATE_WORLD_HEIGHT = 0.62;

export function createNameplate(opts: NameplateOptions): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: true })
  );
  sprite.renderOrder = 10;
  updateNameplate(sprite, opts);
  return sprite;
}

export function updateNameplate(sprite: THREE.Sprite, opts: NameplateOptions): void {
  const scale = 2; // canvas pixels per CSS pixel, for crisp text
  const nameSize = 30 * scale;
  const subSize = 20 * scale;
  const pad = 14 * scale;
  const gap = 4 * scale;

  const measure = document.createElement('canvas').getContext('2d')!;
  const levelText = opts.level ? `Lv ${opts.level}` : '';
  measure.font = `800 ${nameSize}px ${FONT_STACK}`;
  const nameW = measure.measureText(opts.name).width;
  measure.font = `700 ${subSize}px ${FONT_STACK}`;
  const levelW = levelText ? measure.measureText(levelText).width + 16 * scale : 0;
  const subW = opts.subtitle ? measure.measureText(`<${opts.subtitle}>`).width : 0;

  const width = Math.ceil(Math.max(nameW + levelW + (levelW ? gap * 2 : 0), subW) + pad * 2);
  const height = Math.ceil(nameSize + (opts.subtitle ? subSize + gap : 0) + pad * 1.2);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';

  // Name line (with optional level badge)
  const nameY = pad * 0.4;
  const lineW = nameW + levelW + (levelW ? gap * 2 : 0);
  let x = (width - lineW) / 2;
  if (levelText) {
    ctx.font = `700 ${subSize}px ${FONT_STACK}`;
    const bh = subSize + 8 * scale;
    const by = nameY + (nameSize - bh) / 2;
    ctx.fillStyle = 'rgba(28, 17, 8, 0.82)';
    roundRect(ctx, x, by, levelW, bh, 8 * scale);
    ctx.fill();
    ctx.fillStyle = '#fcd34d';
    ctx.fillText(levelText, x + 8 * scale, by + 4 * scale);
    x += levelW + gap * 2;
  }
  ctx.font = `800 ${nameSize}px ${FONT_STACK}`;
  ctx.lineWidth = 7 * scale;
  ctx.strokeStyle = 'rgba(20, 12, 6, 0.85)';
  ctx.strokeText(opts.name, x, nameY);
  ctx.fillStyle = opts.color ?? '#fffbeb';
  ctx.fillText(opts.name, x, nameY);

  if (opts.subtitle) {
    ctx.font = `700 ${subSize}px ${FONT_STACK}`;
    const sub = `<${opts.subtitle}>`;
    const sw = ctx.measureText(sub).width;
    const sy = nameY + nameSize + gap;
    ctx.lineWidth = 6 * scale;
    ctx.strokeText(sub, (width - sw) / 2, sy);
    ctx.fillStyle = '#fde68a';
    ctx.fillText(sub, (width - sw) / 2, sy);
  }

  const mat = sprite.material as THREE.SpriteMaterial;
  mat.map?.dispose();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  mat.map = tex;
  mat.needsUpdate = true;

  const worldH = PLATE_WORLD_HEIGHT * (height / (nameSize + subSize + gap + pad * 1.2));
  sprite.scale.set((worldH * width) / height, worldH, 1);
  // Anchor at the bottom so the plate grows upwards from its position.
  sprite.center.set(0.5, 0);
}

export type QuestMarkerKind = 'available' | 'talked';

/** A floating "!" (new villager) or speech bubble (already met) marker. */
export function createQuestMarker(kind: QuestMarkerKind): THREE.Sprite {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (kind === 'available') {
    ctx.font = `900 112px ${FONT_STACK}`;
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#3b1d06';
    ctx.strokeText('!', size / 2, size / 2 + 6);
    const grad = ctx.createLinearGradient(0, 10, 0, size - 10);
    grad.addColorStop(0, '#fff7c2');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.fillText('!', size / 2, size / 2 + 6);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(30,20,10,0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2 - 8, 50, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size / 2 - 14, size / 2 + 24);
    ctx.lineTo(size / 2 - 22, size / 2 + 48);
    ctx.lineTo(size / 2 + 6, size / 2 + 28);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(size / 2 + i * 20, size / 2 - 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  sprite.renderOrder = 11;
  sprite.scale.set(0.9, 0.9, 1);
  sprite.center.set(0.5, 0);
  return sprite;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function disposeSprite(sprite: THREE.Sprite) {
  const mat = sprite.material as THREE.SpriteMaterial;
  mat.map?.dispose();
  mat.dispose();
}
