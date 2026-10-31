import React from 'react';

/** Shared look for MMORPG HUD panels: dark walnut glass with a brass rim. */
export const PANEL =
  'bg-[#1c120b]/80 backdrop-blur-[3px] border border-amber-500/35 shadow-[0_4px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,236,179,0.12)]';

interface StatBarProps {
  value: number;
  max: number;
  /** Tailwind gradient classes for the fill. */
  fill: string;
  label?: string;
  className?: string;
  showNumbers?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({
  value,
  max,
  fill,
  label,
  className = 'h-3.5',
  showNumbers = true,
}) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={`relative w-full rounded-full bg-black/55 border border-black/60 overflow-hidden ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemax={Math.round(max)}
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-b ${fill} transition-[width] duration-200 ease-out`}
        style={{ width: `${pct}%` }}
      />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-full pointer-events-none" />
      {showNumbers && (
        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] tabular-nums leading-none">
          {Math.round(value)} / {Math.round(max)}
        </div>
      )}
    </div>
  );
};

export const KeyCap: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center min-w-[1.25rem] px-1 h-4 rounded bg-amber-100 text-amber-950 text-[9px] font-mono font-bold leading-none shadow-[0_1px_0_rgba(0,0,0,0.4)] ${className}`}
  >
    {children}
  </span>
);
