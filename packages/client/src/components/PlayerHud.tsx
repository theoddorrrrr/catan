import React from 'react';
import { Player, ResourceType, totalResources } from '@catan/shared';
import { PLAYER_COLORS } from '../renderer/colors';

interface PlayerHudProps {
  players: Player[];
  currentPlayerIndex: number;
}

const RESOURCE_EMOJI: Record<ResourceType, string> = {
  [ResourceType.Brick]: 'B',
  [ResourceType.Lumber]: 'L',
  [ResourceType.Ore]: 'O',
  [ResourceType.Grain]: 'G',
  [ResourceType.Wool]: 'W',
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Brick]: '#c45a2c',
  [ResourceType.Lumber]: '#2d6a2d',
  [ResourceType.Ore]: '#8a8a8a',
  [ResourceType.Grain]: '#e8c44a',
  [ResourceType.Wool]: '#7ec850',
};

export function PlayerHud({ players, currentPlayerIndex }: PlayerHudProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
      {players.map((player, i) => (
        <div
          key={player.id}
          style={{
            border: `2px solid ${i === currentPlayerIndex ? PLAYER_COLORS[player.color] : '#444'}`,
            borderRadius: '8px',
            padding: '8px',
            background: i === currentPlayerIndex ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', color: PLAYER_COLORS[player.color] }}>
              {player.name}
              {player.isBot ? ' (Bot)' : ''}
            </span>
            <span style={{
              fontSize: '1.1em',
              fontWeight: 'bold',
              background: PLAYER_COLORS[player.color],
              color: '#000',
              borderRadius: '4px',
              padding: '2px 6px',
            }}>
              {player.victoryPoints} VP
            </span>
          </div>

          {/* Resources */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', fontSize: '0.85em' }}>
            {Object.entries(player.resources).map(([res, count]) => (
              <span
                key={res}
                style={{
                  background: RESOURCE_COLORS[res as ResourceType],
                  color: '#fff',
                  borderRadius: '3px',
                  padding: '1px 4px',
                  fontWeight: 'bold',
                  minWidth: '24px',
                  textAlign: 'center',
                }}
              >
                {RESOURCE_EMOJI[res as ResourceType]}{count}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div style={{ fontSize: '0.75em', color: '#aaa', marginTop: '4px', display: 'flex', gap: '8px' }}>
            <span>Roads: {player.roads.length}</span>
            <span>Dev: {player.devCards.length}</span>
            {player.hasLongestRoad && <span style={{ color: '#f1c40f' }}>Longest Road</span>}
            {player.hasLargestArmy && <span style={{ color: '#f1c40f' }}>Largest Army</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
