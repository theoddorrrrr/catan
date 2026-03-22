import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { StartScreen } from './components/StartScreen';
import { GameView } from './components/GameView';
import { LobbyView } from './components/LobbyView';
import { socketManager } from './network/socket-manager';

const rootStyle = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { overflow: hidden; background: #0e0e1a; }
`;

type Screen =
  | { type: 'reconnecting' }
  | { type: 'start' }
  | { type: 'practice'; mode: 'spectate' | 'play'; playerName: string }
  | { type: 'lobby'; roomCode: string; playerId: string }
  | { type: 'online-game'; roomCode: string; playerId: string };

function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'reconnecting' });
  const [takenOverMsg, setTakenOverMsg] = useState(false);

  useEffect(() => {
    // Check for reconnect token in URL (cross-device play)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('catan_session_token', urlToken);
      window.history.replaceState({}, '', '/');
    }

    // Check if we have a saved session to reconnect to
    const savedToken = urlToken || localStorage.getItem('catan_session_token');
    if (!savedToken) {
      setScreen({ type: 'start' });
      return;
    }

    // Attempt reconnection
    socketManager.attemptReconnect(urlToken || undefined).then((result) => {
      if (result.ok) {
        if (result.roomStatus === 'in_progress') {
          setScreen({ type: 'online-game', roomCode: result.roomCode, playerId: result.playerId });
        } else {
          setScreen({ type: 'lobby', roomCode: result.roomCode, playerId: result.playerId });
        }
      } else {
        setScreen({ type: 'start' });
      }
    });
  }, []);

  // Listen for session takeover
  useEffect(() => {
    const unsub = socketManager.onSessionTakenOver(() => {
      setTakenOverMsg(true);
      setScreen({ type: 'start' });
      setTimeout(() => setTakenOverMsg(false), 5000);
    });
    return unsub;
  }, []);

  const goToStart = useCallback(() => {
    socketManager.leave();
    setScreen({ type: 'start' });
  }, []);

  return (
    <>
      <style>{rootStyle}</style>

      {/* Session taken over banner */}
      {takenOverMsg && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: '10px', background: '#e74c3c', color: '#fff',
          textAlign: 'center', fontSize: '0.9em',
        }}>
          Your session was taken over by another device.
        </div>
      )}

      {screen.type === 'reconnecting' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#0e0e1a', color: '#eee',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <h1 style={{ fontSize: '2em', color: '#f1c40f', marginBottom: '16px' }}>Catan</h1>
          <p style={{ color: '#888' }}>Reconnecting...</p>
        </div>
      )}
      {screen.type === 'start' && (
        <StartScreen
          onPractice={(mode, playerName) =>
            setScreen({ type: 'practice', mode, playerName })
          }
          onLobbyJoined={(roomCode, playerId) =>
            setScreen({ type: 'lobby', roomCode, playerId })
          }
        />
      )}
      {screen.type === 'practice' && (
        <GameView
          source="local"
          mode={screen.mode}
          playerName={screen.playerName}
          onBack={() => setScreen({ type: 'start' })}
        />
      )}
      {screen.type === 'lobby' && (
        <LobbyView
          roomCode={screen.roomCode}
          playerId={screen.playerId}
          onGameStart={() =>
            setScreen({ type: 'online-game', roomCode: screen.roomCode, playerId: screen.playerId })
          }
          onLeave={goToStart}
        />
      )}
      {screen.type === 'online-game' && (
        <GameView
          source="online"
          mode="play"
          playerName=""
          roomCode={screen.roomCode}
          playerId={screen.playerId}
          onBack={goToStart}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
