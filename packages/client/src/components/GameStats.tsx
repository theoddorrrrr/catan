import React from 'react';
import { GameState, Player, ALL_RESOURCES, ResourceType } from '@catan/shared';
import { PLAYER_COLORS } from '../renderer/colors';
import { ResourceIcon } from './ResourceIcon';

interface GameStatsProps {
  state: GameState;
  humanPlayerId: string | null;
  onPlayAgain: () => void;
}

export function GameStats({ state, humanPlayerId, onPlayAgain }: GameStatsProps) {
  const winner = state.players.find((p) => p.id === state.winnerId);
  const duration = state.eventLog.length > 0
    ? Math.round((state.eventLog[state.eventLog.length - 1].timestamp - state.gameStartTimestamp) / 1000)
    : 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  // Dice distribution
  const diceDistribution: Record<number, number> = {};
  for (let i = 2; i <= 12; i++) diceDistribution[i] = 0;
  for (const entry of state.diceRollHistory) {
    diceDistribution[entry.roll]++;
  }
  const maxRolls = Math.max(...Object.values(diceDistribution), 1);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)',
      zIndex: 30,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '24px',
      overflowY: 'auto',
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '24px 32px',
        maxWidth: '700px',
        width: '100%',
        border: '2px solid #f1c40f',
      }}>
        {/* Winner */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#f1c40f' }}>
            {winner?.id === humanPlayerId ? 'You Win!' : `${winner?.name} Wins!`}
          </div>
          <div style={{ color: '#aaa', marginTop: '4px' }}>
            {state.turnNumber} turns | {minutes}m {seconds}s
          </div>
        </div>

        {/* VP Breakdown */}
        <h3 style={{ color: '#f1c40f', margin: '12px 0 8px', fontSize: '0.95em' }}>Victory Points</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #444' }}>
              <th style={thStyle}>Player</th>
              <th style={thStyle}>Settlements</th>
              <th style={thStyle}>Cities</th>
              <th style={thStyle}>Longest Road</th>
              <th style={thStyle}>Largest Army</th>
              <th style={thStyle}>VP Cards</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {state.players.map((p) => (
              <tr key={p.id} style={{
                borderBottom: '1px solid #333',
                background: p.id === state.winnerId ? 'rgba(241,196,15,0.1)' : undefined,
              }}>
                <td style={{ ...tdStyle, color: PLAYER_COLORS[p.color], fontWeight: 'bold' }}>{p.name}</td>
                <td style={tdStyle}>{p.settlements.length}</td>
                <td style={tdStyle}>{p.cities.length * 2}</td>
                <td style={tdStyle}>{p.hasLongestRoad ? '2' : '-'}</td>
                <td style={tdStyle}>{p.hasLargestArmy ? '2' : '-'}</td>
                <td style={tdStyle}>{p.hiddenVP || '-'}</td>
                <td style={{ ...tdStyle, fontWeight: 'bold', color: '#f1c40f' }}>{p.victoryPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Buildings */}
        <h3 style={{ color: '#f1c40f', margin: '16px 0 8px', fontSize: '0.95em' }}>Buildings</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {state.players.map((p) => (
            <div key={p.id} style={{
              flex: '1 1 120px',
              padding: '8px',
              borderRadius: '6px',
              border: `1px solid ${PLAYER_COLORS[p.color]}40`,
              background: 'rgba(0,0,0,0.2)',
              fontSize: '0.8em',
            }}>
              <div style={{ fontWeight: 'bold', color: PLAYER_COLORS[p.color], marginBottom: '4px' }}>{p.name}</div>
              <div>🏠 {p.settlements.length} settlements</div>
              <div>🏰 {p.cities.length} cities</div>
              <div>🛤 {p.roads.length} roads</div>
              <div>⚔ {p.knightsPlayed} knights</div>
            </div>
          ))}
        </div>

        {/* Dice Distribution */}
        <h3 style={{ color: '#f1c40f', margin: '16px 0 8px', fontSize: '0.95em' }}>Dice Distribution ({state.diceRollHistory.length} rolls)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px', padding: '0 4px' }}>
          {Object.entries(diceDistribution).map(([num, count]) => {
            const height = (count / maxRolls) * 60;
            const is6or8 = num === '6' || num === '8';
            return (
              <div key={num} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '0.65em', color: '#aaa' }}>{count}</span>
                <div style={{
                  width: '100%',
                  height: `${height}px`,
                  background: is6or8 ? '#c0392b' : '#3498db',
                  borderRadius: '2px 2px 0 0',
                  minHeight: count > 0 ? '4px' : '0',
                }} />
                <span style={{ fontSize: '0.7em', color: is6or8 ? '#c0392b' : '#888', fontWeight: is6or8 ? 'bold' : 'normal' }}>{num}</span>
              </div>
            );
          })}
        </div>

        {/* Play Again */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={onPlayAgain}
            style={{
              padding: '10px 32px',
              borderRadius: '8px',
              border: 'none',
              background: '#f1c40f',
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1.1em',
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '4px 6px',
  color: '#888',
  fontWeight: 'normal',
};

const tdStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '4px 6px',
  color: '#ccc',
};
