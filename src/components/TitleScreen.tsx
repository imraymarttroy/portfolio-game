import React, { useEffect } from 'react';
import { PORTFOLIO_OWNER } from '../data/portfolioData';

interface TitleScreenProps {
  onStart: () => void;
  onOpenJournal: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onOpenJournal }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-10 select-none z-30">
      {/* Top Header / Branding */}
      <div className="w-full flex items-start justify-between">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-900/80 text-amber-100 text-xs font-medium tracking-wide shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Interactive 3D Portfolio Island</span>
        </div>
        <button
          onClick={onOpenJournal}
          className="pointer-events-auto px-4 py-2 rounded-xl bg-amber-950/75 hover:bg-amber-900 text-amber-100 text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 flex items-center gap-2 border border-amber-800/40"
        >
          <span>📖 Quick Portfolio View</span>
        </button>
      </div>

      {/* Main Title Centerpiece Lockup */}
      <div className="flex flex-col items-center text-center my-auto max-w-xl mx-auto">
        {/* Custom Inline SVG Emblem Lockup */}
        <div className="relative mb-3 flex items-center justify-center">
          <svg className="w-16 h-16 sm:w-20 sm:h-20 text-amber-500 drop-shadow-md" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
            {/* Stylized Island Hills */}
            <path d="M16 52 C26 36, 40 42, 52 38 C60 36, 66 48, 64 54 L16 54 Z" fill="#4ade80" />
            {/* Lighthouse silhouette */}
            <path d="M37 20 L43 20 L45 42 L35 42 Z" fill="#ef4444" />
            <path d="M38 16 L42 16 L43 20 L37 20 Z" fill="#1e293b" />
            <circle cx="40" cy="18" r="3" fill="#fde047" />
            {/* Ocean waves */}
            <path d="M14 58 Q27 54 40 58 T66 58" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M20 64 Q33 60 46 64 T60 64" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-amber-950 tracking-tight font-display drop-shadow-sm mb-2">
          Isle of Troy
        </h1>
        <p className="text-sm sm:text-base font-medium text-amber-900/90 max-w-md mx-auto leading-relaxed mb-6">
          A cozy 3D island adventure where villagers share <strong className="text-amber-950 font-bold">{PORTFOLIO_OWNER.name}’s</strong> multimedia artistry, branding, motion graphics, and video projects.
        </p>

        {/* Primary CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            data-start="true"
            onClick={onStart}
            className="pointer-events-auto px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-base sm:text-lg tracking-wide shadow-lg hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-3 border-b-4 border-amber-800"
          >
            <span>⛵ Explore the Island</span>
            <span className="text-xs bg-amber-800/60 px-2 py-0.5 rounded font-mono text-amber-100">
              Space / Enter
            </span>
          </button>
        </div>
      </div>

      {/* Flat Control Hints Footer */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-amber-950/80 pt-4 border-t border-amber-900/10">
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <span className="bg-amber-200/90 px-2 py-1 rounded text-amber-900">WASD / Arrow Keys</span>
          <span>Move</span>
          <span className="text-amber-400">•</span>
          <span className="bg-amber-200/90 px-2 py-1 rounded text-amber-900">Space / E</span>
          <span>Talk & Interact</span>
          <span className="text-amber-400">•</span>
          <span className="bg-amber-200/90 px-2 py-1 rounded text-amber-900">Tab</span>
          <span>Field Guide</span>
        </div>
        <div className="text-amber-900/70 font-medium text-center">
          Created with Three.js & TypeScript for Troy’s Portfolio
        </div>
      </div>
    </div>
  );
};
