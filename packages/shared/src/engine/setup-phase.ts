import { GameState, GamePhase, TurnPhase } from '../types/game.js';
import { ActionEnvelope, ActionResult, ValidationResult } from '../types/action.js';
import { GameEvent } from '../types/event.js';
import { BoardGraph } from '../board/hex-grid.js';
import {
  isVertexOccupied,
  isVertexDistanceLegal,
  getValidRoadEdgesFromVertex,
  isEdgeOccupied,
  getPlayersOnHex,
} from './board-query.js';
import { ResourceBundle, emptyResources, Terrain, TERRAIN_TO_RESOURCE, ResourceType } from '../types/resource.js';
import { hexKey } from '../types/board.js';

export function validateSetupAction(
  state: GameState,
  envelope: ActionEnvelope,
  graph: BoardGraph
): ValidationResult {
  const { action, playerId } = envelope;
  const setup = state.setupState;
  if (!setup) return { valid: false, reason: 'No setup state' };

  const currentPlayer = state.players[setup.currentSetupPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { valid: false, reason: 'Not your turn in setup' };
  }

  if (action.type === 'placeInitialSettlement') {
    if (setup.awaitingRoad) {
      return { valid: false, reason: 'Must place road first' };
    }
    if (isVertexOccupied(state, action.vertexId)) {
      return { valid: false, reason: 'Vertex already occupied' };
    }
    if (!isVertexDistanceLegal(state, graph, action.vertexId)) {
      return { valid: false, reason: 'Too close to another settlement (distance rule)' };
    }
    if (!graph.vertices.has(action.vertexId)) {
      return { valid: false, reason: 'Invalid vertex' };
    }
    return { valid: true };
  }

  if (action.type === 'placeInitialRoad') {
    if (!setup.awaitingRoad) {
      return { valid: false, reason: 'Must place settlement first' };
    }
    if (isEdgeOccupied(state, action.edgeId)) {
      return { valid: false, reason: 'Edge already occupied' };
    }
    if (!graph.edges.has(action.edgeId)) {
      return { valid: false, reason: 'Invalid edge' };
    }
    // Road must connect to the just-placed settlement
    const lastSettlement = currentPlayer.settlements[currentPlayer.settlements.length - 1];
    const validEdges = getValidRoadEdgesFromVertex(state, graph, playerId, lastSettlement);
    if (!validEdges.includes(action.edgeId)) {
      return { valid: false, reason: 'Road must connect to your last placed settlement' };
    }
    return { valid: true };
  }

  return { valid: false, reason: `Invalid action type for setup: ${action.type}` };
}

export function handleSetupAction(
  state: GameState,
  envelope: ActionEnvelope,
  graph: BoardGraph
): ActionResult {
  const { action, playerId } = envelope;
  const events: GameEvent[] = [];
  let newState = structuredClone(state);

  if (action.type === 'placeInitialSettlement') {
    const playerIdx = newState.players.findIndex((p) => p.id === playerId);
    newState.players[playerIdx].settlements.push(action.vertexId);
    newState.players[playerIdx].remainingSettlements--;
    newState.setupState!.awaitingRoad = true;

    events.push({ type: 'settlementBuilt', playerId, vertexId: action.vertexId });

    // In round 2, grant initial resources from adjacent hexes
    if (newState.phase === GamePhase.SetupRound2) {
      const resources = getInitialResources(action.vertexId, newState, graph);
      const player = newState.players[playerIdx];
      for (const [res, amount] of Object.entries(resources)) {
        const r = res as ResourceType;
        const capped = Math.min(amount, newState.bank[r]);
        player.resources[r] += capped;
        newState.bank[r] -= capped;
      }
      if (Object.values(resources).some((v) => v > 0)) {
        events.push({ type: 'initialResourcesGranted', playerId, resources });
      }
    }

    return { newState, events };
  }

  if (action.type === 'placeInitialRoad') {
    const playerIdx = newState.players.findIndex((p) => p.id === playerId);
    newState.players[playerIdx].roads.push(action.edgeId);
    newState.players[playerIdx].remainingRoads--;
    newState.setupState!.awaitingRoad = false;

    events.push({ type: 'roadBuilt', playerId, edgeId: action.edgeId });

    // Advance to next player in setup
    advanceSetup(newState, events);

    return { newState, events };
  }

  throw new Error(`Unhandled setup action: ${action.type}`);
}

function advanceSetup(state: GameState, events: GameEvent[]) {
  const setup = state.setupState!;
  const playerCount = state.players.length;

  setup.settlementsPlacedThisRound++;

  if (state.phase === GamePhase.SetupRound1) {
    if (setup.settlementsPlacedThisRound >= playerCount) {
      // Move to round 2 (reverse order)
      state.phase = GamePhase.SetupRound2;
      setup.settlementsPlacedThisRound = 0;
      setup.currentSetupPlayerIndex = playerCount - 1;
      events.push({ type: 'setupTurnStarted', playerIndex: setup.currentSetupPlayerIndex, round: 2 });
    } else {
      setup.currentSetupPlayerIndex++;
      events.push({ type: 'setupTurnStarted', playerIndex: setup.currentSetupPlayerIndex, round: 1 });
    }
  } else if (state.phase === GamePhase.SetupRound2) {
    if (setup.settlementsPlacedThisRound >= playerCount) {
      // Setup complete, start playing
      state.phase = GamePhase.Playing;
      state.turnPhase = TurnPhase.PreRoll;
      state.currentPlayerIndex = 0;
      state.turnNumber = 1;
      state.setupState = null;
      events.push({ type: 'gameStarted' });
      events.push({ type: 'turnStarted', playerIndex: 0, turnNumber: 1 });
    } else {
      setup.currentSetupPlayerIndex--;
      events.push({ type: 'setupTurnStarted', playerIndex: setup.currentSetupPlayerIndex, round: 2 });
    }
  }
}

function getInitialResources(
  vertexId: string,
  state: GameState,
  graph: BoardGraph
): ResourceBundle {
  const resources = emptyResources();
  const adjacentHexes = graph.vertexToHexes.get(vertexId) || [];

  for (const hex of adjacentHexes) {
    const tile = state.board.hexes.find(
      (h) => h.coord.q === hex.q && h.coord.r === hex.r && h.coord.s === hex.s
    );
    if (tile) {
      const resource = TERRAIN_TO_RESOURCE[tile.terrain];
      if (resource) {
        resources[resource]++;
      }
    }
  }
  return resources;
}
