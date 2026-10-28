import React from 'react';
import { Volume2, VolumeX, Pause, BookOpen, Sparkles, Navigation } from 'lucide-react';
import { ISLAND_NPCS } from '../data/portfolioData';
import { Vector3D } from '../types/game';

interface GameHUDProps {
  nearbyNpcId: string | null;
  visitedNpcs: Set<string>;
  collectedShells: Set<string>;
  isMuted: boolean;
  playerPos: Vector3D;
  onInteract: () => void;
  onOpenJournal: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  nearbyNpcId,
  visitedNpcs,
  collectedShells,
  isMuted,
  playerPos,
  onInteract,
  onOpenJournal,
  onToggleMute,
  onPause,
}) => {
  const nearbyNpc = nearbyNpcId ? ISLAND_NPCS.find((n) => n.id === nearbyNpcId) : null;

  // Derive current island sector name for immersion
  const currentSector = (() => {
    if (playerPos.z < -10) return 'Stargazer Peak';
    if (playerPos.x < -10 && playerPos.z > 10) return 'Lighthouse Pier';
    if (playerPos.x > 10 && playerPos.z > 5) return 'Windmill Knoll';
    if (playerPos.x < -10 && playerPos.z < -5) return 'Crystal Pavilion';
    return 'Village Green';
  })();

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none z-20">
      {/* Top Status Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Island Field Guide / Portfolio Button */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onOpenJournal}
            className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-amber-950/85 hover:bg-amber-900 text-amber-50 shadow-md transition-transform active:scale-95 border border-amber-800/40"
            title="Open Portfolio Journal [Tab]"
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight">Portfolio Guide</span>
                <span className="text-[10px] bg-amber-800/80 text-amber-200 px-1.5 py-0.2 rounded font-mono font-medium">
                  Tab
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-amber-200/80 font-mono tabular-nums">
                <span>NPCs: {visitedNpcs.size}/5</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Sparkles className="w-3 h-3 inline" />
                  {collectedShells.size}/8
                </span>
              </div>
            </div>
          </button>

          {/* Current Location Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-900/60 text-amber-100 text-[11px] font-medium w-fit">
            <Navigation className="w-3 h-3 text-emerald-300" />
            <span>{currentSector}</span>
          </div>
        </div>

        {/* Right: Audio & Pause Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="pointer-events-auto p-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-100 shadow-md transition-all active:scale-95 border border-amber-800/40"
            title="Toggle Audio [M]"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
          </button>

          <button
            onClick={onPause}
            aria-label="Pause Game"
            className="pointer-events-auto p-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-100 shadow-md transition-all active:scale-95 border border-amber-800/40"
            title="Pause [Esc]"
          >
            <Pause className="w-4 h-4 text-amber-200" />
          </button>
        </div>
      </div>

      {/* Bottom Center: Dynamic Interaction Prompt */}
      {nearbyNpc && (
        <div className="flex justify-center mb-6">
          <button
            onClick={onInteract}
            className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm sm:text-base tracking-wide shadow-xl transition-all transform active:scale-95 border-b-4 border-amber-900"
          >
            <span className="text-xl">{nearbyNpc.avatarIcon}</span>
            <span>Talk to {nearbyNpc.name}</span>
            <span className="text-xs bg-amber-950/80 px-2 py-0.5 rounded font-mono text-amber-100">
              Space / E
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
