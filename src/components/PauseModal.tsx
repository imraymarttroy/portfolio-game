import React from 'react';
import { Play, RotateCcw, Home, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { calculatePortfolioProgress, getCompletionTitle } from '../game/logic';
import { ISLAND_NPCS, ISLAND_SHELLS } from '../data/portfolioData';

interface PauseModalProps {
  visitedNpcs: Set<string>;
  collectedShells: Set<string>;
  isMuted: boolean;
  onResume: () => void;
  onOpenJournal: () => void;
  onToggleMute: () => void;
  onResetPosition: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  visitedNpcs,
  collectedShells,
  isMuted,
  onResume,
  onOpenJournal,
  onToggleMute,
  onResetPosition,
  onReturnTitle,
}) => {
  const progress = calculatePortfolioProgress(
    visitedNpcs.size,
    collectedShells.size,
    ISLAND_NPCS.length,
    ISLAND_SHELLS.length
  );

  const title = getCompletionTitle(
    visitedNpcs.size,
    ISLAND_NPCS.length,
    collectedShells.size,
    ISLAND_SHELLS.length
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amber-950/40 select-none pointer-events-auto">
      <div className="w-full max-w-sm bg-amber-50 rounded-3xl p-6 shadow-2xl border-4 border-amber-900/30 text-amber-950 flex flex-col gap-5 text-center">
        {/* Title */}
        <div>
          <span className="text-3xl mb-1 block">⏸️</span>
          <h2 className="text-xl font-extrabold font-display tracking-tight text-amber-950">
            Adventure Paused
          </h2>
          <p className="text-xs text-amber-800 font-semibold">{title}</p>
        </div>

        {/* Quick Stat Tiles */}
        <div className="grid grid-cols-2 gap-2 bg-amber-100/70 p-3 rounded-2xl border border-amber-200">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-amber-800/80">Villagers</span>
            <span className="text-lg font-black font-mono text-amber-950 tabular-nums">
              {visitedNpcs.size} / {ISLAND_NPCS.length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-amber-800/80">Golden Shells</span>
            <span className="text-lg font-black font-mono text-amber-950 tabular-nums">
              {collectedShells.size} / {ISLAND_SHELLS.length}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            data-start="true"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Game (Esc)</span>
          </button>

          <button
            onClick={onOpenJournal}
            className="w-full py-2.5 rounded-xl bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-amber-800" />
            <span>Field Guide & Projects</span>
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
          </button>

          <button
            onClick={onResetPosition}
            className="w-full py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span>Reset Position to Center</span>
          </button>

          <button
            onClick={onReturnTitle}
            className="w-full py-2 rounded-xl text-amber-800/80 hover:text-amber-950 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 mt-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
