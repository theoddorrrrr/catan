import React, { useState, useEffect } from 'react';
import { LobbyRoom, ALL_PLAYER_COLORS, SeafarersScenario, getScenarioNames, SEAFARERS_SCENARIOS } from '@catan/shared';
import { socketManager, ConnectionStatus } from '../network/socket-manager';
import { PLAYER_COLORS } from '../renderer/colors';

interface LobbyViewProps {
  roomCode: string;
  playerId: string;
  onGameStart: () => void;
  onLeave: () => void;
}

export function LobbyView({ roomCode, playerId, onGameStart, onLeave }: LobbyViewProps) {
  const [room, setRoom] = useState<LobbyRoom | null>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('connected');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubLobby = socketManager.onLobbyUpdate((r) => {
      setRoom(r);
    });

    const unsubGame = socketManager.onGameState(() => {
      onGameStart();
    });

    const unsubConn = socketManager.onConnectionChange((status) => {
      setConnStatus(status);
    });

    return () => {
      unsubLobby();
      unsubGame();
      unsubConn();
    };
  }, [onGameStart]);

  const isHost = room?.hostPlayerId === playerId;

  async function handleStart() {
    setError('');
    const result = await socketManager.startGame();
    if (!result.ok) {
      setError(result.error || 'Failed to start');
    }
  }

  function handleLeave() {
    socketManager.leave();
    onLeave();
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleSeafarers() {
    if (!room || !isHost) return;
    const enabled = !room.config.seafarersEnabled;
    const scenario = enabled ? getScenarioNames()[0].id : null;
    const vp = enabled && scenario ? SEAFARERS_SCENARIOS[scenario].victoryPointsToWin : 10;
    socketManager.setConfig({ seafarersEnabled: enabled, seafarersScenario: scenario, victoryPointsToWin: vp });
  }

  function setScenario(scenario: string) {
    if (!room || !isHost) return;
    const scenarioId = scenario as SeafarersScenario;
    const vp = SEAFARERS_SCENARIOS[scenarioId]?.victoryPointsToWin ?? 10;
    socketManager.setConfig({ seafarersScenario: scenarioId, victoryPointsToWin: vp });
  }

  function setVictoryPoints(vp: number) {
    if (!room || !isHost) return;
    socketManager.setConfig({ victoryPointsToWin: vp });
  }

  function toggleSlot(index: number) {
    if (!room) return;
    const slot = room.slots[index];
    if (slot.type === 'human') return;
    socketManager.setSlotType(index, slot.type === 'bot' ? 'open' : 'bot');
  }

  function toggleReady() {
    if (!room) return;
    const mySlot = room.slots.find((s) => s.playerId === playerId);
    if (mySlot) {
      socketManager.setReady(!mySlot.ready);
    }
  }

  const mySlot = room?.slots.find((s) => s.playerId === playerId);
  const allHumansReady = room?.slots
    .filter((s) => s.type === 'human')
    .every((s) => s.ready) ?? false;
  const activeCount = room?.slots.filter((s) => s.type !== 'open').length ?? 0;
  const canStart = isHost && allHumansReady && activeCount >= 2;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0e0e1a',
      color: '#eee',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Connection status */}
      {connStatus !== 'connected' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          padding: '6px',
          background: connStatus === 'reconnecting' ? '#f39c12' : '#e74c3c',
          color: '#fff',
          textAlign: 'center',
          fontSize: '0.85em',
          zIndex: 50,
        }}>
          {connStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
        </div>
      )}

      <h1 style={{ fontSize: '2em', marginBottom: '4px', color: '#f1c40f' }}>Game Lobby</h1>

      {/* Room code */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
      }}>
        <span style={{ color: '#888', fontSize: '0.9em' }}>Room:</span>
        <span style={{
          fontSize: '1.8em',
          fontWeight: 'bold',
          letterSpacing: '4px',
          color: '#3498db',
          fontFamily: 'monospace',
        }}>
          {roomCode}
        </span>
        <button onClick={copyCode} style={{
          padding: '4px 10px',
          borderRadius: '4px',
          border: 'none',
          background: '#333',
          color: copied ? '#27ae60' : '#aaa',
          cursor: 'pointer',
          fontSize: '0.8em',
        }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Player slots */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '360px',
        maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {room?.slots.map((slot, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: slot.type === 'open' ? '#0e0e1a' : 'rgba(255,255,255,0.04)',
              border: slot.playerId === playerId ? '1px solid #3498db' : '1px solid #333',
            }}>
              {/* Color dot */}
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: PLAYER_COLORS[slot.color],
                opacity: slot.type === 'open' ? 0.3 : 1,
              }} />

              {/* Name */}
              <div style={{ flex: 1 }}>
                {slot.type === 'human' && (
                  <span style={{ fontWeight: 'bold' }}>
                    {slot.playerName}
                    {slot.playerId === room.hostPlayerId && (
                      <span style={{ color: '#f1c40f', fontSize: '0.8em', marginLeft: '6px' }}>HOST</span>
                    )}
                  </span>
                )}
                {slot.type === 'bot' && (
                  <span style={{ color: '#888' }}>{slot.playerName || `Bot ${i + 1}`}</span>
                )}
                {slot.type === 'open' && (
                  <span style={{ color: '#555', fontStyle: 'italic' }}>Open slot</span>
                )}
              </div>

              {/* Ready status */}
              {slot.type === 'human' && (
                <span style={{
                  fontSize: '0.8em',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: slot.ready ? '#27ae6030' : '#e74c3c30',
                  color: slot.ready ? '#27ae60' : '#e74c3c',
                }}>
                  {slot.ready ? 'Ready' : 'Not Ready'}
                </span>
              )}
              {slot.type === 'bot' && (
                <span style={{ fontSize: '0.75em', color: '#888' }}>BOT</span>
              )}

              {/* Host can toggle non-human slots */}
              {isHost && slot.type !== 'human' && (
                <button onClick={() => toggleSlot(i)} style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#333',
                  color: '#aaa',
                  cursor: 'pointer',
                  fontSize: '0.75em',
                }}>
                  {slot.type === 'bot' ? 'Open' : 'Add Bot'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Game settings (host only) */}
        {isHost && room && (
          <div style={{
            borderTop: '1px solid #333',
            paddingTop: '12px',
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Settings
            </div>

            {/* Victory Points */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85em', color: '#ccc' }}>Victory Points:</span>
              <input
                type="number"
                min={5}
                max={20}
                value={room.config.victoryPointsToWin ?? 10}
                onChange={(e) => setVictoryPoints(Math.max(5, Math.min(20, parseInt(e.target.value) || 10)))}
                style={{
                  width: '52px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#0e0e1a',
                  color: '#f1c40f',
                  fontSize: '0.9em',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              />
            </div>

            {/* Expansion */}
            <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Expansion
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em' }}>
                <input
                  type="checkbox"
                  checked={!!room.config.seafarersEnabled}
                  onChange={toggleSeafarers}
                  style={{ accentColor: '#3498db' }}
                />
                Seafarers
              </label>
            </div>
            {room.config.seafarersEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8em', color: '#888' }}>Scenario:</span>
                <select
                  value={room.config.seafarersScenario || ''}
                  onChange={(e) => setScenario(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    background: '#0e0e1a',
                    color: '#eee',
                    fontSize: '0.85em',
                  }}
                >
                  {getScenarioNames().map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Show game info for non-host */}
        {!isHost && room && (
          <div style={{
            borderTop: '1px solid #333',
            paddingTop: '12px',
            marginBottom: '12px',
            fontSize: '0.85em',
            color: '#ccc',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <span>Victory Points to win: <strong style={{ color: '#f1c40f' }}>{room.config.victoryPointsToWin ?? 10}</strong></span>
            {room.config.seafarersEnabled && (
              <span style={{ color: '#3498db' }}>
                Seafarers expansion enabled
                {room.config.seafarersScenario && (
                  <span style={{ color: '#888' }}>
                    {' — '}{getScenarioNames().find((s) => s.id === room.config.seafarersScenario)?.name || room.config.seafarersScenario}
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        {error && (
          <p style={{ color: '#e74c3c', fontSize: '0.85em', textAlign: 'center', marginBottom: '8px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleLeave} style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: '#333',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: '0.95em',
          }}>
            Leave
          </button>

          {!isHost && (
            <button onClick={toggleReady} style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: mySlot?.ready ? '#e74c3c' : '#27ae60',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95em',
            }}>
              {mySlot?.ready ? 'Unready' : 'Ready'}
            </button>
          )}

          {isHost && (
            <>
              <button onClick={toggleReady} style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: mySlot?.ready ? '#e74c3c' : '#27ae60',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.95em',
              }}>
                {mySlot?.ready ? 'Unready' : 'Ready'}
              </button>
              <button onClick={handleStart} disabled={!canStart} style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: canStart ? '#f1c40f' : '#333',
                color: canStart ? '#000' : '#666',
                fontWeight: 'bold',
                cursor: canStart ? 'pointer' : 'not-allowed',
                fontSize: '0.95em',
              }}>
                Start Game
              </button>
            </>
          )}
        </div>

        <p style={{ color: '#555', fontSize: '0.75em', textAlign: 'center', marginTop: '12px' }}>
          Share the room code with friends to play together
        </p>
      </div>
    </div>
  );
}
