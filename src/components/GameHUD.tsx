import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Pause, BookOpen } from 'lucide-react';
import { ISLAND_NPCS } from '../data/portfolioData';
import { LevelInfo, QuestStatus } from '../game/rpg';
import { NetStatus } from '../net/multiplayer';
import { PlayerFrame } from './mmo/PlayerFrame';
import { Minimap, MinimapPlayer } from './mmo/Minimap';
import { QuestTracker } from './mmo/QuestTracker';
import { ChatBox, ChatLine } from './mmo/ChatBox';
import { Hotbar, HotbarSlot, XpBar } from './mmo/Hotbar';
import { KeyCap, PANEL } from './mmo/ui';

interface GameHUDProps {
  nearbyNpcId: string | null;
  visitedNpcs: Set<string>;
  collectedShells: Set<string>;
  isMuted: boolean;
  zone: string;
  playerName: string;
  playerColor: string;
  playerTitle: string;
  levelInfo: LevelInfo;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  sprintOn: boolean;
  quests: QuestStatus[];
  chatLines: ChatLine[];
  chatActive: boolean;
  netStatus: NetStatus;
  onlineCount: number;
  levelUpBanner: number | null;
  getPlayer: () => MinimapPlayer | null;
  getOthers: () => { x: number; z: number; color: string }[];
  onInteract: () => void;
  onJump: () => void;
  onToggleSprint: () => void;
  onOpenJournal: () => void;
  onOpenQuests: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onSendChat: (text: string) => void;
}

function useIsCompact() {
  const query = '(max-width: 767px)';
  const [compact, setCompact] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

const iconButton = `pointer-events-auto p-2 sm:p-2.5 rounded-xl text-amber-100 transition-all active:scale-95 hover:border-amber-400/70 ${PANEL}`;

export const GameHUD: React.FC<GameHUDProps> = (props) => {
  const {
    nearbyNpcId,
    visitedNpcs,
    collectedShells,
    isMuted,
    zone,
    levelInfo,
    quests,
    netStatus,
    onlineCount,
    levelUpBanner,
  } = props;
  const compact = useIsCompact();
  const nearbyNpc = nearbyNpcId ? ISLAND_NPCS.find((n) => n.id === nearbyNpcId) : null;

  const slots: HotbarSlot[] = [
    {
      id: 'talk',
      icon: '💬',
      label: 'Talk',
      keyHint: 'E',
      onUse: props.onInteract,
      disabled: !nearbyNpc,
      highlight: !!nearbyNpc,
    },
    { id: 'jump', icon: '🦘', label: 'Jump', keyHint: 'Spc', onUse: props.onJump },
    {
      id: 'sprint',
      icon: '👟',
      label: 'Sprint',
      keyHint: 'Shift',
      onUse: props.onToggleSprint,
      highlight: props.sprintOn,
    },
    { id: 'guide', icon: '📖', label: 'Guide', keyHint: 'Tab', onUse: props.onOpenJournal },
    { id: 'quests', icon: '📜', label: 'Quests', keyHint: 'L', onUse: props.onOpenQuests },
  ];

  const netLabel =
    netStatus === 'online'
      ? `${onlineCount} adventurer${onlineCount === 1 ? '' : 's'} online`
      : netStatus === 'connecting'
        ? 'Connecting…'
        : netStatus === 'offline'
          ? 'Server offline · solo'
          : 'Solo adventure';
  const netDot =
    netStatus === 'online' ? 'bg-emerald-400' : netStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400';

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 flex flex-col">
      <div className="relative flex-1 p-3 sm:p-5">
        {/* Top-left: unit frame */}
        <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex flex-col gap-2">
          <PlayerFrame
            name={props.playerName}
            color={props.playerColor}
            level={levelInfo.level}
            hp={props.hp}
            maxHp={props.maxHp}
            energy={props.energy}
            maxEnergy={props.maxEnergy}
            title={props.playerTitle}
          />
        </div>

        {/* Top-right: system buttons + minimap + quest tracker */}
        <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex items-start gap-2">
          <div className="flex flex-col gap-1.5 mt-6">
            <button onClick={props.onOpenJournal} className={iconButton} title="Portfolio guide [Tab]" aria-label="Open portfolio guide">
              <BookOpen className="w-4 h-4 text-amber-300" />
            </button>
            <button onClick={props.onToggleMute} className={iconButton} title="Toggle audio [M]" aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}>
              {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
            </button>
            <button onClick={props.onPause} className={iconButton} title="Menu [Esc]" aria-label="Pause game">
              <Pause className="w-4 h-4 text-amber-200" />
            </button>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Minimap
              size={compact ? 104 : 168}
              zone={zone}
              getPlayer={props.getPlayer}
              getOthers={props.getOthers}
              visitedNpcs={visitedNpcs}
              collectedShells={collectedShells}
              footer={
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] text-amber-100/90 ${PANEL}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${netDot}`} />
                  {netLabel}
                </div>
              }
            />
            <QuestTracker quests={quests} compact={compact} onOpenLog={props.onOpenQuests} />
          </div>
        </div>

        {/* Bottom-left: chat / log (sits above the joystick on phones) */}
        <div className={`absolute left-3 sm:left-5 ${compact ? 'bottom-40' : 'bottom-4'}`}>
          <ChatBox
            lines={props.chatLines}
            compact={compact}
            active={props.chatActive}
            online={netStatus === 'online'}
            onSend={props.onSendChat}
          />
        </div>

        {/* Bottom-centre: interaction prompt + action bar */}
        <div
          className={`absolute flex flex-col gap-3 pointer-events-none ${
            compact
              ? 'inset-x-0 bottom-36 items-center'
              : 'right-5 bottom-4 items-end lg:right-0 lg:inset-x-0 lg:items-center'
          }`}
        >
          {nearbyNpc && (
            <button
              onClick={props.onInteract}
              className="pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm tracking-wide shadow-xl transition-all active:scale-95 border-b-4 border-amber-900"
            >
              <span className="text-xl">{nearbyNpc.avatarIcon}</span>
              <span>
                Talk to {nearbyNpc.name}
                {!visitedNpcs.has(nearbyNpc.id) && <span className="ml-1.5 text-amber-900">· New quest!</span>}
              </span>
              <span className="text-xs bg-amber-950/80 px-2 py-0.5 rounded font-mono text-amber-100">E</span>
            </button>
          )}
          {!compact && <Hotbar slots={slots} />}
        </div>

        {/* Level-up fanfare */}
        {levelUpBanner !== null && (
          <div className="absolute inset-x-0 top-[22%] flex justify-center pointer-events-none" key={levelUpBanner}>
            <div className="mmo-levelup flex flex-col items-center">
              <span className="text-[11px] sm:text-xs uppercase tracking-[0.35em] font-bold text-amber-200 drop-shadow">
                Level up!
              </span>
              <span className="font-display text-6xl sm:text-7xl text-amber-300 drop-shadow-[0_3px_0_#78350f]">
                {levelUpBanner}
              </span>
              <span className="text-[11px] text-amber-50 font-semibold drop-shadow">More health and energy</span>
            </div>
          </div>
        )}

        {/* First-time controls hint */}
        {!compact && levelInfo.level === 1 && levelInfo.current === 0 && (
          <div className={`absolute left-1/2 -translate-x-1/2 top-4 px-3 py-1.5 rounded-xl text-[11px] text-amber-100 flex items-center gap-1.5 ${PANEL}`}>
            <KeyCap>WASD</KeyCap> move · <KeyCap>Shift</KeyCap> sprint · <KeyCap>E</KeyCap> talk · <KeyCap>Enter</KeyCap> chat
          </div>
        )}
      </div>

      <XpBar level={levelInfo.level} current={levelInfo.current} needed={levelInfo.needed} ratio={levelInfo.ratio} />
    </div>
  );
};
