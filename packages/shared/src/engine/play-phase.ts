import { GameState, GamePhase, TurnPhase } from '../types/game.js';
import { ActionEnvelope, ActionResult, ValidationResult } from '../types/action.js';
import { GameEvent } from '../types/event.js';
import {
  ResourceType,
  ResourceBundle,
  emptyResources,
  hasResources,
  subtractResources,
  addResources,
  totalResources,
  BUILDING_COSTS,
  DevCardType,
  TERRAIN_TO_RESOURCE,
  ALL_RESOURCES,
  Terrain,
} from '../types/resource.js';
import { HexCoord, hexKey, VertexId, EdgeId } from '../types/board.js';
import { BoardGraph } from '../board/hex-grid.js';
import { SeededRandom } from '../utils/random.js';
import {
  isVertexOccupied,
  isVertexDistanceLegal,
  isEdgeOccupied,
  isEdgeOccupiedByAny,
  playerHasAdjacentRoadOrBuilding,
  playerCanPlaceRoadOnEdge,
  playerCanPlaceShipOnEdge,
  getPlayersOnHex,
  getPlayersWithShipsOnHex,
  getTradeRate,
  calculateLongestRoad,
  getVertexOwner,
  isSeaEdge,
  isShipOpen,
  getShipOwner,
} from './board-query.js';
import { checkVictory, updateLongestRoad, updateLargestArmy } from './victory.js';

export function validatePlayAction(
  state: GameState,
  envelope: ActionEnvelope,
  graph: BoardGraph
): ValidationResult {
  const { action, playerId } = envelope;
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Gold choice can be done by any player who needs to choose
  if (action.type === 'chooseGoldResource') {
    const pending = state.playersNeedingGoldChoice.find(p => p.playerId === playerId);
    if (!pending) {
      return { valid: false, reason: 'You do not need to choose a gold resource' };
    }
    return { valid: true };
  }

  // Discard can be done by any player who needs to discard
  if (action.type === 'discardResources') {
    if (!state.playersNeedingDiscard.includes(playerId)) {
      return { valid: false, reason: 'You do not need to discard' };
    }
    const player = state.players.find((p) => p.id === playerId)!;
    const total = totalResources(player.resources);
    const mustDiscard = Math.floor(total / 2);
    const discardTotal = totalResources(action.resources);
    if (discardTotal !== mustDiscard) {
      return { valid: false, reason: `Must discard exactly ${mustDiscard} cards` };
    }
    if (!hasResources(player.resources, action.resources)) {
      return { valid: false, reason: 'Cannot discard resources you do not have' };
    }
    return { valid: true };
  }

  // All other actions require it to be your turn
  if (currentPlayer.id !== playerId) {
    return { valid: false, reason: 'Not your turn' };
  }

  switch (action.type) {
    case 'rollDice': {
      if (state.turnPhase !== TurnPhase.PreRoll) {
        return { valid: false, reason: 'Cannot roll dice now' };
      }
      return { valid: true };
    }

    case 'buildSettlement': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only build after rolling' };
      }
      if (!hasResources(currentPlayer.resources, BUILDING_COSTS.settlement)) {
        return { valid: false, reason: 'Not enough resources for settlement' };
      }
      if (currentPlayer.remainingSettlements <= 0) {
        return { valid: false, reason: 'No more settlements available' };
      }
      if (isVertexOccupied(state, action.vertexId)) {
        return { valid: false, reason: 'Vertex occupied' };
      }
      if (!isVertexDistanceLegal(state, graph, action.vertexId)) {
        return { valid: false, reason: 'Too close to another settlement' };
      }
      if (!playerHasAdjacentRoadOrBuilding(state, graph, playerId, action.vertexId)) {
        return { valid: false, reason: 'Must build adjacent to your road network' };
      }
      return { valid: true };
    }

    case 'buildCity': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only build after rolling' };
      }
      if (!hasResources(currentPlayer.resources, BUILDING_COSTS.city)) {
        return { valid: false, reason: 'Not enough resources for city' };
      }
      if (currentPlayer.remainingCities <= 0) {
        return { valid: false, reason: 'No more cities available' };
      }
      if (!currentPlayer.settlements.includes(action.vertexId)) {
        return { valid: false, reason: 'Can only upgrade your own settlement' };
      }
      return { valid: true };
    }

    case 'buildRoad': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only build after rolling' };
      }
      if (!hasResources(currentPlayer.resources, BUILDING_COSTS.road)) {
        return { valid: false, reason: 'Not enough resources for road' };
      }
      if (currentPlayer.remainingRoads <= 0) {
        return { valid: false, reason: 'No more roads available' };
      }
      if (isEdgeOccupied(state, action.edgeId)) {
        return { valid: false, reason: 'Edge occupied' };
      }
      if (!playerCanPlaceRoadOnEdge(state, graph, playerId, action.edgeId)) {
        return { valid: false, reason: 'Road must connect to your network' };
      }
      return { valid: true };
    }

    case 'buyDevCard': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only buy after rolling' };
      }
      if (!state.config.devCardsEnabled) {
        return { valid: false, reason: 'Development cards are disabled' };
      }
      if (!hasResources(currentPlayer.resources, BUILDING_COSTS.devCard)) {
        return { valid: false, reason: 'Not enough resources for development card' };
      }
      if (state.devCardDeck.length === 0) {
        return { valid: false, reason: 'No development cards left' };
      }
      return { valid: true };
    }

    case 'playKnight': {
      if (state.turnPhase !== TurnPhase.PreRoll && state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Cannot play knight now' };
      }
      const knightCard = currentPlayer.devCards.find(
        (c) => c.type === DevCardType.Knight && c.turnAcquired < state.turnNumber
      );
      if (!knightCard) {
        return { valid: false, reason: 'No playable knight card' };
      }
      if (currentPlayer.devCardPlayedThisTurn && state.turnPhase === TurnPhase.PostRoll) {
        return { valid: false, reason: 'Already played a development card this turn' };
      }
      return { valid: true };
    }

    case 'playMonopoly': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only play after rolling' };
      }
      if (currentPlayer.devCardPlayedThisTurn) {
        return { valid: false, reason: 'Already played a development card this turn' };
      }
      const monopolyCard = currentPlayer.devCards.find(
        (c) => c.type === DevCardType.Monopoly && c.turnAcquired < state.turnNumber
      );
      if (!monopolyCard) {
        return { valid: false, reason: 'No playable monopoly card' };
      }
      return { valid: true };
    }

    case 'playYearOfPlenty': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only play after rolling' };
      }
      if (currentPlayer.devCardPlayedThisTurn) {
        return { valid: false, reason: 'Already played a development card this turn' };
      }
      const yopCard = currentPlayer.devCards.find(
        (c) => c.type === DevCardType.YearOfPlenty && c.turnAcquired < state.turnNumber
      );
      if (!yopCard) {
        return { valid: false, reason: 'No playable year of plenty card' };
      }
      return { valid: true };
    }

    case 'playRoadBuilding': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only play after rolling' };
      }
      if (currentPlayer.devCardPlayedThisTurn) {
        return { valid: false, reason: 'Already played a development card this turn' };
      }
      const rbCard = currentPlayer.devCards.find(
        (c) => c.type === DevCardType.RoadBuilding && c.turnAcquired < state.turnNumber
      );
      if (!rbCard) {
        return { valid: false, reason: 'No playable road building card' };
      }
      if (currentPlayer.remainingRoads < 2) {
        return { valid: false, reason: 'Not enough roads remaining' };
      }
      return { valid: true };
    }

    case 'moveRobber': {
      if (state.turnPhase !== TurnPhase.RobberMove) {
        return { valid: false, reason: 'Cannot move robber now' };
      }
      if (action.hex.q === state.robberHex.q && action.hex.r === state.robberHex.r) {
        return { valid: false, reason: 'Must move robber to a different hex' };
      }
      const robberTargetHex = state.board.hexes.find(
        (h) => h.coord.q === action.hex.q && h.coord.r === action.hex.r && h.coord.s === action.hex.s
      );
      if (!robberTargetHex) {
        return { valid: false, reason: 'Invalid hex' };
      }
      // In Seafarers, robber cannot go on sea hexes (use movePirate for that)
      if (robberTargetHex.terrain === Terrain.Sea) {
        return { valid: false, reason: 'Cannot place robber on sea — use pirate instead' };
      }
      return { valid: true };
    }

    case 'stealResource': {
      if (state.turnPhase !== TurnPhase.RobberSteal) {
        return { valid: false, reason: 'Cannot steal now' };
      }
      if (action.targetPlayerId === playerId) {
        return { valid: false, reason: 'Cannot steal from yourself' };
      }
      // Verify target has buildings adjacent to robber hex
      const playersOnHex = getPlayersOnHex(state, graph, state.robberHex);
      const validTargets = playersOnHex
        .filter((p) => p.playerId !== playerId)
        .map((p) => p.playerId);
      if (!validTargets.includes(action.targetPlayerId)) {
        return { valid: false, reason: 'Target player has no buildings adjacent to robber' };
      }
      return { valid: true };
    }

    case 'bankTrade': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only trade after rolling' };
      }
      // Verify giving and receiving amounts
      if (!hasResources(currentPlayer.resources, action.giving)) {
        return { valid: false, reason: 'Not enough resources to give' };
      }
      // Verify trade rates
      const receivingTotal = totalResources(action.receiving);
      if (receivingTotal !== 1) {
        return { valid: false, reason: 'Can only receive 1 resource per bank trade' };
      }
      const givingResource = ALL_RESOURCES.find((r) => action.giving[r] > 0);
      if (!givingResource) {
        return { valid: false, reason: 'Must give at least one resource' };
      }
      const rate = getTradeRate(state, playerId, givingResource);
      if (action.giving[givingResource] !== rate) {
        return { valid: false, reason: `Must give exactly ${rate} of that resource` };
      }
      // Only one giving resource type
      const givingTypes = ALL_RESOURCES.filter((r) => action.giving[r] > 0);
      if (givingTypes.length !== 1) {
        return { valid: false, reason: 'Bank trade must give only one type of resource' };
      }
      return { valid: true };
    }

    case 'proposeTrade': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only trade after rolling' };
      }
      if (state.activeTradeOffer) {
        return { valid: false, reason: 'A trade is already in progress' };
      }
      if (!hasResources(currentPlayer.resources, action.offering)) {
        return { valid: false, reason: 'Not enough resources to offer' };
      }
      return { valid: true };
    }

    case 'acceptTrade': {
      if (!state.activeTradeOffer || state.activeTradeOffer.id !== action.tradeId) {
        return { valid: false, reason: 'No matching trade offer' };
      }
      if (state.activeTradeOffer.fromPlayerId === playerId) {
        return { valid: false, reason: 'Cannot accept your own trade' };
      }
      const accepter = state.players.find((p) => p.id === playerId)!;
      if (!hasResources(accepter.resources, state.activeTradeOffer.requesting)) {
        return { valid: false, reason: 'Not enough resources to accept trade' };
      }
      return { valid: true };
    }

    case 'cancelTrade': {
      if (!state.activeTradeOffer || state.activeTradeOffer.id !== action.tradeId) {
        return { valid: false, reason: 'No matching trade offer' };
      }
      return { valid: true };
    }

    case 'buildShip': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only build after rolling' };
      }
      if (!state.config.seafarersEnabled) {
        return { valid: false, reason: 'Seafarers not enabled' };
      }
      if (!hasResources(currentPlayer.resources, BUILDING_COSTS.ship)) {
        return { valid: false, reason: 'Not enough resources for ship' };
      }
      if (currentPlayer.remainingShips <= 0) {
        return { valid: false, reason: 'No more ships available' };
      }
      if (isEdgeOccupiedByAny(state, action.edgeId)) {
        return { valid: false, reason: 'Edge occupied' };
      }
      if (!playerCanPlaceShipOnEdge(state, graph, playerId, action.edgeId)) {
        return { valid: false, reason: 'Ship must be on a sea edge and connect to your network' };
      }
      return { valid: true };
    }

    case 'moveShip': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Can only move ships after rolling' };
      }
      if (!state.config.seafarersEnabled) {
        return { valid: false, reason: 'Seafarers not enabled' };
      }
      if (!currentPlayer.ships.includes(action.fromEdgeId)) {
        return { valid: false, reason: 'You do not own this ship' };
      }
      if (!isShipOpen(state, graph, playerId, action.fromEdgeId)) {
        return { valid: false, reason: 'Ship is not open (both ends are connected)' };
      }
      if (isEdgeOccupiedByAny(state, action.toEdgeId)) {
        return { valid: false, reason: 'Target edge is occupied' };
      }
      if (!isSeaEdge(state, graph, action.toEdgeId)) {
        return { valid: false, reason: 'Ships can only be on sea edges' };
      }
      return { valid: true };
    }

    case 'movePirate': {
      if (state.turnPhase !== TurnPhase.RobberMove) {
        return { valid: false, reason: 'Cannot move pirate now' };
      }
      if (!state.config.seafarersEnabled) {
        return { valid: false, reason: 'Seafarers not enabled' };
      }
      // Must be a sea hex
      const pirateTargetHex = state.board.hexes.find(
        h => h.coord.q === action.hex.q && h.coord.r === action.hex.r && h.coord.s === action.hex.s
      );
      if (!pirateTargetHex || pirateTargetHex.terrain !== Terrain.Sea) {
        return { valid: false, reason: 'Pirate must be placed on a sea hex' };
      }
      // Must move to a different hex
      if (state.pirateHex &&
        action.hex.q === state.pirateHex.q && action.hex.r === state.pirateHex.r) {
        return { valid: false, reason: 'Must move pirate to a different hex' };
      }
      return { valid: true };
    }

    case 'endTurn': {
      if (state.turnPhase !== TurnPhase.PostRoll) {
        return { valid: false, reason: 'Cannot end turn now' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, reason: `Unknown action type: ${(action as any).type}` };
  }
}

export function handlePlayAction(
  state: GameState,
  envelope: ActionEnvelope,
  graph: BoardGraph,
  rng: SeededRandom
): ActionResult {
  const { action, playerId } = envelope;
  const events: GameEvent[] = [];
  let newState = structuredClone(state);

  switch (action.type) {
    case 'rollDice': {
      const d1 = rng.nextInt(1, 6);
      const d2 = rng.nextInt(1, 6);
      const total = d1 + d2;
      newState.lastDiceRoll = [d1, d2];
      newState.diceRollHistory.push({ roll: total, playerId });
      events.push({ type: 'diceRolled', values: [d1, d2], total });

      if (total === 7 && newState.config.robberEnabled) {
        // Players with >7 cards must discard
        const needDiscard = newState.players
          .filter((p) => totalResources(p.resources) > 7)
          .map((p) => p.id);

        if (needDiscard.length > 0) {
          newState.playersNeedingDiscard = needDiscard;
          newState.turnPhase = TurnPhase.RobberDiscard;
        } else {
          newState.turnPhase = TurnPhase.RobberMove;
        }
      } else if (total === 7 && !newState.config.robberEnabled) {
        newState.turnPhase = TurnPhase.PostRoll;
      } else {
        // Distribute resources
        distributeResources(newState, graph, total, events);
        // Check if gold choices are needed
        if (newState.playersNeedingGoldChoice.length > 0) {
          newState.turnPhase = TurnPhase.GoldChoice;
        } else {
          newState.turnPhase = TurnPhase.PostRoll;
        }
      }
      break;
    }

    case 'discardResources': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      newState.players[playerIdx].resources = subtractResources(
        newState.players[playerIdx].resources,
        action.resources
      );
      newState.bank = addResources(newState.bank, action.resources);
      newState.playersNeedingDiscard = newState.playersNeedingDiscard.filter((id) => id !== playerId);
      events.push({ type: 'resourcesDiscarded', playerId, resources: action.resources });

      if (newState.playersNeedingDiscard.length === 0) {
        newState.turnPhase = TurnPhase.RobberMove;
      }
      break;
    }

    case 'moveRobber': {
      // Remove robber from old hex
      const oldHex = newState.board.hexes.find(
        (h) => h.coord.q === newState.robberHex.q && h.coord.r === newState.robberHex.r
      );
      if (oldHex) oldHex.hasRobber = false;

      // Place robber on new hex
      newState.robberHex = action.hex;
      const newHex = newState.board.hexes.find(
        (h) => h.coord.q === action.hex.q && h.coord.r === action.hex.r
      );
      if (newHex) newHex.hasRobber = true;

      events.push({ type: 'robberMoved', hex: action.hex, movedByPlayerId: playerId });

      // Check if there are players to steal from
      const playersOnHex = getPlayersOnHex(newState, graph, action.hex);
      const stealTargets = playersOnHex
        .filter((p) => p.playerId !== playerId && totalResources(
          newState.players.find((pl) => pl.id === p.playerId)!.resources
        ) > 0)
        .map((p) => p.playerId);
      const uniqueTargets = [...new Set(stealTargets)];

      if (uniqueTargets.length === 0) {
        newState.turnPhase = TurnPhase.PostRoll;
      } else if (uniqueTargets.length === 1) {
        // Auto-steal from the only target
        performSteal(newState, playerId, uniqueTargets[0], rng, events);
        newState.turnPhase = TurnPhase.PostRoll;
      } else {
        newState.turnPhase = TurnPhase.RobberSteal;
      }
      break;
    }

    case 'stealResource': {
      performSteal(newState, playerId, action.targetPlayerId, rng, events);
      newState.turnPhase = TurnPhase.PostRoll;
      break;
    }

    case 'buildSettlement': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      newState.players[playerIdx].resources = subtractResources(
        newState.players[playerIdx].resources,
        BUILDING_COSTS.settlement
      );
      newState.bank = addResources(newState.bank, BUILDING_COSTS.settlement);
      newState.players[playerIdx].settlements.push(action.vertexId);
      newState.players[playerIdx].remainingSettlements--;
      events.push({ type: 'settlementBuilt', playerId, vertexId: action.vertexId });
      updateLongestRoad(newState, graph, events);
      checkVictory(newState, events);
      break;
    }

    case 'buildCity': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      newState.players[playerIdx].resources = subtractResources(
        newState.players[playerIdx].resources,
        BUILDING_COSTS.city
      );
      newState.bank = addResources(newState.bank, BUILDING_COSTS.city);
      newState.players[playerIdx].settlements = newState.players[playerIdx].settlements.filter(
        (v) => v !== action.vertexId
      );
      newState.players[playerIdx].cities.push(action.vertexId);
      newState.players[playerIdx].remainingCities--;
      newState.players[playerIdx].remainingSettlements++;
      events.push({ type: 'cityBuilt', playerId, vertexId: action.vertexId });
      checkVictory(newState, events);
      break;
    }

    case 'buildRoad': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      newState.players[playerIdx].resources = subtractResources(
        newState.players[playerIdx].resources,
        BUILDING_COSTS.road
      );
      newState.bank = addResources(newState.bank, BUILDING_COSTS.road);
      newState.players[playerIdx].roads.push(action.edgeId);
      newState.players[playerIdx].remainingRoads--;
      events.push({ type: 'roadBuilt', playerId, edgeId: action.edgeId });
      updateLongestRoad(newState, graph, events);
      checkVictory(newState, events);
      break;
    }

    case 'buyDevCard': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      newState.players[playerIdx].resources = subtractResources(
        newState.players[playerIdx].resources,
        BUILDING_COSTS.devCard
      );
      newState.bank = addResources(newState.bank, BUILDING_COSTS.devCard);
      const cardType = newState.devCardDeck.pop()!;
      newState.players[playerIdx].devCards.push({
        type: cardType,
        turnAcquired: newState.turnNumber,
      });
      events.push({ type: 'devCardBought', playerId, cardType });

      if (cardType === DevCardType.VictoryPoint) {
        newState.players[playerIdx].hiddenVP++;
        checkVictory(newState, events);
      }
      break;
    }

    case 'playKnight': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      const cardIdx = newState.players[playerIdx].devCards.findIndex(
        (c) => c.type === DevCardType.Knight && c.turnAcquired < newState.turnNumber
      );
      newState.players[playerIdx].devCards.splice(cardIdx, 1);
      newState.players[playerIdx].knightsPlayed++;
      newState.players[playerIdx].devCardPlayedThisTurn = true;
      events.push({ type: 'knightPlayed', playerId });

      // Move robber
      const oldHex2 = newState.board.hexes.find(
        (h) => h.coord.q === newState.robberHex.q && h.coord.r === newState.robberHex.r
      );
      if (oldHex2) oldHex2.hasRobber = false;
      newState.robberHex = action.moveRobberTo;
      const newHex2 = newState.board.hexes.find(
        (h) => h.coord.q === action.moveRobberTo.q && h.coord.r === action.moveRobberTo.r
      );
      if (newHex2) newHex2.hasRobber = true;
      events.push({ type: 'robberMoved', hex: action.moveRobberTo, movedByPlayerId: playerId });

      // Steal
      if (action.stealFromPlayerId) {
        performSteal(newState, playerId, action.stealFromPlayerId, rng, events);
      }

      updateLargestArmy(newState, events);
      checkVictory(newState, events);

      // If this was pre-roll, stay in pre-roll (player still needs to roll)
      if (state.turnPhase === TurnPhase.PreRoll) {
        newState.turnPhase = TurnPhase.PreRoll;
      }
      break;
    }

    case 'playMonopoly': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      const cardIdx = newState.players[playerIdx].devCards.findIndex(
        (c) => c.type === DevCardType.Monopoly && c.turnAcquired < newState.turnNumber
      );
      newState.players[playerIdx].devCards.splice(cardIdx, 1);
      newState.players[playerIdx].devCardPlayedThisTurn = true;

      let totalTaken = 0;
      for (let i = 0; i < newState.players.length; i++) {
        if (newState.players[i].id === playerId) continue;
        const amount = newState.players[i].resources[action.resource];
        newState.players[i].resources[action.resource] = 0;
        newState.players[playerIdx].resources[action.resource] += amount;
        totalTaken += amount;
      }
      events.push({ type: 'monopolyPlayed', playerId, resource: action.resource, amountTaken: totalTaken });
      break;
    }

    case 'playYearOfPlenty': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      const cardIdx = newState.players[playerIdx].devCards.findIndex(
        (c) => c.type === DevCardType.YearOfPlenty && c.turnAcquired < newState.turnNumber
      );
      newState.players[playerIdx].devCards.splice(cardIdx, 1);
      newState.players[playerIdx].devCardPlayedThisTurn = true;
      newState.players[playerIdx].resources[action.resources[0]]++;
      newState.players[playerIdx].resources[action.resources[1]]++;
      newState.bank[action.resources[0]]--;
      newState.bank[action.resources[1]]--;
      events.push({ type: 'yearOfPlentyPlayed', playerId, resources: action.resources });
      break;
    }

    case 'playRoadBuilding': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      const cardIdx = newState.players[playerIdx].devCards.findIndex(
        (c) => c.type === DevCardType.RoadBuilding && c.turnAcquired < newState.turnNumber
      );
      newState.players[playerIdx].devCards.splice(cardIdx, 1);
      newState.players[playerIdx].devCardPlayedThisTurn = true;

      for (const edgeId of action.edges) {
        newState.players[playerIdx].roads.push(edgeId);
        newState.players[playerIdx].remainingRoads--;
        events.push({ type: 'roadBuilt', playerId, edgeId });
      }
      events.push({ type: 'roadBuildingPlayed', playerId, edges: action.edges });
      updateLongestRoad(newState, graph, events);
      checkVictory(newState, events);
      break;
    }

    case 'bankTrade': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      newState.players[playerIdx].resources = subtractResources(
        newState.players[playerIdx].resources,
        action.giving
      );
      newState.players[playerIdx].resources = addResources(
        newState.players[playerIdx].resources,
        action.receiving
      );
      newState.bank = addResources(newState.bank, action.giving);
      newState.bank = subtractResources(newState.bank, action.receiving);
      events.push({ type: 'bankTradeCompleted', playerId, gave: action.giving, received: action.receiving });
      break;
    }

    case 'proposeTrade': {
      const tradeId = `trade-${newState.actionIndex}`;
      newState.activeTradeOffer = {
        id: tradeId,
        fromPlayerId: playerId,
        offering: action.offering,
        requesting: action.requesting,
        acceptedBy: [],
        status: 'open',
      };
      events.push({
        type: 'tradeProposed',
        offerId: tradeId,
        fromPlayerId: playerId,
        offering: action.offering,
        requesting: action.requesting,
      });
      break;
    }

    case 'acceptTrade': {
      const offer = newState.activeTradeOffer!;
      const proposerIdx = newState.players.findIndex((p) => p.id === offer.fromPlayerId);
      const accepterIdx = newState.players.findIndex((p) => p.id === playerId);

      // Swap resources
      newState.players[proposerIdx].resources = subtractResources(
        newState.players[proposerIdx].resources,
        offer.offering
      );
      newState.players[proposerIdx].resources = addResources(
        newState.players[proposerIdx].resources,
        offer.requesting
      );
      newState.players[accepterIdx].resources = subtractResources(
        newState.players[accepterIdx].resources,
        offer.requesting
      );
      newState.players[accepterIdx].resources = addResources(
        newState.players[accepterIdx].resources,
        offer.offering
      );

      events.push({ type: 'tradeAccepted', offerId: offer.id, byPlayerId: playerId });
      events.push({ type: 'tradeCompleted', offerId: offer.id, betweenPlayers: [offer.fromPlayerId, playerId] });
      newState.activeTradeOffer = null;
      break;
    }

    case 'cancelTrade': {
      events.push({ type: 'tradeCancelled', offerId: action.tradeId });
      newState.activeTradeOffer = null;
      break;
    }

    case 'buildShip': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      newState.players[playerIdx].resources = subtractResources(
        newState.players[playerIdx].resources,
        BUILDING_COSTS.ship
      );
      newState.bank = addResources(newState.bank, BUILDING_COSTS.ship);
      newState.players[playerIdx].ships.push(action.edgeId);
      newState.players[playerIdx].remainingShips--;
      events.push({ type: 'shipBuilt', playerId, edgeId: action.edgeId });
      updateLongestRoad(newState, graph, events);
      checkVictory(newState, events);
      break;
    }

    case 'moveShip': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      newState.players[playerIdx].ships = newState.players[playerIdx].ships.filter(
        (e) => e !== action.fromEdgeId
      );
      newState.players[playerIdx].ships.push(action.toEdgeId);
      events.push({ type: 'shipMoved', playerId, fromEdgeId: action.fromEdgeId, toEdgeId: action.toEdgeId });
      updateLongestRoad(newState, graph, events);
      checkVictory(newState, events);
      break;
    }

    case 'movePirate': {
      // Remove pirate from old hex
      if (newState.pirateHex) {
        const oldPirateHex = newState.board.hexes.find(
          (h) => h.coord.q === newState.pirateHex!.q && h.coord.r === newState.pirateHex!.r
        );
        if (oldPirateHex) oldPirateHex.hasPirate = false;
      }

      // Place pirate on new hex
      newState.pirateHex = action.hex;
      const newPirateHex = newState.board.hexes.find(
        (h) => h.coord.q === action.hex.q && h.coord.r === action.hex.r
      );
      if (newPirateHex) newPirateHex.hasPirate = true;

      events.push({ type: 'pirateMoved', hex: action.hex, movedByPlayerId: playerId });

      // Check for steal targets (players with ships adjacent to pirate hex)
      const shipOwners = getPlayersWithShipsOnHex(newState, graph, action.hex)
        .filter(id => id !== playerId && totalResources(
          newState.players.find(p => p.id === id)!.resources
        ) > 0);
      const uniqueShipTargets = [...new Set(shipOwners)];

      if (uniqueShipTargets.length === 0) {
        newState.turnPhase = TurnPhase.PostRoll;
      } else if (uniqueShipTargets.length === 1) {
        performSteal(newState, playerId, uniqueShipTargets[0], rng, events);
        newState.turnPhase = TurnPhase.PostRoll;
      } else {
        newState.turnPhase = TurnPhase.RobberSteal;
      }
      break;
    }

    case 'chooseGoldResource': {
      const playerIdx = newState.players.findIndex((p) => p.id === playerId);
      const pendingIdx = newState.playersNeedingGoldChoice.findIndex(p => p.playerId === playerId);
      if (pendingIdx >= 0) {
        const pending = newState.playersNeedingGoldChoice[pendingIdx];
        // Give the chosen resource (1 per count)
        const amount = Math.min(pending.count, newState.bank[action.resource]);
        newState.players[playerIdx].resources[action.resource] += amount;
        newState.bank[action.resource] -= amount;
        events.push({ type: 'goldResourceChosen', playerId, resource: action.resource });

        // Remove from pending list
        newState.playersNeedingGoldChoice.splice(pendingIdx, 1);

        // If no more gold choices needed, continue to PostRoll
        if (newState.playersNeedingGoldChoice.length === 0) {
          newState.turnPhase = TurnPhase.PostRoll;
        }
      }
      break;
    }

    case 'endTurn': {
      const currentIdx = newState.currentPlayerIndex;
      events.push({ type: 'turnEnded', playerIndex: currentIdx });

      // Cancel any active trade
      if (newState.activeTradeOffer) {
        newState.activeTradeOffer = null;
      }

      // Advance to next player
      newState.currentPlayerIndex = (currentIdx + 1) % newState.players.length;
      newState.turnNumber++;
      newState.turnPhase = TurnPhase.PreRoll;
      newState.lastDiceRoll = null;
      newState.players[newState.currentPlayerIndex].devCardPlayedThisTurn = false;

      events.push({
        type: 'turnStarted',
        playerIndex: newState.currentPlayerIndex,
        turnNumber: newState.turnNumber,
      });
      break;
    }
  }

  return { newState, events };
}

function distributeResources(
  state: GameState,
  graph: BoardGraph,
  roll: number,
  events: GameEvent[]
) {
  const distributions: Record<string, ResourceBundle> = {};
  let anyDistributed = false;

  // Track gold hex resource choices needed
  const goldChoices: Array<{ playerId: string; count: number }> = [];

  for (const hex of state.board.hexes) {
    if (hex.numberToken !== roll || hex.hasRobber) continue;

    // Gold hex: players choose their resource later
    if (hex.terrain === Terrain.Gold) {
      const playersOnHex = getPlayersOnHex(state, graph, hex.coord);
      for (const { playerId, isCity } of playersOnHex) {
        const count = isCity ? 2 : 1;
        const existing = goldChoices.find(g => g.playerId === playerId);
        if (existing) {
          existing.count += count;
        } else {
          goldChoices.push({ playerId, count });
        }
      }
      anyDistributed = true;
      continue;
    }

    const resource = TERRAIN_TO_RESOURCE[hex.terrain];
    if (!resource) continue;

    const playersOnHex = getPlayersOnHex(state, graph, hex.coord);
    for (const { playerId, isCity } of playersOnHex) {
      const wanted = isCity ? 2 : 1;
      const amount = Math.min(wanted, state.bank[resource]);
      if (amount <= 0) continue;
      const playerIdx = state.players.findIndex((p) => p.id === playerId);
      state.players[playerIdx].resources[resource] += amount;
      state.bank[resource] -= amount;

      if (!distributions[playerId]) distributions[playerId] = emptyResources();
      distributions[playerId][resource] += amount;
      anyDistributed = true;
    }
  }

  if (Object.keys(distributions).length > 0) {
    events.push({ type: 'resourcesDistributed', distributions });
  }
  if (!anyDistributed) {
    events.push({ type: 'noResourcesProduced', roll });
  }

  // Queue gold choices if any
  if (goldChoices.length > 0) {
    state.playersNeedingGoldChoice = goldChoices;
  }
}

function performSteal(
  state: GameState,
  stealerId: string,
  targetId: string,
  rng: SeededRandom,
  events: GameEvent[]
) {
  const targetIdx = state.players.findIndex((p) => p.id === targetId);
  const stealerIdx = state.players.findIndex((p) => p.id === stealerId);
  const targetResources = state.players[targetIdx].resources;

  // Pick a random resource from target's hand
  const available: ResourceType[] = [];
  for (const r of ALL_RESOURCES) {
    for (let i = 0; i < targetResources[r]; i++) {
      available.push(r);
    }
  }

  if (available.length === 0) {
    events.push({ type: 'resourceStolen', fromPlayerId: targetId, byPlayerId: stealerId });
    return;
  }

  const stolen = available[rng.nextInt(0, available.length - 1)];
  state.players[targetIdx].resources[stolen]--;
  state.players[stealerIdx].resources[stolen]++;
  events.push({ type: 'resourceStolen', fromPlayerId: targetId, byPlayerId: stealerId, resource: stolen });
}
