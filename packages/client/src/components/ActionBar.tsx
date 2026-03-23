import React from 'react';
import {
  GameState,
  GamePhase,
  TurnPhase,
  totalResources,
  EdgeId,
} from '@catan/shared';
import { BuildMenu } from './BuildMenu';

export type InteractionMode =
  | { type: 'none' }
  | { type: 'buildSettlement' }
  | { type: 'buildCity' }
  | { type: 'buildRoad' }
  | { type: 'buildShip' }
  | { type: 'moveRobber' }
  | { type: 'stealResource' }
  | { type: 'placeInitialSettlement' }
  | { type: 'placeInitialRoad' }
  | { type: 'playKnight' }
  | { type: 'playRoadBuilding'; placedFirst?: EdgeId };

interface ActionBarProps {
  state: GameState;
  humanPlayerId: string;
  interactionMode: InteractionMode;
  onSetMode: (mode: InteractionMode) => void;
  onRollDice: () => void;
  onEndTurn: () => void;
  onBuyDevCard: () => void;
  onBankTrade: () => void;
  onDomesticTrade: () => void;
}

export function ActionBar({
  state,
  humanPlayerId,
  interactionMode,
  onSetMode,
  onRollDice,
  onEndTurn,
  onBuyDevCard,
  onBankTrade,
  onDomesticTrade,
}: ActionBarProps) {
  const player = state.players.find((p) => p.id === humanPlayerId);
  if (!player) return null;

  const isMyTurn = state.players[state.currentPlayerIndex]?.id === humanPlayerId;
  const isSetup = state.phase === GamePhase.SetupRound1 || state.phase === GamePhase.SetupRound2;
  const isFinished = state.phase === GamePhase.Finished;

  // Setup phase
  if (isSetup) {
    const setup = state.setupState;
    const isMySetupTurn = setup && state.players[setup.currentSetupPlayerIndex]?.id === humanPlayerId;

    if (!isMySetupTurn) {
      return (
        <div style={barStyle}>
          <span style={{ color: '#888' }}>Waiting for bots to place...</span>
        </div>
      );
    }

    return (
      <div style={barStyle}>
        <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>
          {setup?.awaitingRoad
            ? 'Click an edge to place your road'
            : 'Click a vertex to place your settlement'}
        </span>
      </div>
    );
  }

  if (isFinished) {
    return null; // Stats overlay handles this now
  }

  // Need to discard?
  if (state.turnPhase === TurnPhase.RobberDiscard && state.playersNeedingDiscard.includes(humanPlayerId)) {
    const total = totalResources(player.resources);
    const mustDiscard = Math.floor(total / 2);
    return (
      <div style={barStyle}>
        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
          You must discard {mustDiscard} cards!
        </span>
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div style={barStyle}>
        <span style={{ color: '#888' }}>
          {state.players[state.currentPlayerIndex]?.name}'s turn...
        </span>
      </div>
    );
  }

  // Gold choice phase
  if (state.turnPhase === TurnPhase.GoldChoice) {
    const pending = state.playersNeedingGoldChoice?.find((p: any) => p.playerId === humanPlayerId);
    if (pending) {
      return (
        <div style={barStyle}>
          <span style={{ color: '#c9a820', fontWeight: 'bold' }}>Choose a resource from the gold hex!</span>
        </div>
      );
    }
    return (
      <div style={barStyle}>
        <span style={{ color: '#888' }}>Waiting for gold hex choices...</span>
      </div>
    );
  }

  // Robber phases
  if (state.turnPhase === TurnPhase.RobberMove) {
    return (
      <div style={barStyle}>
        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
          {state.config.seafarersEnabled
            ? 'Click a land hex for robber, or sea hex for pirate'
            : 'Click a hex to move the robber'}
        </span>
      </div>
    );
  }

  if (state.turnPhase === TurnPhase.RobberSteal) {
    return (
      <div style={barStyle}>
        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>Click a building to steal from</span>
      </div>
    );
  }

  // Road building card - second road
  if (interactionMode.type === 'playRoadBuilding' && interactionMode.placedFirst) {
    return (
      <div style={barStyle}>
        <span style={{ color: '#8e44ad', fontWeight: 'bold' }}>Click an edge to place your second road</span>
      </div>
    );
  }

  const canRoll = state.turnPhase === TurnPhase.PreRoll;
  const canBuild = state.turnPhase === TurnPhase.PostRoll;

  return (
    <div style={barStyle}>
      {canRoll && (
        <button onClick={onRollDice} style={btnStyle('#e67e22')}>
          🎲 Roll
        </button>
      )}

      {canBuild && (
        <>
          <BuildMenu
            player={player}
            canBuild={canBuild}
            devCardDeckSize={(state as any).devCardDeckSize ?? state.devCardDeck.length}
            devCardsEnabled={state.config.devCardsEnabled}
            seafarersEnabled={state.config.seafarersEnabled}
            activeMode={interactionMode.type}
            onSelectMode={(mode) => onSetMode({ type: mode } as InteractionMode)}
            onBuyDevCard={onBuyDevCard}
          />

          <button onClick={onBankTrade} style={btnStyle('#2980b9')}>
            🏦 Bank
          </button>
          <button onClick={onDomesticTrade} style={btnStyle('#8e44ad')}>
            🤝 Trade
          </button>

          <div style={{ flex: 1 }} />

          <button onClick={onEndTurn} style={btnStyle('#e74c3c')}>
            End Turn
          </button>
        </>
      )}

      {interactionMode.type !== 'none' && canBuild && (
        <span style={{ color: '#f1c40f', fontSize: '0.8em' }}>
          {interactionMode.type === 'buildRoad' && '| Click edge to build road'}
          {interactionMode.type === 'buildShip' && '| Click sea edge to build ship'}
          {interactionMode.type === 'buildSettlement' && '| Click vertex to build settlement'}
          {interactionMode.type === 'buildCity' && '| Click settlement to upgrade'}
          {interactionMode.type === 'playRoadBuilding' && '| Click edge for free road (1/2)'}
        </span>
      )}
    </div>
  );
}

const barStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 8px',
  background: '#1a1a2e',
  borderTop: '1px solid #333',
  flexWrap: 'wrap',
  minHeight: '40px',
};

function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: '5px 10px',
    borderRadius: '6px',
    border: 'none',
    background: disabled ? '#333' : bg,
    color: disabled ? '#666' : '#fff',
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontSize: '0.8em',
    whiteSpace: 'nowrap',
  };
}
