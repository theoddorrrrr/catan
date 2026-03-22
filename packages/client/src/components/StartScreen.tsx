import React, { useState } from 'react';
import { socketManager } from '../network/socket-manager';

interface StartScreenProps {
  onPractice: (mode: 'spectate' | 'play', playerName: string) => void;
  onLobbyJoined: (roomCode: string, playerId: string) => void;
}

export function StartScreen({ onPractice, onLobbyJoined }: StartScreenProps) {
  const [name, setName] = useState('Player');
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      socketManager.connect();
      const { roomCode, playerId } = await socketManager.createRoom(name || 'Player');
      onLobbyJoined(roomCode, playerId);
    } catch (e: any) {
      setError(e.message || 'Failed to create game');
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (loading || !joinCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      socketManager.connect();
      const { playerId } = await socketManager.joinRoom(joinCode.trim(), name || 'Player');
      onLobbyJoined(joinCode.trim().toUpperCase(), playerId);
    } catch (e: any) {
      setError(e.message || 'Failed to join game');
    }
    setLoading(false);
  }

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
      <h1 style={{ fontSize: '3em', marginBottom: '8px', color: '#f1c40f' }}>Catan</h1>
      <p style={{ color: '#888', marginBottom: '32px' }}>Web Board Game</p>

      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minWidth: '320px',
      }}>
        <label style={{ fontSize: '0.9em', color: '#aaa' }}>
          Your Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              marginTop: '4px',
              borderRadius: '6px',
              border: '1px solid #444',
              background: '#0e0e1a',
              color: '#fff',
              fontSize: '1em',
            }}
          />
        </label>

        <div style={{ borderTop: '1px solid #333', margin: '4px 0', paddingTop: '12px' }}>
          <p style={{ color: '#888', fontSize: '0.8em', marginBottom: '8px' }}>Online Multiplayer</p>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          style={btnStyle('#3498db', loading)}
        >
          Create Online Game
        </button>

        {!showJoin ? (
          <button onClick={() => setShowJoin(true)} style={btnStyle('#8e44ad')}>
            Join Game
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={5}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#0e0e1a',
                color: '#fff',
                fontSize: '1em',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                textAlign: 'center',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button onClick={handleJoin} disabled={loading || !joinCode.trim()} style={btnStyle('#8e44ad', loading || !joinCode.trim())}>
              Join
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: '#e74c3c', fontSize: '0.85em', textAlign: 'center' }}>{error}</p>
        )}

        <div style={{ borderTop: '1px solid #333', margin: '4px 0', paddingTop: '12px' }}>
          <p style={{ color: '#888', fontSize: '0.8em', marginBottom: '8px' }}>Practice (Offline)</p>
        </div>

        <button
          onClick={() => onPractice('play', name || 'Player')}
          style={btnStyle('#27ae60')}
        >
          Practice vs Bots
        </button>

        <button
          onClick={() => onPractice('spectate', name)}
          style={btnStyle('#2c3e50')}
        >
          Spectate Bots
        </button>
      </div>
    </div>
  );
}

function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: disabled ? '#333' : bg,
    color: disabled ? '#666' : '#fff',
    fontSize: '1em',
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
