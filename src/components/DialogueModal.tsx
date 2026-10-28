import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { NPCData, DialogueOption } from '../types/game';
import { soundManager } from '../audio/soundSynthesizer';

interface DialogueModalProps {
  npc: NPCData;
  onClose: () => void;
  onTopicDiscussed: (npcId: string, topicId?: string) => void;
  onOpenJournal: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  npc,
  onClose,
  onTopicDiscussed,
  onOpenJournal,
}) => {
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(true);
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);
  const [activeExternalLink, setActiveExternalLink] = useState<{ label: string; url: string } | null>(null);

  const fullText = currentResponse || npc.dialogue.greeting;
  const charIndexRef = useRef(0);
  const typingTimerRef = useRef<number | null>(null);

  // Typewriter effect with procedural audio chirps
  useEffect(() => {
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);

    const stepTypewriter = () => {
      if (charIndexRef.current < fullText.length) {
        const nextChar = fullText[charIndexRef.current];
        charIndexRef.current++;
        setDisplayedText(fullText.slice(0, charIndexRef.current));

        // Procedural speech chirp on letters
        if (nextChar !== ' ' && charIndexRef.current % 3 === 0) {
          soundManager.playNpcChirp(npc.id);
        }

        const delay = nextChar === '.' || nextChar === '!' || nextChar === '?' ? 80 : 20;
        typingTimerRef.current = window.setTimeout(stepTypewriter, delay);
      } else {
        setIsTyping(false);
      }
    };

    typingTimerRef.current = window.setTimeout(stepTypewriter, 30);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [fullText, npc.id]);

  const handleSelectOption = (opt: DialogueOption) => {
    setCurrentResponse(opt.response);
    setActiveExternalLink(opt.externalLink || null);
    onTopicDiscussed(npc.id, opt.topicId);
  };

  const handleResetToGreeting = () => {
    setCurrentResponse(null);
    setActiveExternalLink(null);
  };

  // Keyboard escape / close handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:p-8 pointer-events-auto select-none bg-black/25">
      <div className="w-full max-w-2xl bg-amber-50 rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-amber-900/20 text-amber-950 flex flex-col gap-4">
        {/* Speaker Header */}
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/50"
              style={{ backgroundColor: `${npc.accentColor}33` }}
            >
              <span>{npc.avatarIcon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight font-display">
                  {npc.name}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {npc.title}
                </span>
              </div>
              <p className="text-xs text-amber-800/80 font-medium">
                {npc.landmark} • <span className="italic">{npc.portfolioTopic}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-amber-200/80 text-amber-800 transition-colors"
            title="Close Dialogue [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialogue Bubble Text Area */}
        <div className="min-h-[85px] text-sm sm:text-base leading-relaxed text-amber-950 font-medium bg-amber-100/60 p-4 rounded-2xl border border-amber-200/60">
          <p>{displayedText}</p>
          {isTyping && (
            <span className="inline-block w-2 h-4 bg-amber-600 animate-pulse ml-1 align-middle rounded-sm" />
          )}
        </div>

        {/* External Link Action if applicable */}
        {activeExternalLink && !isTyping && (
          <div className="flex justify-end">
            <a
              href={activeExternalLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-amber-100 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <span>{activeExternalLink.label}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Options / Action Choices */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800/70">
            {currentResponse ? 'Ask something else:' : 'Ask about Troy:'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {npc.dialogue.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectOption(opt)}
                className="text-left px-3.5 py-2.5 rounded-xl bg-white/80 hover:bg-amber-100/90 text-amber-950 text-xs sm:text-sm font-semibold transition-all border border-amber-300/50 shadow-xs flex items-center justify-between group active:scale-[0.98]"
              >
                <span>{opt.text}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer controls: Back to greeting, Open Field Guide */}
        <div className="flex items-center justify-between pt-2 border-t border-amber-200/80 text-xs">
          <div className="flex items-center gap-2">
            {currentResponse && (
              <button
                onClick={handleResetToGreeting}
                className="font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                ← Back to Greeting
              </button>
            )}
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 inline" />
              Journal Stamp Logged
            </span>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenJournal();
            }}
            className="font-bold text-amber-700 hover:text-amber-950 flex items-center gap-1"
          >
            <span>View Full Portfolio Details →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
