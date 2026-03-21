import React from 'react';

interface GameControlsProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
  paused: boolean;
  onPauseToggle: () => void;
  onRestart: () => void;
  gameFinished: boolean;
}

export function GameControls({
  speed,
  onSpeedChange,
  paused,
  onPauseToggle,
  onRestart,
  gameFinished,
}: GameControlsProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px' }}>
      <button
        onClick={onPauseToggle}
        style={{
          padding: '6px 16px',
          borderRadius: '6px',
          border: 'none',
          background: paused ? '#27ae60' : '#e67e22',
          color: '#fff',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        {paused ? 'Play' : 'Pause'}
      </button>

      {[1, 2, 4, 8].map((s) => (
        <button
          key={s}
          onClick={() => onSpeedChange(s)}
          style={{
            padding: '4px 10px',
            borderRadius: '4px',
            border: speed === s ? '2px solid #f1c40f' : '1px solid #555',
            background: speed === s ? '#2c3e50' : '#1a1a2e',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {s}x
        </button>
      ))}

      {gameFinished && (
        <button
          onClick={onRestart}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            background: '#3498db',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          New Game
        </button>
      )}
    </div>
  );
}
