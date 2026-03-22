import React, { useEffect, useRef, useState } from 'react';
import { TimestampedEvent, GameEvent, ResourceType, ResourceBundle } from '@catan/shared';

interface GameLogProps {
  events: TimestampedEvent[];
  playerNames: Record<string, string>;
}

function formatResources(bundle: ResourceBundle): string {
  const parts: string[] = [];
  for (const [res, count] of Object.entries(bundle)) {
    if (count > 0) parts.push(`${count} ${res}`);
  }
  return parts.join(', ') || 'nothing';
}

function eventToText(event: GameEvent, names: Record<string, string>): string | null {
  const name = (id: string) => names[id] || id;

  switch (event.type) {
    case 'gameStarted': return 'Game started!';
    case 'turnStarted': return `Turn ${event.turnNumber} - ${names[Object.keys(names)[event.playerIndex]] || `Player ${event.playerIndex + 1}`}`;
    case 'setupTurnStarted': return `Setup round ${event.round} - Player ${event.playerIndex + 1}`;
    case 'diceRolled': return `Rolled ${event.values[0]}+${event.values[1]} = ${event.total}`;
    case 'resourcesDistributed': {
      const parts = Object.entries(event.distributions)
        .map(([pid, res]) => `${name(pid)}: ${formatResources(res)}`)
        .join('; ');
      return `Resources: ${parts}`;
    }
    case 'noResourcesProduced': return `No resources produced (rolled ${event.roll})`;
    case 'settlementBuilt': return `${name(event.playerId)} built a settlement`;
    case 'cityBuilt': return `${name(event.playerId)} built a city`;
    case 'roadBuilt': return `${name(event.playerId)} built a road`;
    case 'devCardBought': return `${name(event.playerId)} bought a development card`;
    case 'knightPlayed': return `${name(event.playerId)} played a knight`;
    case 'robberMoved': return `${name(event.movedByPlayerId)} moved the robber`;
    case 'resourceStolen': return `${name(event.byPlayerId)} stole from ${name(event.fromPlayerId)}`;
    case 'resourcesDiscarded': return `${name(event.playerId)} discarded ${formatResources(event.resources)}`;
    case 'bankTradeCompleted': return `${name(event.playerId)} traded with bank`;
    case 'monopolyPlayed': return `${name(event.playerId)} played Monopoly on ${event.resource}, took ${event.amountTaken}`;
    case 'yearOfPlentyPlayed': return `${name(event.playerId)} played Year of Plenty: ${event.resources.join(', ')}`;
    case 'longestRoadChanged': return event.playerId ? `${name(event.playerId)} now has Longest Road (${event.length})` : null;
    case 'largestArmyChanged': return event.playerId ? `${name(event.playerId)} now has Largest Army (${event.size})` : null;
    case 'turnEnded': return null;
    case 'gameWon': return `${name(event.winnerId)} WINS!`;
    case 'initialResourcesGranted': return `${name(event.playerId)} received starting resources: ${formatResources(event.resources)}`;
    default: return null;
  }
}

export function GameLog({ events, playerNames }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const messages = events
    .map((te, i) => ({ text: eventToText(te.event, playerNames), key: i }))
    .filter((m) => m.text !== null);

  const visible = messages.slice(-50);

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '320px',
      maxWidth: '50vw',
      zIndex: 10,
      pointerEvents: 'auto',
    }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'block',
          width: '100%',
          background: 'rgba(0,0,0,0.7)',
          color: '#aaa',
          border: 'none',
          borderTopRightRadius: '8px',
          padding: '4px 8px',
          fontSize: '0.75em',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {collapsed ? '▶ Log' : '▼ Log'} ({messages.length})
      </button>
      {!collapsed && (
        <div
          ref={scrollRef}
          style={{
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '6px 8px',
            fontSize: '0.75em',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            borderTopRightRadius: '0',
          }}
        >
          {visible.map((m) => (
            <div key={m.key} style={{ padding: '1px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {m.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
