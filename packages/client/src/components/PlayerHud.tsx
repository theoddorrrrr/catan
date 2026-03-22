import React from 'react';
import { Player, ResourceType, ResourceBundle, totalResources, ALL_RESOURCES } from '@catan/shared';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 8px' }}>
      {/* Player strip */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {players.map((player, i) => {
          const isCurrent = i === currentPlayerIndex;
          const isHuman = player.id === humanPlayerId;
          return (
            <div
              key={player.id}
              style={{
                flex: '1 1 0',
                minWidth: '140px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                border: `2px solid ${isCurrent ? PLAYER_COLORS[player.color] : '#333'}`,
                borderRadius: '8px',
                padding: '6px 8px',
                background: isCurrent ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
              }}
            >
              {/* Name + VP */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontWeight: 'bold',
                  color: PLAYER_COLORS[player.color],
                  fontSize: '0.85em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {player.name}
                  {player.isBot ? ' (Bot)' : ''}
                </span>
                <span style={{
                  fontSize: '0.8em',
                  fontWeight: 'bold',
                  background: PLAYER_COLORS[player.color],
                  color: '#000',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  whiteSpace: 'nowrap',
                }}>
                  {player.victoryPoints} VP
                </span>
              </div>

              {/* Resources: full detail for human, total count for enemies */}
              {isHuman ? (
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                  {ALL_RESOURCES.map((r) => (
                    <span
                      key={r}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '0.8em',
                        fontWeight: 'bold',
                        color: '#fff',
                      }}
                    >
                      <ResourceIcon resource={r} size={14} />
                      {player.resources[r]}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.75em', color: '#aaa', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span title="Total cards">🃏 {totalResources(player.resources)}</span>
                  <span title="Dev cards">📜 {player.devCards.length}</span>
                </div>
              )}

              {/* Badges */}
              <div style={{ fontSize: '0.7em', color: '#888', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {player.hasLongestRoad && <span style={{ color: '#f1c40f' }}>🛤 Longest</span>}
                {player.hasLargestArmy && <span style={{ color: '#f1c40f' }}>⚔ Army</span>}
                {isHuman && <span>🛣 {player.roads.length}</span>}
                {isHuman && <span>📜 {player.devCards.length}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bank inventory */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.75em',
        color: '#888',
        padding: '2px 4px',
      }}>
        <span style={{ fontWeight: 'bold', color: '#aaa' }}>Bank:</span>
        {ALL_RESOURCES.map((r) => (
          <span key={r} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ResourceIcon resource={r} size={12} />
            {bank[r]}
          </span>
        ))}
      </div>
    </div>
  );
}
