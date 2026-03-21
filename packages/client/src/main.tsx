import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameView } from './components/GameView';

const rootStyle = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { overflow: hidden; background: #0e0e1a; }
`;

function App() {
  return (
    <>
      <style>{rootStyle}</style>
      <GameView />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
