import { describe, it, expect } from 'vitest';
import { GameEngine } from '../game-engine.js';
import { createGame } from '../game-init.js';
import { SimpleBot } from '../../bot/simple-bot.js';
import { GamePhase, TurnPhase } from '../../types/game.js';
import { ActionEnvelope } from '../../types/action.js';
import { SeededRandom } from '../../utils/random.js';

function runBotGame(seed: number, maxTurns: number = 500) {
  const { state: initialState, graph } = createGame('test-game', {
    playerCount: 4,
    boardSeed: seed,
    victoryPointsToWin: 10,
    robberEnabled: true,
    devCardsEnabled: true,
  });

  const rng = new SeededRandom(seed + 1);
  const engine = new GameEngine(graph, rng);
  const bot = new SimpleBot();
  let state = initialState;
  let actions = 0;

  // Setup phase: each player places 2 settlements + 2 roads (snake draft)
  while (state.phase === GamePhase.SetupRound1 || state.phase === GamePhase.SetupRound2) {
    const setup = state.setupState!;
    const currentPlayer = state.players[setup.currentSetupPlayerIndex];

    let action;
    if (!setup.awaitingRoad) {
      const vertex = bot.chooseInitialSettlement(state, currentPlayer.id, graph);
      action = { type: 'placeInitialSettlement' as const, vertexId: vertex };
    } else {
      const lastSettlement = currentPlayer.settlements[currentPlayer.settlements.length - 1];
      const edge = bot.chooseInitialRoad(state, currentPlayer.id, graph, lastSettlement);
      action = { type: 'placeInitialRoad' as const, edgeId: edge };
    }

    const envelope: ActionEnvelope = {
      action,
      playerId: currentPlayer.id,
      timestamp: Date.now(),
    };

    const result = engine.applyAction(state, envelope);
    state = result.newState;
    actions++;

    if (actions > 100) throw new Error('Setup phase stuck');
  }

  expect(state.phase).toBe(GamePhase.Playing);

  // Each player should have 2 settlements and 2 roads
  for (const player of state.players) {
    expect(player.settlements.length).toBe(2);
    expect(player.roads.length).toBe(2);
  }

  // Play phase
  let turnCount = 0;
  while (state.phase === GamePhase.Playing && turnCount < maxTurns) {
    // Handle robber discard: all players who need to discard do so
    if (state.turnPhase === TurnPhase.RobberDiscard && state.playersNeedingDiscard.length > 0) {
      for (const discardPlayerId of [...state.playersNeedingDiscard]) {
        const action = bot.chooseAction(state, discardPlayerId, graph);
        const envelope: ActionEnvelope = {
          action,
          playerId: discardPlayerId,
          timestamp: Date.now(),
        };
        const result = engine.applyAction(state, envelope);
        state = result.newState;
        actions++;
      }
      continue;
    }

    // Handle robber steal: active player chooses target
    const currentPlayer = state.players[state.currentPlayerIndex];
    const action = bot.chooseAction(state, currentPlayer.id, graph);

    const envelope: ActionEnvelope = {
      action,
      playerId: currentPlayer.id,
      timestamp: Date.now(),
    };

    const validation = engine.validate(state, envelope);
    if (!validation.valid) {
      // If the bot's chosen action is invalid, try endTurn or rollDice as fallback
      const fallback = state.turnPhase === TurnPhase.PreRoll
        ? { type: 'rollDice' as const }
        : { type: 'endTurn' as const };

      const fallbackEnvelope: ActionEnvelope = {
        action: fallback,
        playerId: currentPlayer.id,
        timestamp: Date.now(),
      };

      const fallbackValidation = engine.validate(state, fallbackEnvelope);
      if (!fallbackValidation.valid) {
        throw new Error(
          `Bot stuck: ${currentPlayer.id}, phase=${state.phase}, turnPhase=${state.turnPhase}, action=${action.type}, reason=${validation.reason}, fallback=${fallback.type} also invalid: ${fallbackValidation.reason}`
        );
      }

      const result = engine.applyAction(state, fallbackEnvelope);
      state = result.newState;
    } else {
      const result = engine.applyAction(state, envelope);
      state = result.newState;
    }

    if (action.type === 'endTurn') turnCount++;
    actions++;
  }

  return { state, actions, turnCount };
}

describe('Full bot game', () => {
  it('4 bots can complete a game with seed 42', () => {
    const { state, actions, turnCount } = runBotGame(42);
    console.log(`Game completed: ${actions} actions, ${turnCount} turns, winner: ${state.winnerId}`);
    console.log('Scores:', state.players.map((p) => `${p.name}: ${p.victoryPoints} VP`).join(', '));
    expect(state.phase).toBe(GamePhase.Finished);
    expect(state.winnerId).toBeTruthy();
  });

  it('4 bots can complete a game with seed 123', () => {
    const { state, actions, turnCount } = runBotGame(123);
    console.log(`Game completed: ${actions} actions, ${turnCount} turns, winner: ${state.winnerId}`);
    console.log('Scores:', state.players.map((p) => `${p.name}: ${p.victoryPoints} VP`).join(', '));
    expect(state.phase).toBe(GamePhase.Finished);
    expect(state.winnerId).toBeTruthy();
  });

  it('4 bots can complete a game with seed 999', () => {
    const { state, actions, turnCount } = runBotGame(999);
    console.log(`Game completed: ${actions} actions, ${turnCount} turns, winner: ${state.winnerId}`);
    console.log('Scores:', state.players.map((p) => `${p.name}: ${p.victoryPoints} VP`).join(', '));
    expect(state.phase).toBe(GamePhase.Finished);
    expect(state.winnerId).toBeTruthy();
  });
});
