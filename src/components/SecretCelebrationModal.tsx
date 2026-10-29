import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Check, ArrowRight } from 'lucide-react';
import { soundManager } from '../audio/soundSynthesizer';
import { PORTFOLIO_OWNER } from '../data/portfolioData';

interface SecretCelebrationModalProps {
  onClose: () => void;
  onOpenJournal: () => void;
}

export const SecretCelebrationModal: React.FC<SecretCelebrationModalProps> = ({
  onClose,
  onOpenJournal,
}) => {
  useEffect(() => {
    soundManager.playVictoryFanfare();

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#38bdf8', '#4ade80', '#c084fc'],
      });
    } catch {
      // Confetti fallback
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amber-950/50 select-none pointer-events-auto">
      <div className="w-full max-w-md bg-amber-50 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-amber-500 text-amber-950 flex flex-col items-center text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-amber-400/20 border-2 border-amber-500 flex items-center justify-center text-4xl shadow-inner animate-bounce">
          <span>🌟</span>
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600 block mb-1">
            Achievement Unlocked!
          </span>
          <h2 className="text-2xl font-black font-display tracking-tight text-amber-950">
            Master Islander & Chief Architect
          </h2>
          <p className="text-xs sm:text-sm text-amber-900/80 font-medium mt-1">
            You collected all 8 peso coins and uncovered every story behind Raymart Troy’s creative work!
          </p>
        </div>

        <div className="w-full bg-white/80 p-4 rounded-2xl border border-amber-200 text-left text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All 8 Peso Coins Collected</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Full Tech Stack & Case Studies Unlocked</span>
          </div>
          <div className="flex items-center gap-2 text-amber-800 font-bold">
            <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Master Endorsement Ready for Troy</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
          <button
            onClick={() => {
              onClose();
              onOpenJournal();
            }}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Open Field Guide</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-xs sm:text-sm transition-all active:scale-95"
          >
            Keep Exploring
          </button>
        </div>
      </div>
    </div>
  );
};
