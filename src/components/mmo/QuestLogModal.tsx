import React, { useState } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { QuestStatus, XP_REWARDS } from '../../game/rpg';

interface QuestLogModalProps {
  quests: QuestStatus[];
  level: number;
  totalXp: number;
  onClose: () => void;
}

/** Parchment quest log (L): every quest with its full objective list. */
export const QuestLogModal: React.FC<QuestLogModalProps> = ({ quests, level, totalXp, onClose }) => {
  const [selected, setSelected] = useState(quests.find((q) => !q.complete)?.id ?? quests[0]?.id);
  const quest = quests.find((q) => q.id === selected) ?? quests[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-amber-950/45 pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] bg-amber-50 rounded-3xl shadow-2xl border-4 border-amber-900/30 text-amber-950 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Quest log"
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-900 text-amber-50">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">📜 Quest Log</h2>
            <p className="text-[11px] text-amber-200/80 font-mono">
              Level {level} · {totalXp} XP earned
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-amber-800 transition-colors"
            aria-label="Close quest log"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row min-h-0 flex-1">
          <ul className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-amber-200 p-2 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto">
            {quests.map((q) => (
              <li key={q.id} className="shrink-0">
                <button
                  onClick={() => setSelected(q.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                    q.id === quest?.id ? 'bg-amber-200 text-amber-950' : 'hover:bg-amber-100 text-amber-900'
                  }`}
                >
                  <span>{q.icon}</span>
                  <span className="flex-1 truncate">{q.title}</span>
                  {q.complete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="font-mono text-[10px] text-amber-700 tabular-nums">
                      {q.progress}/{q.goal}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {quest && (
            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              <h3 className="text-xl font-extrabold flex items-center gap-2">
                <span>{quest.icon}</span>
                {quest.title}
              </h3>
              <p className="text-sm text-amber-800 mt-1 mb-3">{quest.description}</p>
              <div className="h-2.5 rounded-full bg-amber-200 overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-[width] duration-500"
                  style={{ width: `${(quest.progress / Math.max(1, quest.goal)) * 100}%` }}
                />
              </div>
              <ul className="flex flex-col gap-1.5">
                {quest.objectives.map((o) => (
                  <li key={o.label} className="flex items-start gap-2 text-sm">
                    {o.done ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                    )}
                    <span className={o.done ? 'line-through text-amber-700/60' : ''}>{o.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[11px] font-mono text-amber-700">
                Reward: +{XP_REWARDS.completeQuest} XP when complete
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
