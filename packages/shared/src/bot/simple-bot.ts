import { BotStrategy } from './bot-interface.js';
import { GameState, TurnPhase } from '../types/game.js';
import { GameAction } from '../types/action.js';
import {
  ResourceBundle,
  emptyResources,
  hasResources,
  BUILDING_COSTS,
  ResourceType,
  ALL_RESOURCES,
  totalResources,
  DevCardType,
} from '../types/resource.js';
import { HexCoord, VertexId, EdgeId } from '../types/board.js';
import { BoardGraph } from '../board/hex-grid.js';
import {
  getValidSettlementVertices,
  getValidRoadEdges,
  getValidInitialSettlementVertices,
  getValidRoadEdgesFromVertex,
  getTradeRate,
  getPlayersOnHex,
} from '../engine/board-query.js';
import { vertexScore, robberHexScore } from './bot-evaluator.js';

export class SimpleBot implements BotStrategy {
  chooseInitialSettlement(state: GameState, playerId: string, graph: BoardGraph): VertexId {
    const valid = getValidInitialSettlementVertices(state, graph);
    if (valid.length === 0) throw new Error('No valid initial settlement vertices');

    // Score and pick best
    let best = valid[0];
    let bestScore = -Infinity;
    for (const v of valid) {
      const score = vertexScore(v, state, graph);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  }

  chooseInitialRoad(
    state: GameState,
    playerId: string,
    graph: BoardGraph,
    settlementVertex: VertexId
  ): EdgeId {
    const validEdges = getValidRoadEdgesFromVertex(state, graph, playerId, settlementVertex);
    if (validEdges.length === 0) throw new Error('No valid road edges from settlement');

    // Pick the edge that leads toward the best unoccupied vertex
    let bestEdge = validEdges[0];
    let bestScore = -Infinity;

    for (const edgeId of validEdges) {
      const [v1, v2] = graph.edgeToVertices.get(edgeId)!;
      const otherVertex = v1 === settlementVertex ? v2 : v1;

      // Score based on the vertices reachable from the other end
      const adjVertices = graph.vertexToVertices.get(otherVertex) || [];
      let score = 0;
      for (const adj of adjVertices) {
        score += vertexScore(adj, state, graph);
      }
      if (score > bestScore) {
        bestScore = score;
        bestEdge = edgeId;
      }
    }
    return bestEdge;
  }

  chooseDiscard(
    state: GameState,
    playerId: string,
    graph: BoardGraph,
    mustDiscard: number
  ): ResourceBundle {
    const player = state.players.find((p) => p.id === playerId)!;
    const discard = emptyResources();

    // Discard resources we have the most of
    let remaining = mustDiscard;
    const sorted = [...ALL_RESOURCES].sort(
      (a, b) => player.resources[b] - player.resources[a]
    );

    for (const resource of sorted) {
      if (remaining <= 0) break;
      const canDiscard = Math.min(player.resources[resource] - (discard[resource] || 0), remaining);
      const toDiscard = Math.min(canDiscard, Math.ceil(player.resources[resource] / 2));
      discard[resource] += toDiscard;
      remaining -= toDiscard;
    }

    // If we still need to discard more, do another pass
    while (remaining > 0) {
      for (const resource of sorted) {
        if (remaining <= 0) break;
        if (player.resources[resource] - discard[resource] > 0) {
          discard[resource]++;
          remaining--;
        }
      }
    }

    return discard;
  }

  chooseRobberHex(state: GameState, playerId: string, graph: BoardGraph): HexCoord {
    let bestHex = state.board.hexes[0].coord;
    let bestScore = -Infinity;

    for (const hex of state.board.hexes) {
      if (hex.coord.q === state.robberHex.q && hex.coord.r === state.robberHex.r) continue;
      const score = robberHexScore(hex.coord, state, graph, playerId);
      if (score > bestScore) {
        bestScore = score;
        bestHex = hex.coord;
      }
    }
    return bestHex;
  }

  chooseStealTarget(
    state: GameState,
    playerId: string,
    graph: BoardGraph,
    candidates: string[]
  ): string {
    // Steal from the player with the most VP (or most resources)
    let bestTarget = candidates[0];
    let bestScore = -Infinity;

    for (const targetId of candidates) {
      const target = state.players.find((p) => p.id === targetId)!;
      const score = target.victoryPoints * 10 + totalResources(target.resources);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = targetId;
      }
    }
    return bestTarget;
  }

  chooseAction(state: GameState, playerId: string, graph: BoardGraph): GameAction {
    const player = state.players.find((p) => p.id === playerId)!;

    // Handle robber phases
    if (state.turnPhase === TurnPhase.RobberDiscard) {
      const total = totalResources(player.resources);
      const mustDiscard = Math.floor(total / 2);
      return { type: 'discardResources', resources: this.chooseDiscard(state, playerId, graph, mustDiscard) };
    }

    if (state.turnPhase === TurnPhase.RobberMove) {
      const hex = this.chooseRobberHex(state, playerId, graph);
      return { type: 'moveRobber', hex };
    }

    if (state.turnPhase === TurnPhase.RobberSteal) {
      const playersOnHex = getPlayersOnHex(state, graph, state.robberHex);
      const candidates = [...new Set(
        playersOnHex
          .filter((p) => p.playerId !== playerId)
          .map((p) => p.playerId)
      )];
      return { type: 'stealResource', targetPlayerId: this.chooseStealTarget(state, playerId, graph, candidates) };
    }

    // Pre-roll: optionally play a knight
    if (state.turnPhase === TurnPhase.PreRoll) {
      const knight = player.devCards.find(
        (c) => c.type === DevCardType.Knight && c.turnAcquired < state.turnNumber
      );
      if (knight && !player.devCardPlayedThisTurn) {
        const hex = this.chooseRobberHex(state, playerId, graph);
        const playersOnTarget = getPlayersOnHex(state, graph, hex);
        const stealCandidates = playersOnTarget
          .filter((p) => p.playerId !== playerId)
          .map((p) => p.playerId);
        const stealFrom = stealCandidates.length > 0
          ? this.chooseStealTarget(state, playerId, graph, [...new Set(stealCandidates)])
          : undefined;
        return { type: 'playKnight', moveRobberTo: hex, stealFromPlayerId: stealFrom };
      }
      return { type: 'rollDice' };
    }

    // Post-roll: build and trade
    if (state.turnPhase === TurnPhase.PostRoll) {
      return this.chooseBuildAction(state, playerId, graph);
    }

    return { type: 'endTurn' };
  }

  private chooseBuildAction(state: GameState, playerId: string, graph: BoardGraph): GameAction {
    const player = state.players.find((p) => p.id === playerId)!;

    // Priority 1: Build city if possible
    if (
      hasResources(player.resources, BUILDING_COSTS.city) &&
      player.remainingCities > 0 &&
      player.settlements.length > 0
    ) {
      // Pick settlement with best production
      let bestVertex = player.settlements[0];
      let bestScore = -Infinity;
      for (const v of player.settlements) {
        const score = vertexScore(v, state, graph);
        if (score > bestScore) {
          bestScore = score;
          bestVertex = v;
        }
      }
      return { type: 'buildCity', vertexId: bestVertex };
    }

    // Priority 2: Build settlement if possible
    if (
      hasResources(player.resources, BUILDING_COSTS.settlement) &&
      player.remainingSettlements > 0
    ) {
      const validVertices = getValidSettlementVertices(state, graph, playerId);
      if (validVertices.length > 0) {
        let best = validVertices[0];
        let bestScore = -Infinity;
        for (const v of validVertices) {
          const score = vertexScore(v, state, graph);
          if (score > bestScore) {
            bestScore = score;
            best = v;
          }
        }
        return { type: 'buildSettlement', vertexId: best };
      }
    }

    // Priority 3: Build road toward a good settlement spot
    if (
      hasResources(player.resources, BUILDING_COSTS.road) &&
      player.remainingRoads > 0
    ) {
      const validEdges = getValidRoadEdges(state, graph, playerId);
      if (validEdges.length > 0) {
        // Pick edge that leads toward unoccupied high-value vertices
        let bestEdge = validEdges[0];
        let bestScore = -Infinity;
        for (const edgeId of validEdges) {
          const [v1, v2] = graph.edgeToVertices.get(edgeId)!;
          const s1 = vertexScore(v1, state, graph);
          const s2 = vertexScore(v2, state, graph);
          const score = Math.max(s1, s2);
          if (score > bestScore) {
            bestScore = score;
            bestEdge = edgeId;
          }
        }
        return { type: 'buildRoad', edgeId: bestEdge };
      }
    }

    // Priority 4: Buy dev card
    if (
      state.config.devCardsEnabled &&
      hasResources(player.resources, BUILDING_COSTS.devCard) &&
      state.devCardDeck.length > 0
    ) {
      return { type: 'buyDevCard' };
    }

    // Priority 5: Try bank trade for resources we need
    const tradeAction = this.tryBankTrade(state, playerId, graph);
    if (tradeAction) return tradeAction;

    // Nothing useful to do
    return { type: 'endTurn' };
  }

  private tryBankTrade(
    state: GameState,
    playerId: string,
    graph: BoardGraph
  ): GameAction | null {
    const player = state.players.find((p) => p.id === playerId)!;

    // Figure out what we need most
    const needs: ResourceType[] = [];
    if (!hasResources(player.resources, BUILDING_COSTS.city)) {
      if (player.resources[ResourceType.Ore] < 3) needs.push(ResourceType.Ore);
      if (player.resources[ResourceType.Grain] < 2) needs.push(ResourceType.Grain);
    }
    if (!hasResources(player.resources, BUILDING_COSTS.settlement)) {
      for (const r of [ResourceType.Brick, ResourceType.Lumber, ResourceType.Grain, ResourceType.Wool]) {
        if (player.resources[r] < 1) needs.push(r);
      }
    }

    if (needs.length === 0) return null;

    // Find a resource we have excess of to trade
    for (const give of ALL_RESOURCES) {
      const rate = getTradeRate(state, playerId, give);
      if (player.resources[give] >= rate + 1) { // Keep at least 1
        const need = needs[0];
        if (need && need !== give) {
          const giving = emptyResources();
          giving[give] = rate;
          const receiving = emptyResources();
          receiving[need] = 1;
          return { type: 'bankTrade', giving, receiving };
        }
      }
    }

    return null;
  }
}
