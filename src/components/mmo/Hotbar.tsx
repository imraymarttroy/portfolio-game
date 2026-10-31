import React from 'react';
import { KeyCap, PANEL } from './ui';

export interface HotbarSlot {
  id: string;
  icon: string;
  label: string;
  keyHint: string;
  onUse: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

interface HotbarProps {
  slots: HotbarSlot[];
}

/** Action bar of skill-style buttons; slot n also answers to number key n. */
export const Hotbar: React.FC<HotbarProps> = ({ slots }) => (
  <div className={`pointer-events-auto flex items-end gap-1.5 px-2 py-1.5 rounded-2xl ${PANEL}`}>
    {slots.map((s, i) => (
      <button
        key={s.id}
        onClick={s.onUse}
        disabled={s.disabled}
        title={`${s.label} [${s.keyHint}]`}
        aria-label={s.label}
        className={`relative w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${
          s.highlight
            ? 'border-amber-300 bg-gradient-to-b from-amber-500/50 to-amber-800/60 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
            : 'border-amber-900/80 bg-gradient-to-b from-[#3b2614] to-[#1c120b] hover:border-amber-500/70'
        } ${s.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span className="text-xl leading-none" aria-hidden="true">
          {s.icon}
        </span>
        <span className="text-[8px] font-semibold text-amber-100/80 mt-0.5 leading-none">{s.label}</span>
        <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-[#1c120b] border border-amber-500/60 text-[9px] font-bold text-amber-200 flex items-center justify-center">
          {i + 1}
        </span>
        <KeyCap className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 !h-3.5 !text-[8px]">{s.keyHint}</KeyCap>
      </button>
    ))}
  </div>
);

interface XpBarProps {
  level: number;
  current: number;
  needed: number;
  ratio: number;
}

/** Thin full-width experience bar along the bottom edge, segmented like classic MMOs. */
export const XpBar: React.FC<XpBarProps> = ({ level, current, needed, ratio }) => (
  <div className="relative w-full h-3 sm:h-3.5 bg-[#1c120b]/85 border-t border-amber-500/40" title="Experience">
    <div
      className="absolute inset-y-0 left-0 bg-gradient-to-b from-violet-400 to-fuchsia-700 transition-[width] duration-500 ease-out"
      style={{ width: `${Math.round(ratio * 100)}%` }}
    />
    <div className="absolute inset-0 flex pointer-events-none">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex-1 border-r border-black/40 last:border-r-0" />
      ))}
    </div>
    <div className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-mono font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] tabular-nums">
      {needed > 0 ? `Level ${level} · XP ${current} / ${needed}` : `Level ${level} · Max level`}
    </div>
  </div>
);
