import React from 'react';

/** Small gold hexagon ₱ coin icon used across the HUD and menus. */
export const PesoCoin: React.FC<{ className?: string; dim?: boolean }> = ({ className = 'w-4 h-4', dim = false }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    aria-hidden="true"
    style={dim ? { filter: 'grayscale(1)', opacity: 0.45 } : undefined}
  >
    <defs>
      <linearGradient id="pesoCoinFace" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe48a" />
        <stop offset="0.55" stopColor="#f7b928" />
        <stop offset="1" stopColor="#e08a12" />
      </linearGradient>
    </defs>
    {/* Coin thickness */}
    <polygon points="9,5 23,5 30,17.5 23,30 9,30 2,17.5" fill="#b8650c" />
    {/* Face */}
    <polygon points="9,3 23,3 30,15.5 23,28 9,28 2,15.5" fill="url(#pesoCoinFace)" stroke="#c97a10" strokeWidth="1" />
    {/* Inner rim */}
    <polygon points="11,7 21,7 26,15.5 21,24 11,24 6,15.5" fill="none" stroke="#fff3c4" strokeOpacity="0.7" strokeWidth="1.2" />
    {/* ₱ */}
    <path
      d="M13.2 22 V9.5 H17.4 a3.4 3.4 0 0 1 0 6.8 H13.2 M10.8 11.9 H20.6 M10.8 14 H20.6"
      fill="none"
      stroke="#9a5208"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
