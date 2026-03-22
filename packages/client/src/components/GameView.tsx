import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  GamePhase,
  TurnPhase,
  ActionEnvelope,
  VertexId,
  EdgeId,
  HexCoord,
  hexKey,
  emptyResources,
  ResourceType,
  getTradeRate,
  getValidSettlementVertices,
  getValidRoadEdges,
  getValidInitialSettlementVertices,
  getValidRoadEdgesFromVertex,
  totalResources,
  hasResources,
  GameAction,
} from '@catan/shared';
import { BoardGraph } from '@catan/shared';
import { SvgRenderer } from '../renderer/SvgRenderer';
import { PlayerHud } from './PlayerHud';
import { GameLog } from './GameLog';
import { DiceDisplay } from './DiceDisplay';
import { GameControls } from './GameControls';
import { ActionBar, InteractionMode } from './ActionBar';
import { TradeDialog } from './TradeDialog';
import { ResourceAnimation } from './ResourceAnimation';
import { GameStats } from './GameStats';
import { DiscardDialog } from './DiscardDialog';
import { DomesticTradeDialog, TradeResultDialog } from './DomesticTradeDialog';
import { useGameSource } from '../hooks/useGameSource';
import { runBotAction } from '../game/bot-runner';

interface GameViewProps {
  source?: 'local' | 'online';
  mode: 'spectate' | 'play';
  playerName: string;
  roomCode?: string;
  playerId?: string;
  onBack: () => void;
}

export function GameView({
  source = 'local',
  mode,
  playerName,
  roomCode,
  playerId,
  onBack,
}: GameViewProps) {
  const gameSource = useGameSource({ source, mode, playerName, playerId });
  const {
    state,
    graph,
    humanPlayerId,
    doAction,
    startNewGame,
    speed,
    setSpeed,
    paused,
    setPaused,
    connectionStatus,
    isOnline,
  } = gameSource;

  const [interactionMode, setInteractionMode] = useState<InteractionMode>({ type: 'none' });
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [showDomesticTrade, setShowDomesticTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<{ accepted: boolean; acceptedByName?: string } | null>(null);
  const [lastDistribution, setLastDistribution] = useState<Record<string, any> | null>(null);
  const [showReconnectLink, setShowReconnectLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const lastEventCountRef = useRef(0);

  // Watch for resource distribution events (for animation)
  useEffect(() => {
    if (!state) return;
    const events = state.eventLog;
    if (events.length > lastEventCountRef.current) {
      for (let i = lastEventCountRef.current; i < events.length; i++) {
        if (events[i].event.type === 'resourcesDistributed') {
          setLastDistribution((events[i].event as any).distributions);
        }
      }
      lastEventCountRef.current = events.length;
    }
  }, [state?.eventLog.length]);

  // Wrap doAction to also reset interaction mode
  const doGameAction = useCallback((action: GameAction) => {
    doAction(action);
    // Don't reset mode for road building card (needs two roads)
    if (action.type !== 'buildRoad' || interactionMode.type !== 'playRoadBuilding') {
      setInteractionMode({ type: 'none' });
    }
  }, [doAction, interactionMode]);

  const handleBankTrade = useCallback((giving: ResourceType, receiving: ResourceType) => {
    if (!state || !humanPlayerId) return;
    const rate = getTradeRate(state, humanPlayerId, giving);
    const giveBundle = emptyResources();
    giveBundle[giving] = rate;
    const recvBundle = emptyResources();
    recvBundle[receiving] = 1;
    doGameAction({ type: 'bankTrade', giving: giveBundle, receiving: recvBundle });
    setShowTradeDialog(false);
  }, [state, humanPlayerId, doGameAction]);

  const handleDomesticTrade = useCallback((offering: any, requesting: any) => {
    if (!state || !humanPlayerId) return;

    if (isOnline) {
      // In online mode, just send the propose action — server handles bot responses
      doAction({ type: 'proposeTrade', offering, requesting });
      setShowDomesticTrade(false);
      return;
    }

    // In local mode, simulate the trade locally using the engine
    // This requires access to the engine which is inside useGameSource
    // For simplicity, just dispatch the propose and let the bot runner handle it
    doAction({ type: 'proposeTrade', offering, requesting });
    setShowDomesticTrade(false);
  }, [state, humanPlayerId, doAction, isOnline]);

  // Dev card action handlers
  const handlePlayKnight = useCallback(() => {
    setInteractionMode({ type: 'playKnight' });
  }, []);

  const handlePlayMonopoly = useCallback((resource: ResourceType) => {
    doGameAction({ type: 'playMonopoly', resource });
  }, [doGameAction]);

  const handlePlayYearOfPlenty = useCallback((r1: ResourceType, r2: ResourceType) => {
    doGameAction({ type: 'playYearOfPlenty', resources: [r1, r2] });
  }, [doGameAction]);

  const handlePlayRoadBuilding = useCallback(() => {
    doGameAction({ type: 'playRoadBuilding', edges: [] as any });
    setInteractionMode({ type: 'playRoadBuilding' });
  }, [doGameAction]);

  const handleDiscard = useCallback((resources: any) => {
    doGameAction({ type: 'discardResources', resources });
  }, [doGameAction]);

  // Compute highlights based on interaction mode
  const highlightVertices = new Set<VertexId>();
  const highlightEdges = new Set<EdgeId>();
  const highlightHexes = new Set<string>();

  if (state && graph && humanPlayerId) {
    const isSetup = state.phase === GamePhase.SetupRound1 || state.phase === GamePhase.SetupRound2;
    const setup = state.setupState;
    const isMySetupTurn = isSetup && setup && state.players[setup.currentSetupPlayerIndex]?.id === humanPlayerId;

    if (isMySetupTurn && setup) {
      if (!setup.awaitingRoad) {
        for (const v of getValidInitialSettlementVertices(state, graph)) {
          highlightVertices.add(v);
        }
      } else {
        const lastSettlement = state.players.find((p) => p.id === humanPlayerId)!.settlements.slice(-1)[0];
        for (const e of getValidRoadEdgesFromVertex(state, graph, humanPlayerId, lastSettlement)) {
          highlightEdges.add(e);
        }
      }
    }

    if (interactionMode.type === 'buildSettlement') {
      for (const v of getValidSettlementVertices(state, graph, humanPlayerId)) {
        highlightVertices.add(v);
      }
    }
    if (interactionMode.type === 'buildCity') {
      const player = state.players.find((p) => p.id === humanPlayerId)!;
      for (const v of player.settlements) {
        highlightVertices.add(v);
      }
    }
    if (interactionMode.type === 'buildRoad' || interactionMode.type === 'playRoadBuilding') {
      for (const e of getValidRoadEdges(state, graph, humanPlayerId)) {
        highlightEdges.add(e);
      }
    }
    if (interactionMode.type === 'playKnight' || (state.turnPhase === TurnPhase.RobberMove && state.players[state.currentPlayerIndex]?.id === humanPlayerId)) {
      for (const hex of state.board.hexes) {
        if (!(hex.coord.q === state.robberHex.q && hex.coord.r === state.robberHex.r)) {
          highlightHexes.add(hexKey(hex.coord));
        }
      }
    }
    if (state.turnPhase === TurnPhase.RobberSteal && state.players[state.currentPlayerIndex]?.id === humanPlayerId) {
      const hk = hexKey(state.robberHex);
      const hexVerts = graph.hexToVertices.get(hk) || [];
      for (const v of hexVerts) {
        for (const p of state.players) {
          if (p.id !== humanPlayerId && (p.settlements.includes(v) || p.cities.includes(v))) {
            highlightVertices.add(v);
          }
        }
      }
    }
  }

  const handleVertexClick = useCallback((vertexId: VertexId) => {
    if (!state || !humanPlayerId) return;
    const isSetup = state.phase === GamePhase.SetupRound1 || state.phase === GamePhase.SetupRound2;
    if (isSetup && state.setupState && !state.setupState.awaitingRoad) {
      doGameAction({ type: 'placeInitialSettlement', vertexId });
    } else if (interactionMode.type === 'buildSettlement') {
      doGameAction({ type: 'buildSettlement', vertexId });
    } else if (interactionMode.type === 'buildCity') {
      doGameAction({ type: 'buildCity', vertexId });
    } else if (state.turnPhase === TurnPhase.RobberSteal) {
      for (const p of state.players) {
        if (p.id !== humanPlayerId && (p.settlements.includes(vertexId) || p.cities.includes(vertexId))) {
          doGameAction({ type: 'stealResource', targetPlayerId: p.id });
          return;
        }
      }
    }
  }, [state, humanPlayerId, interactionMode, doGameAction]);

  const handleEdgeClick = useCallback((edgeId: EdgeId) => {
    if (!state || !humanPlayerId) return;
    const isSetup = state.phase === GamePhase.SetupRound1 || state.phase === GamePhase.SetupRound2;
    if (isSetup && state.setupState?.awaitingRoad) {
      doGameAction({ type: 'placeInitialRoad', edgeId });
    } else if (interactionMode.type === 'buildRoad') {
      doGameAction({ type: 'buildRoad', edgeId });
    } else if (interactionMode.type === 'playRoadBuilding') {
      if (!interactionMode.placedFirst) {
        doAction({ type: 'buildRoad', edgeId });
        setInteractionMode({ type: 'playRoadBuilding', placedFirst: edgeId });
      } else {
        doAction({ type: 'buildRoad', edgeId });
        setInteractionMode({ type: 'none' });
      }
    }
  }, [state, humanPlayerId, interactionMode, doGameAction, doAction]);

  const handleHexClick = useCallback((coord: HexCoord) => {
    if (!state || !humanPlayerId) return;
    if (state.turnPhase === TurnPhase.RobberMove || interactionMode.type === 'playKnight') {
      doGameAction({ type: 'moveRobber', hex: coord });
    }
  }, [state, humanPlayerId, interactionMode, doGameAction]);

  if (!state || !graph) {
    return <div style={{ color: '#fff', padding: '20px' }}>Loading...</div>;
  }

  const playerNames: Record<string, string> = {};
  state.players.forEach((p) => { playerNames[p.id] = p.name; });
  const isFinished = state.phase === GamePhase.Finished;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'auto auto 1fr auto',
      height: '100vh',
      background: '#1a5fa0',
      color: '#eee',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Connection status banner (online only) */}
      {isOnline && connectionStatus !== 'connected' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          padding: '6px',
          background: connectionStatus === 'reconnecting' ? '#f39c12' : '#e74c3c',
          color: '#fff',
          textAlign: 'center',
          fontSize: '0.85em',
        }}>
          {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 12px',
        background: '#1a1a2e',
        borderBottom: '1px solid #333',
        flexWrap: 'wrap',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.1em' }}>
            &larr;
          </button>
          <h1 style={{ margin: 0, fontSize: '1.1em' }}>Catan</h1>
          {isOnline && roomCode && (
            <span style={{ color: '#3498db', fontSize: '0.8em', fontFamily: 'monospace' }}>
              [{roomCode}]
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DiceDisplay dice={state.lastDiceRoll} />
          <span style={{ fontSize: '0.8em', color: '#888' }}>
            Turn {state.turnNumber} | {state.phase}
            {state.phase === GamePhase.Playing && ` - ${state.turnPhase}`}
          </span>
        </div>
        {!isOnline && (
          <GameControls
            speed={speed}
            onSpeedChange={setSpeed}
            paused={paused}
            onPauseToggle={() => setPaused(!paused)}
            onRestart={startNewGame}
            gameFinished={isFinished}
          />
        )}
        {isOnline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: connectionStatus === 'connected' ? '#27ae60' : '#e74c3c',
            }} />
            <span style={{ fontSize: '0.75em', color: '#888' }}>
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus}
            </span>
            <button
              onClick={() => setShowReconnectLink(!showReconnectLink)}
              title="Reconnect link (play on another device)"
              style={{
                background: 'none', border: '1px solid #555', borderRadius: '4px',
                color: '#aaa', cursor: 'pointer', fontSize: '0.75em', padding: '2px 6px',
              }}
            >
              Link
            </button>
            {showReconnectLink && (() => {
              const token = localStorage.getItem('catan_session_token');
              const url = `${window.location.origin}/rejoin?token=${token}`;
              return (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  background: '#1a1a2e', border: '1px solid #444', borderRadius: '8px',
                  padding: '12px', zIndex: 60, minWidth: '280px',
                }}>
                  <p style={{ fontSize: '0.8em', color: '#aaa', marginBottom: '8px' }}>
                    Open this link on another device to continue playing:
                  </p>
                  <input
                    readOnly
                    value={url}
                    style={{
                      width: '100%', padding: '6px 8px', borderRadius: '4px',
                      border: '1px solid #555', background: '#0e0e1a', color: '#fff',
                      fontSize: '0.75em', marginBottom: '6px',
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    style={{
                      width: '100%', padding: '6px', borderRadius: '4px',
                      border: 'none', background: linkCopied ? '#27ae60' : '#3498db',
                      color: '#fff', cursor: 'pointer', fontSize: '0.8em',
                    }}
                  >
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Player strip (top bar) */}
      <PlayerHud
        players={state.players}
        currentPlayerIndex={state.currentPlayerIndex}
        humanPlayerId={humanPlayerId}
        bank={state.bank}
      />

      {/* Board (takes remaining space) */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <SvgRenderer
          state={state}
          graph={graph}
          hexSize={50}
          highlightVertices={highlightVertices.size > 0 ? highlightVertices : undefined}
          highlightEdges={highlightEdges.size > 0 ? highlightEdges : undefined}
          highlightHexes={highlightHexes.size > 0 ? highlightHexes : undefined}
          onVertexClick={handleVertexClick}
          onEdgeClick={handleEdgeClick}
          onHexClick={handleHexClick}
        />

        {/* Resource gain animation */}
        <ResourceAnimation distributions={lastDistribution} humanPlayerId={humanPlayerId} />

        {/* Game log overlay */}
        <GameLog events={state.eventLog} playerNames={playerNames} />

        {/* End-game statistics */}
        {isFinished && (
          <GameStats
            state={state}
            humanPlayerId={humanPlayerId}
            onPlayAgain={isOnline ? onBack : startNewGame}
          />
        )}
      </div>

      {/* Action bar (human player only) */}
      {humanPlayerId && (
        <ActionBar
          state={state}
          humanPlayerId={humanPlayerId}
          interactionMode={interactionMode}
          onSetMode={setInteractionMode}
          onRollDice={() => doGameAction({ type: 'rollDice' })}
          onEndTurn={() => doGameAction({ type: 'endTurn' })}
          onBuyDevCard={() => doGameAction({ type: 'buyDevCard' })}
          onBankTrade={() => setShowTradeDialog(true)}
          onDomesticTrade={() => setShowDomesticTrade(true)}
          onPlayKnight={handlePlayKnight}
          onPlayMonopoly={handlePlayMonopoly}
          onPlayYearOfPlenty={handlePlayYearOfPlenty}
          onPlayRoadBuilding={handlePlayRoadBuilding}
        />
      )}

      {showTradeDialog && humanPlayerId && (
        <TradeDialog
          state={state}
          playerId={humanPlayerId}
          onTrade={handleBankTrade}
          onClose={() => setShowTradeDialog(false)}
        />
      )}

      {showDomesticTrade && humanPlayerId && (
        <DomesticTradeDialog
          state={state}
          humanPlayerId={humanPlayerId}
          onPropose={handleDomesticTrade}
          onClose={() => setShowDomesticTrade(false)}
        />
      )}

      {tradeResult && (
        <TradeResultDialog
          accepted={tradeResult.accepted}
          acceptedByName={tradeResult.acceptedByName}
          onClose={() => setTradeResult(null)}
        />
      )}

      {humanPlayerId && state.turnPhase === TurnPhase.RobberDiscard && state.playersNeedingDiscard.includes(humanPlayerId) && (() => {
        const player = state.players.find((p) => p.id === humanPlayerId)!;
        const mustDiscard = Math.floor(totalResources(player.resources) / 2);
        return (
          <DiscardDialog
            player={player}
            mustDiscard={mustDiscard}
            onDiscard={handleDiscard}
          />
        );
      })()}
    </div>
  );
}
