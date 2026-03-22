import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { StartScreen } from './components/StartScreen';
import { GameView } from './components/GameView';
import { LobbyView } from './components/LobbyView';

const rootStyle = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { overflow: hidden; background: #0e0e1a; }
`;

type Screen =
  | { type: 'start' }
  | { type: 'practice'; mode: 'spectate' | 'play'; playerName: string }
  | { type: 'lobby'; roomCode: string; playerId: string }
  | { type: 'online-game'; roomCode: string; playerId: string };

function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'start' });

  return (
    <>
      <style>{rootStyle}</style>
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
          onLeave={() => setScreen({ type: 'start' })}
        />
      )}
      {screen.type === 'online-game' && (
        <GameView
          source="online"
          mode="play"
          playerName=""
          roomCode={screen.roomCode}
          playerId={screen.playerId}
          onBack={() => setScreen({ type: 'start' })}
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
