import React, { useState } from 'react';
import {
  Player,
  ResourceType,
  ALL_RESOURCES,
  DevCardType,
  TurnPhase,
  DevelopmentCard,
} from '@catan/shared';
import { ResourceIcon, RESOURCE_COLORS, RESOURCE_LABELS } from './ResourceIcon';

interface PlayerHandProps {
  player: Player;
  turnNumber: number;
  turnPhase: TurnPhase;
  isMyTurn: boolean;
  onPlayKnight: () => void;
  onPlayMonopoly: (resource: ResourceType) => void;
  onPlayYearOfPlenty: (r1: ResourceType, r2: ResourceType) => void;
  onPlayRoadBuilding: () => void;
}

const DEV_CARD_INFO: Record<DevCardType, { icon: string; label: string; desc: string; color: string }> = {
  [DevCardType.Knight]: { icon: '⚔', label: 'Knight', desc: 'Move robber & steal', color: '#c0392b' },
  [DevCardType.VictoryPoint]: { icon: '⭐', label: 'VP', desc: 'Hidden victory point', color: '#f1c40f' },
  [DevCardType.RoadBuilding]: { icon: '🛤', label: 'Roads', desc: 'Build 2 free roads', color: '#e67e22' },
  [DevCardType.YearOfPlenty]: { icon: '🎁', label: 'Plenty', desc: 'Take 2 resources', color: '#27ae60' },
  [DevCardType.Monopoly]: { icon: '💰', label: 'Monopoly', desc: 'Take all of 1 resource', color: '#8e44ad' },
};

export function PlayerHand({
  player,
  turnNumber,
  turnPhase,
  isMyTurn,
  onPlayKnight,
  onPlayMonopoly,
  onPlayYearOfPlenty,
  onPlayRoadBuilding,
}: PlayerHandProps) {
  const [picker, setPicker] = useState<'monopoly' | 'yearOfPlenty' | null>(null);
  const [yopFirst, setYopFirst] = useState<ResourceType | null>(null);

  // Group dev cards by type
  const grouped: Record<string, { count: number; playable: number }> = {};
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

  const hasDevCards = Object.keys(grouped).length > 0;

  return (
    <div style={handContainerStyle}>
      {/* Resource picker overlay for dev cards */}
      {picker && (
        <div style={pickerOverlayStyle}>
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
                style={pickerBtnStyle}
              >
                <ResourceIcon resource={r} size={16} />
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setPicker(null); setYopFirst(null); }}
            style={{ marginTop: '8px', padding: '4px 12px', borderRadius: '4px', border: 'none', background: '#333', color: '#aaa', cursor: 'pointer', fontSize: '0.8em' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Resource cards */}
      <div style={cardGroupStyle}>
        {ALL_RESOURCES.map((r) => {
          const count = player.resources[r];
          const color = RESOURCE_COLORS[r];
          return (
            <div
              key={r}
              style={{
                ...resourceCardStyle,
                borderColor: count > 0 ? color : '#333',
                opacity: count > 0 ? 1 : 0.4,
                background: count > 0
                  ? `linear-gradient(135deg, rgba(0,0,0,0.6), ${color}22)`
                  : 'rgba(0,0,0,0.4)',
              }}
              title={`${RESOURCE_LABELS[r]}: ${count}`}
            >
              <ResourceIcon resource={r} size={16} />
              <span style={cardCountStyle}>{count}</span>
              <span style={cardLabelStyle}>{RESOURCE_LABELS[r]}</span>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      {hasDevCards && (
        <div style={separatorStyle} />
      )}

      {/* Dev cards */}
      {hasDevCards && (
        <div style={cardGroupStyle}>
          {Object.entries(grouped).map(([type, info]) => {
            const t = type as DevCardType;
            const cardInfo = DEV_CARD_INFO[t];
            const playable = canPlay(t);
            return (
              <button
                key={t}
                disabled={!playable}
                onClick={() => playable && handlePlay(t)}
                title={`${cardInfo.label} (${info.count}) - ${cardInfo.desc}${playable ? ' - Click to play!' : ''}`}
                style={{
                  ...devCardStyle,
                  borderColor: playable ? cardInfo.color : '#444',
                  background: playable
                    ? `linear-gradient(135deg, rgba(0,0,0,0.5), ${cardInfo.color}33)`
                    : 'rgba(0,0,0,0.4)',
                  cursor: playable ? 'pointer' : 'default',
                  boxShadow: playable ? `0 0 8px ${cardInfo.color}66` : 'none',
                }}
              >
                <span style={{ fontSize: '1.1em' }}>{cardInfo.icon}</span>
                <span style={cardCountStyle}>{info.count}</span>
                <span style={{ ...cardLabelStyle, color: playable ? '#ddd' : '#666' }}>
                  {cardInfo.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const handContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '3px',
  padding: '4px 6px',
  background: 'linear-gradient(180deg, rgba(26,26,46,0.95), rgba(26,26,46,1))',
  borderTop: '1px solid #2a2a4a',
  position: 'relative',
  flexWrap: 'wrap',
};

const cardGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '3px',
  alignItems: 'flex-end',
};

const resourceCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1px',
  minWidth: '36px',
  flex: '1 1 36px',
  maxWidth: '48px',
  height: '52px',
  borderRadius: '5px',
  border: '2px solid',
  padding: '3px 1px',
  transition: 'all 0.2s ease',
};

const devCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1px',
  minWidth: '36px',
  flex: '1 1 36px',
  maxWidth: '48px',
  height: '52px',
  borderRadius: '5px',
  border: '2px solid',
  padding: '3px 1px',
  transition: 'all 0.2s ease',
  color: '#fff',
};

const cardCountStyle: React.CSSProperties = {
  fontSize: '0.85em',
  fontWeight: 'bold',
  color: '#fff',
  lineHeight: 1,
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: '0.5em',
  color: '#999',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  lineHeight: 1,
};

const separatorStyle: React.CSSProperties = {
  width: '1px',
  height: '40px',
  background: '#444',
  margin: '0 2px',
  flexShrink: 0,
};

const pickerOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginBottom: '4px',
  background: '#1a1a2e',
  border: '1px solid #444',
  borderRadius: '8px',
  padding: '10px',
  zIndex: 50,
  boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
  width: 'calc(100vw - 24px)',
  maxWidth: '320px',
};

const pickerBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #555',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '0.85em',
};
