import React, { useState } from 'react';
import { Player, DevelopmentCard, DevCardType, TurnPhase, ResourceType, ALL_RESOURCES } from '@catan/shared';
import { ResourceIcon } from './ResourceIcon';

interface DevCardHandProps {
  player: Player;
  turnNumber: number;
  turnPhase: TurnPhase;
  isMyTurn: boolean;
  onPlayKnight: () => void;
  onPlayMonopoly: (resource: ResourceType) => void;
  onPlayYearOfPlenty: (r1: ResourceType, r2: ResourceType) => void;
  onPlayRoadBuilding: () => void;
}

const CARD_INFO: Record<DevCardType, { icon: string; label: string; desc: string }> = {
  [DevCardType.Knight]: { icon: '⚔', label: 'Knight', desc: 'Move robber & steal' },
  [DevCardType.VictoryPoint]: { icon: '⭐', label: 'VP', desc: 'Hidden victory point' },
  [DevCardType.RoadBuilding]: { icon: '🛤', label: 'Roads', desc: 'Build 2 free roads' },
  [DevCardType.YearOfPlenty]: { icon: '🎁', label: 'Plenty', desc: 'Take 2 resources' },
  [DevCardType.Monopoly]: { icon: '💰', label: 'Monopoly', desc: 'Take all of 1 resource' },
};

export function DevCardHand({
  player,
  turnNumber,
  turnPhase,
  isMyTurn,
  onPlayKnight,
  onPlayMonopoly,
  onPlayYearOfPlenty,
  onPlayRoadBuilding,
}: DevCardHandProps) {
  const [picker, setPicker] = useState<'monopoly' | 'yearOfPlenty' | null>(null);
  const [yopFirst, setYopFirst] = useState<ResourceType | null>(null);

  if (player.devCards.length === 0) return null;

  // Group cards by type
  const grouped: Record<DevCardType, { count: number; playable: number }> = {} as any;
  for (const type of Object.values(DevCardType)) {
    const cards = player.devCards.filter((c) => c.type === type);
    const playable = cards.filter((c) => c.turnAcquired < turnNumber).length;
    if (cards.length > 0) {
      grouped[type] = { count: cards.length, playable };
    }
  }

  const canPlayNonKnight = isMyTurn && !player.devCardPlayedThisTurn && turnPhase === TurnPhase.PostRoll;
  const canPlayKnight = isMyTurn && !player.devCardPlayedThisTurn
    && (turnPhase === TurnPhase.PreRoll || turnPhase === TurnPhase.PostRoll);

  function canPlay(type: DevCardType): boolean {
    const info = grouped[type];
    if (!info || info.playable === 0) return false;
    if (type === DevCardType.VictoryPoint) return false;
    if (type === DevCardType.Knight) return canPlayKnight;
    return canPlayNonKnight;
  }

  function handlePlay(type: DevCardType) {
    switch (type) {
      case DevCardType.Knight:
        onPlayKnight();
        break;
      case DevCardType.Monopoly:
        setPicker('monopoly');
        break;
      case DevCardType.YearOfPlenty:
        setPicker('yearOfPlenty');
        setYopFirst(null);
        break;
      case DevCardType.RoadBuilding:
        onPlayRoadBuilding();
        break;
    }
  }

  // Resource picker overlay
  if (picker) {
    return (
      <div style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: '4px',
        background: '#1a1a2e',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '12px',
        zIndex: 50,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '0.85em', fontWeight: 'bold', marginBottom: '8px', color: '#f1c40f' }}>
          {picker === 'monopoly' ? 'Choose resource to monopolize:' : (
            yopFirst ? `Pick second resource (first: ${yopFirst}):` : 'Pick first resource:'
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ALL_RESOURCES.map((r) => (
            <button
              key={r}
              onClick={() => {
                if (picker === 'monopoly') {
                  onPlayMonopoly(r);
                  setPicker(null);
                } else if (picker === 'yearOfPlenty') {
                  if (!yopFirst) {
                    setYopFirst(r);
                  } else {
                    onPlayYearOfPlenty(yopFirst, r);
                    setPicker(null);
                    setYopFirst(null);
                  }
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #555',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.85em',
              }}
            >
              <ResourceIcon resource={r} size={16} />
              {r}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setPicker(null); setYopFirst(null); }}
          style={{
            marginTop: '8px',
            padding: '4px 12px',
            borderRadius: '4px',
            border: 'none',
            background: '#333',
            color: '#aaa',
            cursor: 'pointer',
            fontSize: '0.8em',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
      position: 'relative',
    }}>
      {Object.entries(grouped).map(([type, info]) => {
        const t = type as DevCardType;
        const cardInfo = CARD_INFO[t];
        const playable = canPlay(t);
        return (
          <button
            key={t}
            disabled={!playable}
            onClick={() => playable && handlePlay(t)}
            title={`${cardInfo.label} (${info.count}) - ${cardInfo.desc}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: playable ? '1px solid #8e44ad' : '1px solid #333',
              background: playable ? 'rgba(142,68,173,0.2)' : 'rgba(0,0,0,0.2)',
              color: playable ? '#fff' : '#666',
              cursor: playable ? 'pointer' : 'default',
              fontSize: '0.8em',
            }}
          >
            <span>{cardInfo.icon}</span>
            <span>{info.count}</span>
          </button>
        );
      })}
    </div>
  );
}
