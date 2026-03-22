import {
  GameState,
  GamePhase,
  TurnPhase,
  GameEngine,
  SimpleBot,
  ActionEnvelope,
  hasResources,
  totalResources,
} from '@catan/shared';
import { BoardGraph } from '@catan/shared';

const bot = new SimpleBot();

export function runBotAction(
  state: GameState,
  engine: GameEngine,
  graph: BoardGraph
): { newState: GameState; finished: boolean } {
  if (state.phase === GamePhase.Finished) {
    return { newState: state, finished: true };
  }

  let playerId: string;
  let newState = state;

  // Setup phase
  if (state.phase === GamePhase.SetupRound1 || state.phase === GamePhase.SetupRound2) {
    const setup = state.setupState!;
    const currentPlayer = state.players[setup.currentSetupPlayerIndex];
    playerId = currentPlayer.id;

    let action;
    if (!setup.awaitingRoad) {
      const vertex = bot.chooseInitialSettlement(state, playerId, graph);
      action = { type: 'placeInitialSettlement' as const, vertexId: vertex };
    } else {
      const lastSettlement = currentPlayer.settlements[currentPlayer.settlements.length - 1];
      const edge = bot.chooseInitialRoad(state, playerId, graph, lastSettlement);
      action = { type: 'placeInitialRoad' as const, edgeId: edge };
    }

    const envelope: ActionEnvelope = { action, playerId, timestamp: Date.now() };
    const result = engine.applyAction(newState, envelope);
    return { newState: result.newState, finished: result.newState.phase === GamePhase.Finished };
  }

  // Playing phase - handle discard first (any player)
  if (state.turnPhase === TurnPhase.RobberDiscard && state.playersNeedingDiscard.length > 0) {
    const discardPlayerId = state.playersNeedingDiscard[0];
    const action = bot.chooseAction(state, discardPlayerId, graph);
    const envelope: ActionEnvelope = { action, playerId: discardPlayerId, timestamp: Date.now() };
    const result = engine.applyAction(newState, envelope);
    return { newState: result.newState, finished: false };
  }

  // Handle active trade offers: bots evaluate and accept/reject
  if (state.activeTradeOffer && state.activeTradeOffer.status === 'open') {
    const offer = state.activeTradeOffer;
    // Find bot players who haven't been the proposer
    const botPlayers = state.players.filter(
      (p) => p.isBot && p.id !== offer.fromPlayerId
    );

    for (const botPlayer of botPlayers) {
      // Bot accepts if it has the requested resources and the trade seems fair
      if (hasResources(botPlayer.resources, offer.requesting)) {
        // Simple heuristic: accept if total given <= total received + 1
        const offerTotal = totalResources(offer.offering);
        const requestTotal = totalResources(offer.requesting);
        if (offerTotal >= requestTotal - 1) {
          const envelope: ActionEnvelope = {
            action: { type: 'acceptTrade', tradeId: offer.id },
            playerId: botPlayer.id,
            timestamp: Date.now(),
          };
          const result = engine.applyAction(state, envelope);
          return { newState: result.newState, finished: false };
        }
      }
    }

    // No bot accepted — cancel the trade (proposer cancels)
    const cancelEnvelope: ActionEnvelope = {
      action: { type: 'cancelTrade', tradeId: offer.id },
      playerId: offer.fromPlayerId,
      timestamp: Date.now(),
    };
    const result = engine.applyAction(state, cancelEnvelope);
    return { newState: result.newState, finished: false };
  }

  // Current player's turn
  const currentPlayer = state.players[state.currentPlayerIndex];
  playerId = currentPlayer.id;
  const action = bot.chooseAction(state, playerId, graph);

  const envelope: ActionEnvelope = { action, playerId, timestamp: Date.now() };
  const validation = engine.validate(state, envelope);

  if (!validation.valid) {
    // Fallback
    const fallback = state.turnPhase === TurnPhase.PreRoll
      ? { type: 'rollDice' as const }
      : { type: 'endTurn' as const };
    const fbEnvelope: ActionEnvelope = { action: fallback, playerId, timestamp: Date.now() };
    const result = engine.applyAction(newState, fbEnvelope);
    return { newState: result.newState, finished: result.newState.phase === GamePhase.Finished };
  }

  const result = engine.applyAction(newState, envelope);
  return { newState: result.newState, finished: result.newState.phase === GamePhase.Finished };
}
