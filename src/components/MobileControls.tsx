import React, { useRef, useState, useEffect } from 'react';

interface MobileControlsProps {
  onJoystickMove: (x: number, y: number) => void;
  onJump: () => void;
  onInteract: () => void;
  isNearNpc: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onJoystickMove,
  onJump,
  onInteract,
  isNearNpc,
}) => {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!baseRef.current) return;
    const touch = e.touches[0];
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const maxRadius = rect.width / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const clampedDist = Math.min(distance, maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });
    onJoystickMove(kx / maxRadius, ky / maxRadius);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex justify-between items-end p-6 select-none md:hidden">
      {/* Left Virtual Joystick */}
      <div
        ref={baseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-amber-950/40 border-2 border-amber-600/50 flex items-center justify-center touch-none shadow-lg"
      >
        <div
          className="w-12 h-12 rounded-full bg-amber-500/80 shadow-md transform transition-transform"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      {/* Right Action Buttons */}
      <div className="pointer-events-auto flex flex-col gap-3 items-end">
        {isNearNpc && (
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onInteract();
            }}
            onClick={onInteract}
            className="w-16 h-16 rounded-full bg-amber-900 active:bg-amber-800 text-amber-100 font-bold text-xs shadow-xl flex items-center justify-center border-2 border-amber-500"
          >
            💬 Talk
          </button>
        )}

        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onJump();
          }}
          onClick={onJump}
          className="w-16 h-16 rounded-full bg-amber-500 active:bg-amber-400 text-amber-950 font-bold text-xs shadow-xl flex items-center justify-center border-2 border-amber-400"
        >
          ⬆️ Hop
        </button>
      </div>
    </div>
  );
};
