import React, { useEffect, useRef, useState } from 'react';
import { PANEL } from './ui';

export type ChatKind = 'system' | 'xp' | 'quest' | 'level' | 'zone' | 'chat' | 'self' | 'net';

export interface ChatLine {
  id: number;
  kind: ChatKind;
  text: string;
  name?: string;
  color?: string;
}

interface ChatBoxProps {
  lines: ChatLine[];
  compact: boolean;
  /** When false (e.g. a modal is open) Enter won't grab focus. */
  active: boolean;
  online: boolean;
  onSend: (text: string) => void;
}

const KIND_STYLE: Record<ChatKind, string> = {
  system: 'text-amber-100/80',
  xp: 'text-violet-300',
  quest: 'text-amber-300 font-semibold',
  level: 'text-yellow-300 font-bold',
  zone: 'text-sky-300',
  chat: 'text-white',
  self: 'text-emerald-200',
  net: 'text-slate-300 italic',
};

/** Bottom-left chat / combat-log style panel. Enter to type, Esc to leave. */
export const ChatBox: React.FC<ChatBoxProps> = ({ lines, compact, active, online, onSend }) => {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines, open]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'Slash') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      setOpen(true);
      if (e.code === 'Slash') setDraft('/');
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const submit = () => {
    const text = draft.trim();
    if (text) onSend(text);
    setDraft('');
    inputRef.current?.blur();
    if (compact) setOpen(false);
  };

  const visible = compact && !open ? lines.slice(-2) : lines.slice(-60);

  return (
    <div
      className={`pointer-events-auto flex flex-col rounded-xl overflow-hidden ${PANEL} ${
        compact ? 'w-[min(72vw,280px)]' : 'w-[300px] lg:w-[340px]'
      }`}
    >
      <div
        ref={logRef}
        className={`px-2.5 pt-2 pb-1 overflow-y-auto overscroll-contain text-[11px] sm:text-xs leading-snug flex flex-col gap-0.5 ${
          compact && !open ? '' : 'h-36 sm:h-40'
        }`}
        aria-live="polite"
      >
        {visible.map((l) => (
          <div key={l.id} className={`break-words ${KIND_STYLE[l.kind]}`}>
            {l.name ? (
              <>
                <span className="font-bold" style={{ color: l.color }}>
                  [{l.name}]
                </span>{' '}
                {l.text}
              </>
            ) : (
              l.text
            )}
          </div>
        ))}
      </div>
      {(!compact || open) && (
        <form
          className="flex items-center gap-1.5 border-t border-amber-500/20 px-2 py-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? 'bg-emerald-400' : 'bg-slate-500'}`}
            title={online ? 'Connected to other players' : 'Solo — messages stay on your screen'}
          />
          <input
            ref={inputRef}
            value={draft}
            maxLength={140}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setDraft('');
                inputRef.current?.blur();
                if (compact) setOpen(false);
              }
            }}
            placeholder={online ? 'Press Enter to chat…  (/help)' : 'Press Enter to type…  (/help)'}
            className="flex-1 min-w-0 bg-transparent text-xs text-amber-50 placeholder:text-amber-100/40 outline-none select-text"
            aria-label="Chat message"
          />
        </form>
      )}
      {compact && !open && (
        <button
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="text-[10px] text-amber-300 font-semibold py-1 border-t border-amber-500/20"
        >
          💬 Chat
        </button>
      )}
    </div>
  );
};
