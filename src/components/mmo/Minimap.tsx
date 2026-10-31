import React, { useEffect, useRef } from 'react';
import { ISLAND_RADIUS } from '../../game/logic';
import {
  CAMPFIRE_POS,
  LIGHTHOUSE_POS,
  PAVILION_POS,
  SUMMIT_POS,
  WINDMILL_POS,
} from '../../game/world';
import { ISLAND_NPCS, ISLAND_SHELLS } from '../../data/portfolioData';
import { PANEL } from './ui';

export interface MinimapPlayer {
  x: number;
  z: number;
  r: number;
}

interface MinimapProps {
  size: number;
  zone: string;
  getPlayer: () => MinimapPlayer | null;
  getOthers: () => { x: number; z: number; color: string }[];
  visitedNpcs: Set<string>;
  collectedShells: Set<string>;
  footer?: React.ReactNode;
}

/** Coins show up on the map only once you're this close: a treasure "sense". */
const COIN_SENSE_RADIUS = 11;

const LANDMARKS = [
  { pos: LIGHTHOUSE_POS, icon: '🗼' },
  { pos: WINDMILL_POS, icon: '🌬️' },
  { pos: PAVILION_POS, icon: '⛩️' },
  { pos: CAMPFIRE_POS, icon: '🔥' },
  { pos: SUMMIT_POS, icon: '⛰️' },
];

/**
 * Round, north-up minimap drawn on a canvas each animation frame. It reads
 * positions through getters so the rest of the HUD doesn't re-render at 60fps.
 */
export const Minimap: React.FC<MinimapProps> = ({
  size,
  zone,
  getPlayer,
  getOthers,
  visitedNpcs,
  collectedShells,
  footer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ getPlayer, getOthers, visitedNpcs, collectedShells });
  propsRef.current = { getPlayer, getOthers, visitedNpcs, collectedShells };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const { getPlayer, getOthers, visitedNpcs, collectedShells } = propsRef.current;
      const me = getPlayer();
      const half = size / 2;
      // World units -> map pixels. The whole island (plus a strip of sea) fits.
      const scale = (half - 6) / (ISLAND_RADIUS + 4);
      const toMap = (x: number, z: number) => [half + x * scale, half + z * scale] as const;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(half, half, half - 1, 0, Math.PI * 2);
      ctx.clip();

      // Sea
      const sea = ctx.createRadialGradient(half, half, half * 0.4, half, half, half);
      sea.addColorStop(0, '#5fc8d6');
      sea.addColorStop(1, '#2a7f9a');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, size, size);

      // Beach + grass
      ctx.fillStyle = '#f3dfa6';
      ctx.beginPath();
      ctx.arc(half, half, ISLAND_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7cbf5f';
      ctx.beginPath();
      ctx.arc(half, half, (ISLAND_RADIUS - 5) * scale, 0, Math.PI * 2);
      ctx.fill();
      // Stargazer peak contours
      const [px, pz] = toMap(SUMMIT_POS.x, SUMMIT_POS.z);
      [7, 4.5, 2.2].forEach((r, i) => {
        ctx.fillStyle = ['#6aa952', '#5b9446', '#4c7f3b'][i];
        ctx.beginPath();
        ctx.arc(px, pz, r * scale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Landmarks
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.max(9, size * 0.075)}px system-ui, sans-serif`;
      LANDMARKS.forEach(({ pos, icon }) => {
        const [x, y] = toMap(pos.x, pos.z);
        ctx.fillText(icon, x, y);
      });

      // Coins you're close to
      if (me) {
        ISLAND_SHELLS.forEach((s) => {
          if (collectedShells.has(s.id)) return;
          if (Math.hypot(s.position[0] - me.x, s.position[2] - me.z) > COIN_SENSE_RADIUS) return;
          const [x, y] = toMap(s.position[0], s.position[2]);
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }

      // Villagers: gold "!" until met
      ISLAND_NPCS.forEach((n) => {
        const [x, y] = toMap(n.position[0], n.position[2]);
        if (visitedNpcs.has(n.id)) {
          ctx.fillStyle = '#fef3c7';
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.font = `900 ${Math.max(10, size * 0.08)}px system-ui, sans-serif`;
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#3b1d06';
          ctx.strokeText('!', x, y);
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('!', x, y);
        }
      });

      // Other adventurers
      getOthers().forEach((o) => {
        const [x, y] = toMap(o.x, o.z);
        ctx.fillStyle = o.color;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // You: an arrow pointing where you face
      if (me) {
        const [x, y] = toMap(me.x, me.z);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-me.r);
        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.lineTo(5, -5);
        ctx.lineTo(0, -2.5);
        ctx.lineTo(-5, -5);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Brass rim + compass "N"
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(half, half, half - 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1c120b';
      ctx.beginPath();
      ctx.arc(half, 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fcd34d';
      ctx.font = '800 9px system-ui, sans-serif';
      ctx.fillText('N', half, 8.5);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [size]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold text-amber-100 tracking-wide max-w-full truncate ${PANEL}`}
      >
        {zone}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
        aria-label={`Minimap. You are in ${zone}.`}
        role="img"
      />
      {footer}
    </div>
  );
};
