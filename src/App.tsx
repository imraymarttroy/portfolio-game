import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IslandSceneController } from './three/IslandScene';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { DialogueModal } from './components/DialogueModal';
import { PortfolioJournalModal } from './components/PortfolioJournalModal';
import { PauseModal } from './components/PauseModal';
import { SecretCelebrationModal } from './components/SecretCelebrationModal';
import { MobileControls } from './components/MobileControls';
import { soundManager } from './audio/soundSynthesizer';
import { ISLAND_NPCS, ISLAND_SHELLS } from './data/portfolioData';
import { GameState, Vector3D } from './types/game';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<IslandSceneController | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState>('title');
  const [nearbyNpcId, setNearbyNpcId] = useState<string | null>(null);
  const [activeDialogueNpcId, setActiveDialogueNpcId] = useState<string | null>(null);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Progress metrics
  const [visitedNpcs, setVisitedNpcs] = useState<Set<string>>(new Set());
  const [collectedShells, setCollectedShells] = useState<Set<string>>(new Set());
  const [playerPos, setPlayerPos] = useState<Vector3D>({ x: 0, y: 0.5, z: 8 });

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

  const handleShellCollected = useCallback((shellId: string) => {
    setCollectedShells((prev) => {
      const next = new Set(prev).add(shellId);
      if (next.size === ISLAND_SHELLS.length) {
        setIsVictoryOpen(true);
      }
      return next;
    });
  }, []);

  const handlePlayerMoved = useCallback((pos: Vector3D) => {
    setPlayerPos(pos);
  }, []);

  // Initialize Three.js scene once inside isolated container
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const controller = new IslandSceneController(canvasContainerRef.current, {
      onNpcProximity: handleNpcProximity,
      onShellCollected: handleShellCollected,
      onPlayerMoved: handlePlayerMoved,
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [handleNpcProximity, handleShellCollected, handlePlayerMoved]);

  // Propagate state changes to 3D controller
  useEffect(() => {
    if (controllerRef.current) {
      if (isPaused || activeDialogueNpcId || isJournalOpen || isVictoryOpen) {
        controllerRef.current.setGameState('paused');
      } else {
        controllerRef.current.setGameState(gameState);
      }
    }
  }, [gameState, isPaused, activeDialogueNpcId, isJournalOpen, isVictoryOpen]);

  // Start game from title
  const handleStartGame = () => {
    setGameState('playing');
    setIsPaused(false);
    if (controllerRef.current) {
      controllerRef.current.setGameState('playing');
    }
  };

  // Interact with nearby NPC
  const handleInteract = () => {
    if (nearbyNpcId) {
      setActiveDialogueNpcId(nearbyNpcId);
      setVisitedNpcs((prev) => new Set(prev).add(nearbyNpcId));
      soundManager.playNpcChirp(nearbyNpcId);
    }
  };

  const handleCloseDialogue = () => {
    setActiveDialogueNpcId(null);
  };

  const handleTopicDiscussed = (npcId: string) => {
    setVisitedNpcs((prev) => new Set(prev).add(npcId));
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

  const handleResetPosition = () => {
    if (controllerRef.current) {
      controllerRef.current.resetPlayer();
    }
    setIsPaused(false);
  };

  const handleReturnTitle = () => {
    setGameState('title');
    setIsPaused(false);
    setActiveDialogueNpcId(null);
    setIsJournalOpen(false);
    if (controllerRef.current) {
      controllerRef.current.setGameState('title');
    }
  };

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
        if (!activeDialogueNpcId && !isJournalOpen && !isPaused && nearbyNpcId) {
          handleInteract();
        }
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
  }, [
    activeDialogueNpcId,
    isJournalOpen,
    isPaused,
    nearbyNpcId,
    gameState,
    isVictoryOpen,
    isMuted,
  ]);

  const activeNpcData = activeDialogueNpcId
    ? ISLAND_NPCS.find((n) => n.id === activeDialogueNpcId)
    : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-amber-50">
      {/* Isolated Three.js WebGL Container */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full z-0 cursor-glove-grab"
      />

      {/* Screen 1: Title Screen */}
      {gameState === 'title' && (
        <TitleScreen onStart={handleStartGame} onOpenJournal={handleOpenJournal} />
      )}

      {/* Screen 2: Active Playing HUD */}
      {gameState === 'playing' && (
        <GameHUD
          nearbyNpcId={nearbyNpcId}
          visitedNpcs={visitedNpcs}
          collectedShells={collectedShells}
          isMuted={isMuted}
          playerPos={playerPos}
          onInteract={handleInteract}
          onOpenJournal={handleOpenJournal}
          onToggleMute={handleToggleMute}
          onPause={handleTogglePause}
        />
      )}

      {/* Touch virtual controls for mobile */}
      {gameState === 'playing' && !isPaused && !activeDialogueNpcId && !isJournalOpen && (
        <MobileControls
          onJoystickMove={(x, y) => {
            controllerRef.current?.setJoystickInput(x, y);
          }}
          onJump={() => {
            controllerRef.current?.triggerJump();
          }}
          onInteract={handleInteract}
          isNearNpc={!!nearbyNpcId}
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
