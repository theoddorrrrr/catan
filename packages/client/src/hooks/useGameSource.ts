import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  GamePhase,
  TurnPhase,
  GameEngine,
  createGame,
  SeededRandom,
  ActionEnvelope,
  GameAction,
  SimpleBot,
  BoardGraph,
  generateBoard,
  totalResources,
} from '@catan/shared';
import { runBotAction } from '../game/bot-runner';
import { socketManager, ConnectionStatus } from '../network/socket-manager';

interface UseGameSourceOptions {
  source: 'local' | 'online';
  mode: 'spectate' | 'play';
  playerName: string;
  playerId?: string;
}

interface GameSourceResult {
  state: GameState | null;
  graph: BoardGraph | null;
  humanPlayerId: string | null;
  doAction: (action: GameAction) => void;
  startNewGame: () => void;
  speed: number;
  setSpeed: (s: number) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  connectionStatus: ConnectionStatus;
  isOnline: boolean;
}

export function useGameSource(opts: UseGameSourceOptions): GameSourceResult {
  if (opts.source === 'local') {
    return useLocalGame(opts);
  }
  return useOnlineGame(opts);
}

function useLocalGame(opts: UseGameSourceOptions): GameSourceResult {
  const [state, setState] = useState<GameState | null>(null);
  const [graph, setGraph] = useState<BoardGraph | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [speed, setSpeed] = useState(2);
  const [paused, setPaused] = useState(false);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  const humanPlayerId = opts.mode === 'play' ? 'human-0' : null;

  stateRef.current = state;
  pausedRef.current = paused;
  speedRef.current = speed;

  const startNewGame = useCallback(() => {
    const seed = Math.floor(Math.random() * 2147483647);
    const players = opts.mode === 'play'
      ? [{ id: 'human-0', name: opts.playerName, isBot: false }]
      : [];
    const { state: newState, graph: newGraph } = createGame('browser-game', {
      playerCount: 4,
      boardSeed: seed,
      victoryPointsToWin: 10,
      robberEnabled: true,
      devCardsEnabled: true,
    }, players);
    const rng = new SeededRandom(seed + 1);
    const newEngine = new GameEngine(newGraph, rng);

    setState(newState);
    setGraph(newGraph);
    setEngine(newEngine);
    setPaused(false);
  }, [opts.mode, opts.playerName]);

  useEffect(() => { startNewGame(); }, [startNewGame]);

  // Bot game loop
  useEffect(() => {
    if (!engine || !graph) return;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const s = stateRef.current;
      if (!s || s.phase === GamePhase.Finished || pausedRef.current) {
        timer = setTimeout(tick, 100);
        return;
      }

      if (humanPlayerId) {
        const isHumanSetupTurn = (s.phase === GamePhase.SetupRound1 || s.phase === GamePhase.SetupRound2)
          && s.setupState
          && s.players[s.setupState.currentSetupPlayerIndex]?.id === humanPlayerId;
        const isHumanPlayTurn = s.phase === GamePhase.Playing
          && s.players[s.currentPlayerIndex]?.id === humanPlayerId
          && s.turnPhase !== TurnPhase.RobberDiscard;
        const isHumanDiscard = s.turnPhase === TurnPhase.RobberDiscard
          && s.playersNeedingDiscard.includes(humanPlayerId);

        if (isHumanSetupTurn || isHumanPlayTurn || isHumanDiscard) {
          timer = setTimeout(tick, 100);
          return;
        }
      }

      try {
        const { newState } = runBotAction(s, engine!, graph!);
        setState(newState);
      } catch (e) {
        console.error('Bot error:', e);
        setPaused(true);
      }

      const delay = Math.max(100, 500 / speedRef.current);
      timer = setTimeout(tick, delay);
    }

    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [engine, graph, humanPlayerId]);

  const doAction = useCallback((action: GameAction) => {
    if (!state || !engine || !humanPlayerId) return;
    const envelope: ActionEnvelope = {
      action,
      playerId: humanPlayerId,
      timestamp: Date.now(),
    };
    try {
      const result = engine.applyAction(state, envelope);
      setState(result.newState);
    } catch (e) {
      console.error('Action error:', e);
    }
  }, [state, engine, humanPlayerId]);

  return {
    state,
    graph,
    humanPlayerId,
    doAction,
    startNewGame,
    speed,
    setSpeed,
    paused,
    setPaused,
    connectionStatus: 'connected',
    isOnline: false,
  };
}

function useOnlineGame(opts: UseGameSourceOptions): GameSourceResult {
  const [state, setState] = useState<GameState | null>(null);
  const [graph, setGraph] = useState<BoardGraph | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const humanPlayerId = opts.playerId || null;

  useEffect(() => {
    const unsubState = socketManager.onGameState((newState) => {
      setState(newState);
      // Reconstruct graph from board seed
      if (newState.config.boardSeed) {
        const { graph: newGraph } = generateBoard(newState.config.boardSeed);
        setGraph(newGraph);
      }
    });

    const unsubConn = socketManager.onConnectionChange((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubState();
      unsubConn();
    };
  }, []);

  const doAction = useCallback(async (action: GameAction) => {
    const result = await socketManager.sendAction(action);
    if (!result.ok) {
      console.error('Action rejected:', result.error);
    }
  }, []);

  const startNewGame = useCallback(() => {
    // In online mode, can't restart — would need to go back to lobby
  }, []);

  return {
    state,
    graph,
    humanPlayerId,
    doAction,
    startNewGame,
    speed: 2,
    setSpeed: () => {},
    paused: false,
    setPaused: () => {},
    connectionStatus,
    isOnline: true,
  };
}
