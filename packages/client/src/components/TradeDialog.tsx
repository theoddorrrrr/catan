import React, { useState } from 'react';
import {
  GameState,
  ResourceType,
  ALL_RESOURCES,
  emptyResources,
  getTradeRate,
} from '@catan/shared';

interface TradeDialogProps {
  state: GameState;
  playerId: string;
  onTrade: (giving: ResourceType, receiving: ResourceType) => void;
  onClose: () => void;
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  [ResourceType.Brick]: 'Brick',
  [ResourceType.Lumber]: 'Lumber',
  [ResourceType.Ore]: 'Ore',
  [ResourceType.Grain]: 'Grain',
  [ResourceType.Wool]: 'Wool',
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Brick]: '#c45a2c',
  [ResourceType.Lumber]: '#2d6a2d',
  [ResourceType.Ore]: '#8a8a8a',
  [ResourceType.Grain]: '#e8c44a',
  [ResourceType.Wool]: '#7ec850',
};

export function TradeDialog({ state, playerId, onTrade, onClose }: TradeDialogProps) {
  const [giving, setGiving] = useState<ResourceType | null>(null);
  const [receiving, setReceiving] = useState<ResourceType | null>(null);
  const player = state.players.find((p) => p.id === playerId)!;

  const canTrade = giving && receiving && giving !== receiving;
  const rate = giving ? getTradeRate(state, playerId, giving) : 4;
  const hasEnough = giving ? player.resources[giving] >= rate : false;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '360px',
        color: '#eee',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px' }}>Bank Trade</h3>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#aaa', fontSize: '0.9em', marginBottom: '8px' }}>Give ({rate}:1):</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {ALL_RESOURCES.map((r) => {
              const tradeRate = getTradeRate(state, playerId, r);
              const has = player.resources[r] >= tradeRate;
              return (
                <button
                  key={r}
                  onClick={() => setGiving(r)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: giving === r ? '2px solid #f1c40f' : '1px solid #555',
                    background: RESOURCE_COLORS[r],
                    color: '#fff',
                    cursor: has ? 'pointer' : 'not-allowed',
                    opacity: has ? 1 : 0.4,
                    fontWeight: 'bold',
                    fontSize: '0.85em',
                  }}
                  disabled={!has}
                >
                  {RESOURCE_LABELS[r]} ({player.resources[r]}) {tradeRate}:1
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#aaa', fontSize: '0.9em', marginBottom: '8px' }}>Receive:</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {ALL_RESOURCES.filter((r) => r !== giving).map((r) => (
              <button
                key={r}
                onClick={() => setReceiving(r)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: receiving === r ? '2px solid #f1c40f' : '1px solid #555',
                  background: RESOURCE_COLORS[r],
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85em',
                }}
              >
                {RESOURCE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#333', color: '#ccc', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => canTrade && hasEnough && onTrade(giving!, receiving!)}
            disabled={!canTrade || !hasEnough}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: canTrade && hasEnough ? '#27ae60' : '#333',
              color: canTrade && hasEnough ? '#fff' : '#666',
              cursor: canTrade && hasEnough ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            Trade
          </button>
        </div>
      </div>
    </div>
  );
}
