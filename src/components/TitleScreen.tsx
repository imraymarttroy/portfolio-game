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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-900/80 text-amber-100 text-xs font-mono tracking-wide shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>imraymarttroy.online</span>
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
        {/* Brand lockup — cream "tape" lines in Anton, like imraymarttroy.online */}
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/85 text-amber-100 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Raymart Troy · Multimedia Artist
        </div>

        {/* Game logo: Raymart Troy Adventures */}
        <h1 className="adv-logo relative flex flex-col items-center mb-6" aria-label="Raymart Troy Adventures">
          {/* Slow-turning sunburst behind the logo */}
          <svg className="adv-sunburst absolute left-1/2 top-1/2 w-[150%] sm:w-[135%] aspect-square pointer-events-none" viewBox="-100 -100 200 200" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, i) => (
              <path
                key={i}
                d="M0 0 L-9 -100 L9 -100 Z"
                transform={`rotate(${i * 22.5})`}
                fill={i % 2 === 0 ? '#dd8669' : '#f0eadc'}
                opacity={i % 2 === 0 ? 0.32 : 0.22}
              />
            ))}
            <circle r="34" fill="#f0eadc" opacity="0.35" />
          </svg>

          <span className="adv-name relative font-display uppercase leading-[0.86] text-center">
            <span className="block">Raymart</span>
            <span className="block">Troy</span>
          </span>

          {/* Ribbon banner */}
          <span className="adv-ribbon relative -mt-2 sm:-mt-3">
            <span className="adv-ribbon-tail adv-ribbon-tail--left" aria-hidden="true"></span>
            <span className="adv-ribbon-tail adv-ribbon-tail--right" aria-hidden="true"></span>
            <span className="adv-ribbon-face font-display uppercase">
              <span aria-hidden="true" className="adv-star">✦</span>
              Adventures
              <span aria-hidden="true" className="adv-star">✦</span>
            </span>
          </span>
        </h1>

        <p className="max-w-md mx-auto mb-7 px-4 py-3 rounded-2xl bg-amber-900/85 text-amber-100/90 text-xs sm:text-sm font-mono uppercase tracking-[0.12em] leading-relaxed">
          Every brand has a story worth telling. Walk the island and meet the villagers who tell{' '}
          <strong className="text-amber-400 font-bold">{PORTFOLIO_OWNER.name}’s</strong>.
        </p>

        {/* Primary CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            data-start="true"
            onClick={onStart}
            className="pointer-events-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold text-base sm:text-lg tracking-wide shadow-lg hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-3 border-b-4 border-amber-900"
          >
            <span>⛵ Explore the Island</span>
            <span className="text-xs bg-amber-950/80 px-2 py-0.5 rounded font-mono text-amber-100">
              Space / Enter
            </span>
          </button>
        </div>
      </div>

      {/* Flat Control Hints Footer */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium text-amber-100 px-4 py-3 rounded-2xl bg-amber-900/80">
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <span className="bg-amber-100 px-2 py-1 rounded text-amber-950 font-mono">WASD / Arrow Keys</span>
          <span>Move</span>
          <span className="text-amber-500">•</span>
          <span className="bg-amber-100 px-2 py-1 rounded text-amber-950 font-mono">Space / E</span>
          <span>Talk & Interact</span>
          <span className="text-amber-500">•</span>
          <span className="bg-amber-100 px-2 py-1 rounded text-amber-950 font-mono">Tab</span>
          <span>Field Guide</span>
        </div>
        <div className="text-amber-100/70 font-mono text-[11px] text-center">
          © Raymart Troy · Built with Three.js
        </div>
      </div>
    </div>
  );
};
