import React from 'react';
import { QuestStatus } from '../../game/rpg';
import { KeyCap, PANEL } from './ui';

interface QuestTrackerProps {
  quests: QuestStatus[];
  compact: boolean;
  onOpenLog: () => void;
}

/** Right-side objective tracker, like the ones under an MMO minimap. */
export const QuestTracker: React.FC<QuestTrackerProps> = ({ quests, compact, onOpenLog }) => {
  const active = quests.filter((q) => !q.complete);
  const shown = compact ? active.slice(0, 1) : active;
  const allDone = active.length === 0;

  return (
    <button
      onClick={onOpenLog}
      className={`pointer-events-auto text-left rounded-xl px-3 py-2 w-[170px] sm:w-[230px] transition-colors hover:border-amber-400/70 ${PANEL}`}
      title="Open quest log [L]"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-400">Quests</span>
        {!compact && <KeyCap>L</KeyCap>}
      </div>
      {allDone && <p className="text-[11px] text-emerald-300 font-semibold">All quests complete! 🌟</p>}
      <ul className="flex flex-col gap-1.5">
        {shown.map((q) => {
          const next = q.objectives.filter((o) => !o.done).slice(0, compact ? 0 : 2);
          return (
            <li key={q.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] sm:text-xs font-bold text-amber-50 truncate">
                  <span className="mr-1">{q.icon}</span>
                  {q.title}
                </span>
                <span className="text-[10px] font-mono text-amber-300 tabular-nums shrink-0">
                  {q.progress}/{q.goal}
                </span>
              </div>
              {next.map((o) => (
                <div key={o.label} className="pl-5 text-[10px] text-amber-100/70 truncate">
                  • {o.label}
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </button>
  );
};
