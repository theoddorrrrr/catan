import React from 'react';

interface DiceDisplayProps {
  dice: [number, number] | null;
}

function DieFace({ value }: { value: number }) {
  return (
    <div
      style={{
        width: '40px',
        height: '40px',
        background: '#f5f0dc',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.4em',
        fontWeight: 'bold',
        color: '#333',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      {value}
    </div>
  );
}

export function DiceDisplay({ dice }: DiceDisplayProps) {
  if (!dice) return null;

  const total = dice[0] + dice[1];
  const isRed = total === 7;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <DieFace value={dice[0]} />
      <DieFace value={dice[1]} />
      <span style={{
        fontSize: '1.2em',
        fontWeight: 'bold',
        color: isRed ? '#e74c3c' : '#fff',
      }}>
        = {total}
      </span>
    </div>
  );
}
