import React from 'react';
import { Player, ResourceBundle, totalResources, ALL_RESOURCES } from '@catan/shared';
import { PLAYER_COLORS } from '../renderer/colors';
import { ResourceIcon } from './ResourceIcon';

interface PlayerHudProps {
  players: Player[];
  currentPlayerIndex: number;
  humanPlayerId: string | null;
  bank: ResourceBundle;
}

export function PlayerHud({ players, currentPlayerIndex, humanPlayerId, bank }: PlayerHudProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '3px 6px' }}>
      {/* Player strip */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {players.map((player, i) => {
          const isCurrent = i === currentPlayerIndex;
          return (
            <div
              key={player.id}
              style={{
                flex: '1 1 0',
                minWidth: '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '1px',
                border: `2px solid ${isCurrent ? PLAYER_COLORS[player.color] : '#333'}`,
                borderRadius: '6px',
                padding: '4px 6px',
                background: isCurrent ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
                overflow: 'hidden',
              }}
            >
              {/* Name + VP */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontWeight: 'bold',
                  color: PLAYER_COLORS[player.color],
                  fontSize: '0.75em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}>
                  {player.name}
                  {player.isBot ? ' (Bot)' : ''}
                </span>
                <span style={{
                  fontSize: '0.7em',
                  fontWeight: 'bold',
                  background: PLAYER_COLORS[player.color],
                  color: '#000',
                  borderRadius: '3px',
                  padding: '1px 4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {player.victoryPoints}VP
                </span>
              </div>

              {/* Compact stats + badges in one row */}
              <div style={{ fontSize: '0.65em', color: '#aaa', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span title="Total cards">🃏{totalResources(player.resources)}</span>
                <span title="Dev cards">📜{player.devCards.length}</span>
                <span>🛣{player.roads.length}</span>
                {player.hasLongestRoad && <span style={{ color: '#f1c40f' }}>🛤</span>}
                {player.hasLargestArmy && <span style={{ color: '#f1c40f' }}>⚔</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bank inventory */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.7em',
        color: '#888',
        padding: '1px 4px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 'bold', color: '#aaa' }}>Bank:</span>
        {ALL_RESOURCES.map((r) => (
          <span key={r} style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
            <ResourceIcon resource={r} size={11} />
            {bank[r]}
          </span>
        ))}
      </div>
    </div>
  );
}
