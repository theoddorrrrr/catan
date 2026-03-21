import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  GamePhase,
  GameEngine,
  createGame,
  SeededRandom,
} from '@catan/shared';
import { BoardGraph } from '@catan/shared';
import { SvgRenderer } from '../renderer/SvgRenderer';
import { PlayerHud } from './PlayerHud';
import { GameLog } from './GameLog';
import { DiceDisplay } from './DiceDisplay';
import { GameControls } from './GameControls';
import { runBotAction } from '../game/bot-runner';

export function GameView() {
  const [state, setState] = useState<GameState | null>(null);
  const [graph, setGraph] = useState<BoardGraph | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [speed, setSpeed] = useState(2);
  const [paused, setPaused] = useState(false);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);

  stateRef.current = state;
  pausedRef.current = paused;
  speedRef.current = speed;

  const startNewGame = useCallback(() => {
    const seed = Math.floor(Math.random() * 2147483647);
    const { state: newState, graph: newGraph } = createGame('browser-game', {
      playerCount: 4,
      boardSeed: seed,
      victoryPointsToWin: 10,
      robberEnabled: true,
      devCardsEnabled: true,
    });
    const rng = new SeededRandom(seed + 1);
    const newEngine = new GameEngine(newGraph, rng);

    setState(newState);
    setGraph(newGraph);
    setEngine(newEngine);
    setPaused(false);
  }, []);

  // Start game on mount
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Bot game loop
  useEffect(() => {
    if (!engine || !graph) return;

    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const currentState = stateRef.current;
      if (!currentState || currentState.phase === GamePhase.Finished || pausedRef.current) {
        timer = setTimeout(tick, 100);
        return;
      }

      try {
        const { newState, finished } = runBotAction(currentState, engine!, graph!);
        setState(newState);
      } catch (e) {
        console.error('Bot error:', e);
        setPaused(true);
      }

      const delay = Math.max(100, 500 / speedRef.current);
      timer = setTimeout(tick, delay);
    }

    timer = setTimeout(tick, 500); // Initial delay
    return () => clearTimeout(timer);
  }, [engine, graph]);

  if (!state || !graph) {
    return <div style={{ color: '#fff', padding: '20px' }}>Loading...</div>;
  }

  const playerNames: Record<string, string> = {};
  state.players.forEach((p) => { playerNames[p.id] = p.name; });

  const isFinished = state.phase === GamePhase.Finished;
  const winner = isFinished ? state.players.find((p) => p.id === state.winnerId) : null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 280px',
      gridTemplateRows: 'auto 1fr auto',
      height: '100vh',
      background: '#0e0e1a',
      color: '#eee',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        gridColumn: '1 / -1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#1a1a2e',
        borderBottom: '1px solid #333',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.3em' }}>Catan</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <DiceDisplay dice={state.lastDiceRoll} />
          <span style={{ fontSize: '0.85em', color: '#888' }}>
            Turn {state.turnNumber} | {state.phase}
            {state.phase === GamePhase.Playing && ` - ${state.turnPhase}`}
          </span>
        </div>
        <GameControls
          speed={speed}
          onSpeedChange={setSpeed}
          paused={paused}
          onPauseToggle={() => setPaused(!paused)}
          onRestart={startNewGame}
          gameFinished={isFinished}
        />
      </div>

      {/* Board */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <SvgRenderer state={state} graph={graph} hexSize={50} />
        {/* Winner overlay */}
        {isFinished && winner && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.85)',
            borderRadius: '16px',
            padding: '24px 48px',
            textAlign: 'center',
            border: '3px solid #f1c40f',
          }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#f1c40f' }}>
              {winner.name} Wins!
            </div>
            <div style={{ fontSize: '1.2em', marginTop: '8px' }}>
              {winner.victoryPoints} Victory Points
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#16213e',
        borderLeft: '1px solid #333',
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PlayerHud players={state.players} currentPlayerIndex={state.currentPlayerIndex} />
        </div>
        <GameLog events={state.eventLog} playerNames={playerNames} />
      </div>
    </div>
  );
}
