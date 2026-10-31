import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IslandSceneController } from './three/IslandScene';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { DialogueModal } from './components/DialogueModal';
import { PortfolioJournalModal } from './components/PortfolioJournalModal';
import { PauseModal } from './components/PauseModal';
import { SecretCelebrationModal } from './components/SecretCelebrationModal';
import { MobileControls } from './components/MobileControls';
import { QuestLogModal } from './components/mmo/QuestLogModal';
import { ChatKind, ChatLine } from './components/mmo/ChatBox';
import { soundManager } from './audio/soundSynthesizer';
import { ISLAND_NPCS, ISLAND_SHELLS } from './data/portfolioData';
import { getCompletionTitle } from './game/logic';
import {
  clearSave,
  computeTotalXp,
  getLevelInfo,
  getMaxStats,
  getQuests,
  getZoneName,
  loadSave,
  randomAdventurerName,
  sanitizeName,
  writeSave,
  XP_REWARDS,
} from './game/rpg';
import { ADVENTURER_COLORS, MultiplayerClient, NetPlayer, NetStatus } from './net/multiplayer';
import { GameState, Vector3D } from './types/game';

const SAVED = loadSave();
const MAX_CHAT_LINES = 120;

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<IslandSceneController | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState>('title');
  const [nearbyNpcId, setNearbyNpcId] = useState<string | null>(null);
  const [activeDialogueNpcId, setActiveDialogueNpcId] = useState<string | null>(null);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [isQuestLogOpen, setIsQuestLogOpen] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Adventurer identity (saved between visits)
  const [playerName, setPlayerName] = useState<string>(SAVED?.playerName || randomAdventurerName());
  const [playerColor] = useState<string>(
    SAVED?.playerColor || ADVENTURER_COLORS[Math.floor(Math.random() * ADVENTURER_COLORS.length)]
  );

  // Progress (saved between visits)
  const [visitedNpcs, setVisitedNpcs] = useState<Set<string>>(new Set(SAVED?.visitedNpcs));
  const [collectedShells, setCollectedShells] = useState<Set<string>>(new Set(SAVED?.collectedShells));
  const [discussedTopics, setDiscussedTopics] = useState<Set<string>>(new Set(SAVED?.discussedTopics));
  const [discoveredZones, setDiscoveredZones] = useState<Set<string>>(new Set(SAVED?.discoveredZones));
  const [playerPos, setPlayerPos] = useState<Vector3D>({ x: 0, y: 0.5, z: 8 });

  // MMO HUD state
  const [energy, setEnergy] = useState({ value: 100, max: 100 });
  const [sprintOn, setSprintOn] = useState(false);
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [levelUpBanner, setLevelUpBanner] = useState<number | null>(null);
  const [netStatus, setNetStatus] = useState<NetStatus>('disabled');
  const [onlineCount, setOnlineCount] = useState(1);
  const chatIdRef = useRef(0);
  const remotePlayersRef = useRef<Map<string, NetPlayer>>(new Map());
  const netRef = useRef<MultiplayerClient | null>(null);

  // ---------------------------------------------------------------------------
  // Derived progression
  // ---------------------------------------------------------------------------
  const progress = useMemo(
    () => ({ visitedNpcs, collectedShells, discussedTopics, discoveredZones }),
    [visitedNpcs, collectedShells, discussedTopics, discoveredZones]
  );
  const quests = useMemo(() => getQuests(progress, ISLAND_NPCS, ISLAND_SHELLS), [progress]);
  const totalXp = useMemo(() => computeTotalXp(progress, ISLAND_NPCS, ISLAND_SHELLS), [progress]);
  const levelInfo = useMemo(() => getLevelInfo(totalXp), [totalXp]);
  const maxStats = getMaxStats(levelInfo.level);
  const zone = getZoneName(playerPos);
  const playerTitle = getCompletionTitle(
    visitedNpcs.size,
    ISLAND_NPCS.length,
    collectedShells.size,
    ISLAND_SHELLS.length
  );

  // Always-current copies for callbacks the 3D scene holds onto.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const pushLog = useCallback((kind: ChatKind, text: string, extra?: { name?: string; color?: string }) => {
    const line: ChatLine = { id: ++chatIdRef.current, kind, text, ...extra };
    setChatLines((prev) => {
      const next = [...prev, line];
      return next.length > MAX_CHAT_LINES ? next.slice(-MAX_CHAT_LINES) : next;
    });
  }, []);

  // Sync state to body dataset for game craft specifications & playwright testability
  useEffect(() => {
    let bodyState = 'title';
    if (gameState === 'playing') {
      if (isPaused) bodyState = 'paused';
      else if (isVictoryOpen) bodyState = 'gameover';
      else bodyState = 'playing';
    }
    document.body.dataset.state = bodyState;
  }, [gameState, isPaused, isVictoryOpen]);

  // Handle Autostart query parameter (?autostart=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      handleStartGame();
    }
  }, []);

  // Stable callbacks for 3D simulation
  const handleNpcProximity = useCallback((npcId: string | null) => {
    setNearbyNpcId(npcId);
  }, []);

  const handleShellCollected = useCallback(
    (shellId: string) => {
      if (progressRef.current.collectedShells.has(shellId)) return;
      const shell = ISLAND_SHELLS.find((s) => s.id === shellId);
      pushLog('xp', `+${XP_REWARDS.collectCoin} XP · Found ${shell?.name ?? 'a coin'}`);
      setCollectedShells((prev) => {
        const next = new Set(prev).add(shellId);
        if (next.size === ISLAND_SHELLS.length) {
          setIsVictoryOpen(true);
        }
        return next;
      });
    },
    [pushLog]
  );

  // The scene reports every frame; only re-render the HUD when we've really moved.
  const lastPosRef = useRef<Vector3D>({ x: 0, y: 0.5, z: 8 });
  const handlePlayerMoved = useCallback((pos: Vector3D) => {
    const last = lastPosRef.current;
    if (Math.abs(pos.x - last.x) + Math.abs(pos.z - last.z) < 0.3) return;
    lastPosRef.current = pos;
    setPlayerPos(pos);
  }, []);

  const handleEnergyChanged = useCallback((value: number, max: number) => {
    setEnergy({ value, max });
  }, []);

  // Initialize Three.js scene once inside isolated container
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const controller = new IslandSceneController(canvasContainerRef.current, {
      onNpcProximity: handleNpcProximity,
      onShellCollected: handleShellCollected,
      onPlayerMoved: handlePlayerMoved,
      onEnergyChanged: handleEnergyChanged,
    });
    controllerRef.current = controller;
    // Restore a saved game: hide coins already found.
    progressRef.current.collectedShells.forEach((id) => controller.collectShell(id));
    controller.setNpcVisited(progressRef.current.visitedNpcs);

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [handleNpcProximity, handleShellCollected, handlePlayerMoved, handleEnergyChanged]);

  // Propagate state changes to 3D controller
  useEffect(() => {
    if (controllerRef.current) {
      if (isPaused || activeDialogueNpcId || isJournalOpen || isVictoryOpen || isQuestLogOpen) {
        controllerRef.current.setGameState('paused');
      } else {
        controllerRef.current.setGameState(gameState);
      }
    }
  }, [gameState, isPaused, activeDialogueNpcId, isJournalOpen, isVictoryOpen, isQuestLogOpen]);

  // Quest markers over villagers
  useEffect(() => {
    controllerRef.current?.setNpcVisited(visitedNpcs);
  }, [visitedNpcs]);

  // Nameplate, max energy and the network profile follow name + level
  useEffect(() => {
    controllerRef.current?.setPlayerNameplate(playerName, levelInfo.level);
    controllerRef.current?.setMaxEnergy(getMaxStats(levelInfo.level).energy);
    netRef.current?.updateProfile({ name: playerName, color: playerColor, level: levelInfo.level });
  }, [playerName, playerColor, levelInfo.level]);

  // Level-up fanfare (not when a saved game first loads)
  const prevLevelRef = useRef(levelInfo.level);
  useEffect(() => {
    if (levelInfo.level > prevLevelRef.current) {
      setLevelUpBanner(levelInfo.level);
      pushLog('level', `★ You reached level ${levelInfo.level}!`);
      soundManager.playVictoryFanfare();
      const t = window.setTimeout(() => setLevelUpBanner(null), 2700);
      prevLevelRef.current = levelInfo.level;
      return () => window.clearTimeout(t);
    }
    prevLevelRef.current = levelInfo.level;
  }, [levelInfo.level, pushLog]);

  // Quest completion messages
  const prevCompleteRef = useRef(new Set(quests.filter((q) => q.complete).map((q) => q.id)));
  useEffect(() => {
    quests.forEach((q) => {
      if (q.complete && !prevCompleteRef.current.has(q.id)) {
        prevCompleteRef.current.add(q.id);
        pushLog('quest', `${q.icon} Quest complete: ${q.title}  +${XP_REWARDS.completeQuest} XP`);
      }
    });
  }, [quests, pushLog]);

  // Zone discovery while exploring
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (!discoveredZones.has(zone)) {
      setDiscoveredZones((prev) => new Set(prev).add(zone));
      pushLog('zone', `Discovered ${zone}  +${XP_REWARDS.discoverZone} XP`);
    }
  }, [zone, gameState, discoveredZones, pushLog]);

  // Save progress
  useEffect(() => {
    writeSave({
      playerName,
      playerColor,
      visitedNpcs: [...visitedNpcs],
      collectedShells: [...collectedShells],
      discussedTopics: [...discussedTopics],
      discoveredZones: [...discoveredZones],
    });
  }, [playerName, playerColor, visitedNpcs, collectedShells, discussedTopics, discoveredZones]);

  // ---------------------------------------------------------------------------
  // Multiplayer (only when a server URL was configured at build time)
  // ---------------------------------------------------------------------------
  const startNetwork = useCallback(() => {
    if (netRef.current) return;
    const client = new MultiplayerClient(
      { name: playerName, color: playerColor, level: levelInfo.level },
      {
        onStatus: (s) => {
          setNetStatus(s);
          if (s === 'online') pushLog('net', 'Connected. Other adventurers can see you now.');
          if (s === 'offline' && remotePlayersRef.current.size) {
            remotePlayersRef.current.clear();
            controllerRef.current?.clearRemotePlayers();
            setOnlineCount(1);
          }
        },
        onWelcome: (_id, players) => {
          remotePlayersRef.current.clear();
          controllerRef.current?.clearRemotePlayers();
          players.forEach((p) => {
            remotePlayersRef.current.set(p.id, p);
            controllerRef.current?.upsertRemotePlayer(p.id, p);
          });
          setOnlineCount(players.length + 1);
        },
        onPlayerJoin: (p) => {
          remotePlayersRef.current.set(p.id, p);
          controllerRef.current?.upsertRemotePlayer(p.id, p);
          setOnlineCount(remotePlayersRef.current.size + 1);
          pushLog('net', `${p.name} arrived on the island.`);
        },
        onPlayerLeave: (id, name) => {
          remotePlayersRef.current.delete(id);
          controllerRef.current?.removeRemotePlayer(id);
          setOnlineCount(remotePlayersRef.current.size + 1);
          pushLog('net', `${name} sailed away.`);
        },
        onPlayerUpdate: (p) => {
          remotePlayersRef.current.set(p.id, p);
          controllerRef.current?.upsertRemotePlayer(p.id, p);
        },
        onChat: (c) => {
          const other = remotePlayersRef.current.get(c.id);
          const self = !other;
          pushLog(self ? 'self' : 'chat', c.text, { name: c.name, color: other?.color ?? playerColor });
        },
      }
    );
    netRef.current = client;
    client.connect();
  }, [playerName, playerColor, levelInfo.level, pushLog]);

  // Send our position ~10 times a second while playing
  useEffect(() => {
    if (gameState !== 'playing' || netStatus !== 'online') return;
    const timer = window.setInterval(() => {
      const snap = controllerRef.current?.getPlayerSnapshot();
      if (snap) netRef.current?.sendState(snap);
    }, 100);
    return () => window.clearInterval(timer);
  }, [gameState, netStatus]);

  useEffect(() => () => netRef.current?.disconnect(), []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  // Start game from title
  const handleStartGame = (nameOverride?: string) => {
    const name = nameOverride || playerName;
    setGameState('playing');
    setIsPaused(false);
    if (controllerRef.current) {
      controllerRef.current.setGameState('playing');
    }
    if (chatIdRef.current === 0) {
      pushLog('system', `Welcome to Raymart Troy Adventures, ${name}!`);
      pushLog('system', 'Villagers with a gold ! have a story for you. Press L for your quests.');
    }
    startNetwork();
  };

  // Interact with nearby NPC
  const handleInteract = () => {
    if (nearbyNpcId) {
      setActiveDialogueNpcId(nearbyNpcId);
      if (!visitedNpcs.has(nearbyNpcId)) {
        const npc = ISLAND_NPCS.find((n) => n.id === nearbyNpcId);
        pushLog('xp', `+${XP_REWARDS.meetNpc} XP · Met ${npc?.name ?? 'a villager'}`);
        setVisitedNpcs((prev) => new Set(prev).add(nearbyNpcId));
      }
      soundManager.playNpcChirp(nearbyNpcId);
    }
  };

  const handleCloseDialogue = () => {
    setActiveDialogueNpcId(null);
  };

  const handleTopicDiscussed = (npcId: string, topicId?: string) => {
    setVisitedNpcs((prev) => (prev.has(npcId) ? prev : new Set(prev).add(npcId)));
    if (!topicId) return;
    const key = `${npcId}:${topicId}`;
    if (discussedTopics.has(key)) return;
    pushLog('xp', `+${XP_REWARDS.discussTopic} XP · New topic learned`);
    setDiscussedTopics((prev) => new Set(prev).add(key));
  };

  const handleJump = () => controllerRef.current?.triggerJump();

  const handleToggleSprint = () => {
    const next = !sprintOn;
    setSprintOn(next);
    controllerRef.current?.setSprintToggle(next);
  };

  const handleSendChat = (text: string) => {
    if (text.startsWith('/')) {
      const [cmd, ...rest] = text.slice(1).split(' ');
      const arg = rest.join(' ');
      switch (cmd.toLowerCase()) {
        case 'name': {
          const name = sanitizeName(arg);
          if (name.length < 2) {
            pushLog('system', 'Usage: /name YourName (2–16 letters or numbers)');
          } else {
            setPlayerName(name);
            pushLog('system', `You are now known as ${name}.`);
          }
          return;
        }
        case 'who': {
          const others = [...remotePlayersRef.current.values()].map((p) => `${p.name} (Lv ${p.level})`);
          pushLog('system', others.length ? `Online: ${others.join(', ')}` : 'Nobody else is on the island right now.');
          return;
        }
        case 'help':
        default:
          pushLog('system', 'Commands: /name NewName · /who · Keys: E talk, Shift sprint, L quests, Tab guide, 1–5 hotbar');
          return;
      }
    }
    if (netStatus === 'online') {
      netRef.current?.sendChat(text); // the server echoes it back to everyone
    } else {
      pushLog('self', text, { name: playerName, color: playerColor });
    }
  };

  // Toggle mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (gameState !== 'playing') return;
    setIsPaused((prev) => !prev);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleOpenJournal = () => {
    setIsJournalOpen(true);
    soundManager.playJournalOpen();
  };

  const handleCloseJournal = () => {
    setIsJournalOpen(false);
  };

  const handleOpenQuests = () => {
    setIsQuestLogOpen(true);
    soundManager.playJournalOpen();
  };

  const handleResetPosition = () => {
    if (controllerRef.current) {
      controllerRef.current.resetPlayer();
    }
    setIsPaused(false);
  };

  const handleResetProgress = () => {
    clearSave();
    window.location.reload();
  };

  const handleReturnTitle = () => {
    setGameState('title');
    setIsPaused(false);
    setActiveDialogueNpcId(null);
    setIsJournalOpen(false);
    setIsQuestLogOpen(false);
    if (controllerRef.current) {
      controllerRef.current.setGameState('title');
    }
  };

  const anyModalOpen = !!activeDialogueNpcId || isJournalOpen || isPaused || isVictoryOpen || isQuestLogOpen;

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'KeyE') {
        if (!anyModalOpen && nearbyNpcId) {
          handleInteract();
        }
      } else if (e.code === 'KeyL') {
        if (gameState !== 'playing') return;
        if (isQuestLogOpen) setIsQuestLogOpen(false);
        else if (!anyModalOpen) handleOpenQuests();
      } else if (gameState === 'playing' && !anyModalOpen && /^Digit[1-5]$/.test(e.code)) {
        const n = Number(e.code.slice(5));
        if (n === 1 && nearbyNpcId) handleInteract();
        if (n === 2) handleJump();
        if (n === 3) handleToggleSprint();
        if (n === 4) handleOpenJournal();
        if (n === 5) handleOpenQuests();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        if (isJournalOpen) {
          handleCloseJournal();
        } else {
          handleOpenJournal();
        }
      } else if (e.code === 'Escape') {
        if (activeDialogueNpcId) {
          handleCloseDialogue();
        } else if (isQuestLogOpen) {
          setIsQuestLogOpen(false);
        } else if (isJournalOpen) {
          handleCloseJournal();
        } else if (isVictoryOpen) {
          setIsVictoryOpen(false);
        } else if (gameState === 'playing') {
          handleTogglePause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const activeNpcData = activeDialogueNpcId
    ? ISLAND_NPCS.find((n) => n.id === activeDialogueNpcId)
    : null;

  const getMinimapPlayer = useCallback(() => controllerRef.current?.getPlayerSnapshot() ?? null, []);
  const getMinimapOthers = useCallback(
    () => [...remotePlayersRef.current.values()].map((p) => ({ x: p.x, z: p.z, color: p.color })),
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-amber-50">
      {/* Isolated Three.js WebGL Container */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full z-0 cursor-glove-grab"
      />

      {/* Screen 1: Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          onOpenJournal={handleOpenJournal}
          playerName={playerName}
          playerColor={playerColor}
          level={levelInfo.level}
          onNameChange={(name) => setPlayerName(name)}
        />
      )}

      {/* Screen 2: Active Playing HUD */}
      {gameState === 'playing' && (
        <GameHUD
          nearbyNpcId={nearbyNpcId}
          visitedNpcs={visitedNpcs}
          collectedShells={collectedShells}
          isMuted={isMuted}
          zone={zone}
          playerName={playerName}
          playerColor={playerColor}
          playerTitle={playerTitle}
          levelInfo={levelInfo}
          hp={maxStats.hp}
          maxHp={maxStats.hp}
          energy={energy.value}
          maxEnergy={energy.max}
          sprintOn={sprintOn}
          quests={quests}
          chatLines={chatLines}
          chatActive={!anyModalOpen}
          netStatus={netStatus}
          onlineCount={onlineCount}
          levelUpBanner={levelUpBanner}
          getPlayer={getMinimapPlayer}
          getOthers={getMinimapOthers}
          onInteract={handleInteract}
          onJump={handleJump}
          onToggleSprint={handleToggleSprint}
          onOpenJournal={handleOpenJournal}
          onOpenQuests={handleOpenQuests}
          onToggleMute={handleToggleMute}
          onPause={handleTogglePause}
          onSendChat={handleSendChat}
        />
      )}

      {/* Touch virtual controls for mobile */}
      {gameState === 'playing' && !anyModalOpen && (
        <MobileControls
          onJoystickMove={(x, y) => {
            controllerRef.current?.setJoystickInput(x, y);
          }}
          onJump={handleJump}
          onInteract={handleInteract}
          isNearNpc={!!nearbyNpcId}
          sprintOn={sprintOn}
          onToggleSprint={handleToggleSprint}
        />
      )}

      {/* Modal: Dialogue with NPC */}
      {activeNpcData && (
        <DialogueModal
          npc={activeNpcData}
          onClose={handleCloseDialogue}
          onTopicDiscussed={handleTopicDiscussed}
          onOpenJournal={handleOpenJournal}
        />
      )}

      {/* Modal: Quest log */}
      {isQuestLogOpen && (
        <QuestLogModal
          quests={quests}
          level={levelInfo.level}
          totalXp={totalXp}
          onClose={() => setIsQuestLogOpen(false)}
        />
      )}

      {/* Modal: Portfolio Field Guide */}
      {isJournalOpen && (
        <PortfolioJournalModal
          visitedNpcs={visitedNpcs}
          collectedShells={collectedShells}
          onClose={handleCloseJournal}
        />
      )}

      {/* Modal: Pause Game */}
      {isPaused && (
        <PauseModal
          visitedNpcs={visitedNpcs}
          collectedShells={collectedShells}
          isMuted={isMuted}
          onResume={handleResume}
          onOpenJournal={handleOpenJournal}
          onToggleMute={handleToggleMute}
          onResetPosition={handleResetPosition}
          onReturnTitle={handleReturnTitle}
          onResetProgress={handleResetProgress}
        />
      )}

      {/* Modal: All 8 Shells Found Celebration */}
      {isVictoryOpen && (
        <SecretCelebrationModal
          onClose={() => setIsVictoryOpen(false)}
          onOpenJournal={handleOpenJournal}
        />
      )}
    </div>
  );
}
