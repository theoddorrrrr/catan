import { GameState } from '../types/game.js';
import { VertexId, HexCoord, hexKey } from '../types/board.js';
import { Terrain, TERRAIN_TO_RESOURCE, ResourceType } from '../types/resource.js';
// Note: vertexScore handles gold hexes via numberPips (gold has number tokens)
import { BoardGraph } from '../board/hex-grid.js';
import { numberPips } from '../board/board-generator.js';

// Score a vertex by production value (sum of pip probabilities)
export function vertexProductionScore(
  vertexId: VertexId,
  state: GameState,
  graph: BoardGraph
): number {
  const adjacentHexes = graph.vertexToHexes.get(vertexId) || [];
  let score = 0;

  for (const hex of adjacentHexes) {
    const tile = state.board.hexes.find(
      (h) => h.coord.q === hex.q && h.coord.r === hex.r && h.coord.s === hex.s
    );
    if (tile && tile.numberToken && !tile.hasRobber) {
      score += numberPips(tile.numberToken);
    }
  }
  return score;
}

// Score a vertex by resource diversity (different resource types)
export function vertexDiversityScore(
  vertexId: VertexId,
  state: GameState,
  graph: BoardGraph
): number {
  const adjacentHexes = graph.vertexToHexes.get(vertexId) || [];
  const resources = new Set<ResourceType>();

  for (const hex of adjacentHexes) {
    const tile = state.board.hexes.find(
      (h) => h.coord.q === hex.q && h.coord.r === hex.r && h.coord.s === hex.s
    );
    if (tile) {
      const resource = TERRAIN_TO_RESOURCE[tile.terrain];
      if (resource) resources.add(resource);
    }
  }
  return resources.size;
}

// Combined vertex score for initial placement
export function vertexScore(
  vertexId: VertexId,
  state: GameState,
  graph: BoardGraph
): number {
  const production = vertexProductionScore(vertexId, state, graph);
  const diversity = vertexDiversityScore(vertexId, state, graph);
  // Weight production more, but bonus for diversity
  return production * 2 + diversity * 3;
}

// Score a hex for robber placement (how much it hurts the opponent)
export function robberHexScore(
  hexCoord: HexCoord,
  state: GameState,
  graph: BoardGraph,
  playerId: string
): number {
  const hk = hexKey(hexCoord);
  const hexVertices = graph.hexToVertices.get(hk) || [];
  const tile = state.board.hexes.find(
    (h) => h.coord.q === hexCoord.q && h.coord.r === hexCoord.r && h.coord.s === hexCoord.s
  );
  if (!tile || !tile.numberToken) return -100;
  // Don't place robber on sea hexes
  if (tile.terrain === Terrain.Sea) return -100;

  const pips = numberPips(tile.numberToken);
  let score = 0;

  for (const v of hexVertices) {
    for (const player of state.players) {
      if (player.id === playerId) {
        // Penalty for hurting ourselves
        if (player.settlements.includes(v)) score -= pips;
        if (player.cities.includes(v)) score -= pips * 2;
      } else {
        // Bonus for hurting opponents, especially the leader
        const weight = player.victoryPoints >= state.config.victoryPointsToWin - 2 ? 3 : 1;
        if (player.settlements.includes(v)) score += pips * weight;
        if (player.cities.includes(v)) score += pips * 2 * weight;
      }
    }
  }
  return score;
}
