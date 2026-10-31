import React from 'react';
import { PANEL, StatBar } from './ui';

interface PlayerFrameProps {
  name: string;
  color: string;
  level: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  title: string;
}

/** Top-left unit frame: portrait, level, name, health and energy bars. */
export const PlayerFrame: React.FC<PlayerFrameProps> = ({
  name,
  color,
  level,
  hp,
  maxHp,
  energy,
  maxEnergy,
  title,
}) => (
  <div className={`flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-2xl w-[210px] sm:w-[250px] ${PANEL}`}>
    <div className="relative shrink-0">
      <div
        className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 border-amber-400 flex items-center justify-center text-xl sm:text-2xl shadow-inner"
        style={{ background: `radial-gradient(circle at 35% 30%, ${color}, #1c120b 85%)` }}
        aria-hidden="true"
      >
        🧢
      </div>
      <div className="absolute -bottom-1 -right-1 min-w-[1.5rem] h-6 px-1 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 border-2 border-[#1c120b] text-[11px] font-black text-amber-950 flex items-center justify-center tabular-nums">
        {level}
      </div>
    </div>
    <div className="flex-1 min-w-0 flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-extrabold text-amber-50 truncate">{name}</span>
      </div>
      <span className="-mt-1 text-[9px] text-amber-300/80 font-medium truncate">{title}</span>
      <StatBar value={hp} max={maxHp} label="Health" fill="from-rose-400 to-red-600" />
      <StatBar value={energy} max={maxEnergy} label="Energy" fill="from-teal-300 to-cyan-600" className="h-2.5" />
    </div>
  </div>
);
