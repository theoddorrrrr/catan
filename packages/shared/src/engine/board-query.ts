import { GameState } from '../types/game.js';
import { HexCoord, VertexId, EdgeId, hexKey, HarborType } from '../types/board.js';
import { ResourceType } from '../types/resource.js';
import { BoardGraph } from '../board/hex-grid.js';

// Query functions that operate on game state + board graph

export function getVertexOwner(state: GameState, vertexId: VertexId): string | null {
  for (const player of state.players) {
    if (player.settlements.includes(vertexId) || player.cities.includes(vertexId)) {
      return player.id;
    }
  }
  return null;
}

export function getEdgeOwner(state: GameState, edgeId: EdgeId): string | null {
  for (const player of state.players) {
    if (player.roads.includes(edgeId)) {
      return player.id;
    }
  }
  return null;
}

export function isVertexOccupied(state: GameState, vertexId: VertexId): boolean {
  return getVertexOwner(state, vertexId) !== null;
}

export function isEdgeOccupied(state: GameState, edgeId: EdgeId): boolean {
  return getEdgeOwner(state, edgeId) !== null;
}

// Check distance rule: no settlement can be placed adjacent to another settlement/city
export function isVertexDistanceLegal(
  state: GameState,
  graph: BoardGraph,
  vertexId: VertexId
): boolean {
  const adjacentVertices = graph.vertexToVertices.get(vertexId) || [];
  for (const adjV of adjacentVertices) {
    if (isVertexOccupied(state, adjV)) {
      return false;
    }
  }
  return true;
}

// Check if a player has a road or building adjacent to a vertex
export function playerHasAdjacentRoadOrBuilding(
  state: GameState,
  graph: BoardGraph,
  playerId: string,
  vertexId: VertexId
): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;

  // Check if player has a building on this vertex
  if (player.settlements.includes(vertexId) || player.cities.includes(vertexId)) {
    return true;
  }

  // Check if player has a road connecting to this vertex
  const adjacentEdges = graph.vertexToEdges.get(vertexId) || [];
  for (const edgeId of adjacentEdges) {
    if (player.roads.includes(edgeId)) {
      return true;
    }
  }
  return false;
}

// Check if a player has a road or building adjacent to an edge endpoint
export function playerCanPlaceRoadOnEdge(
  state: GameState,
  graph: BoardGraph,
  playerId: string,
  edgeId: EdgeId
): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;

  const vertices = graph.edgeToVertices.get(edgeId);
  if (!vertices) return false;

  for (const v of vertices) {
    // If there's an opponent's building on this vertex, can't extend through it
    const owner = getVertexOwner(state, v);
    if (owner && owner !== playerId) continue;

    if (playerHasAdjacentRoadOrBuilding(state, graph, playerId, v)) {
      return true;
    }
  }
  return false;
}

// Get all valid settlement vertices for a player
export function getValidSettlementVertices(
  state: GameState,
  graph: BoardGraph,
  playerId: string
): VertexId[] {
  const result: VertexId[] = [];
  for (const vertexId of graph.vertices) {
    if (
      !isVertexOccupied(state, vertexId) &&
      isVertexDistanceLegal(state, graph, vertexId) &&
      playerHasAdjacentRoadOrBuilding(state, graph, playerId, vertexId)
    ) {
      result.push(vertexId);
    }
  }
  return result;
}

// Get all valid initial settlement vertices (no road requirement)
export function getValidInitialSettlementVertices(
  state: GameState,
  graph: BoardGraph
): VertexId[] {
  const result: VertexId[] = [];
  for (const vertexId of graph.vertices) {
    if (
      !isVertexOccupied(state, vertexId) &&
      isVertexDistanceLegal(state, graph, vertexId)
    ) {
      result.push(vertexId);
    }
  }
  return result;
}

// Get all valid road edges for a player
export function getValidRoadEdges(
  state: GameState,
  graph: BoardGraph,
  playerId: string
): EdgeId[] {
  const result: EdgeId[] = [];
  for (const edgeId of graph.edges) {
    if (
      !isEdgeOccupied(state, edgeId) &&
      playerCanPlaceRoadOnEdge(state, graph, playerId, edgeId)
    ) {
      result.push(edgeId);
    }
  }
  return result;
}

// Get valid road edges connected to a specific vertex
export function getValidRoadEdgesFromVertex(
  state: GameState,
  graph: BoardGraph,
  playerId: string,
  vertexId: VertexId
): EdgeId[] {
  const adjacentEdges = graph.vertexToEdges.get(vertexId) || [];
  return adjacentEdges.filter((edgeId) => !isEdgeOccupied(state, edgeId));
}

// Get player's harbors
export function getPlayerHarbors(state: GameState, playerId: string): HarborType[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return [];

  const playerVertices = new Set([...player.settlements, ...player.cities]);
  const harbors: HarborType[] = [];

  for (const harbor of state.board.harbors) {
    if (harbor.vertices.some((v) => playerVertices.has(v))) {
      harbors.push(harbor.type);
    }
  }
  return harbors;
}

// Get the trade rate for a specific resource for a player
export function getTradeRate(state: GameState, playerId: string, resource: ResourceType): number {
  const harbors = getPlayerHarbors(state, playerId);

  // Check specific harbor first (2:1)
  const resourceToHarbor: Record<ResourceType, HarborType> = {
    [ResourceType.Brick]: HarborType.Brick,
    [ResourceType.Lumber]: HarborType.Lumber,
    [ResourceType.Ore]: HarborType.Ore,
    [ResourceType.Grain]: HarborType.Grain,
    [ResourceType.Wool]: HarborType.Wool,
  };

  if (harbors.includes(resourceToHarbor[resource])) return 2;
  if (harbors.includes(HarborType.Generic)) return 3;
  return 4;
}

// Get players adjacent to a hex (who have settlements/cities there)
export function getPlayersOnHex(
  state: GameState,
  graph: BoardGraph,
  hexCoord: HexCoord
): Array<{ playerId: string; isCity: boolean; vertexId: VertexId }> {
  const hk = hexKey(hexCoord);
  const hexVertices = graph.hexToVertices.get(hk) || [];
  const result: Array<{ playerId: string; isCity: boolean; vertexId: VertexId }> = [];

  for (const vertexId of hexVertices) {
    for (const player of state.players) {
      if (player.cities.includes(vertexId)) {
        result.push({ playerId: player.id, isCity: true, vertexId });
      } else if (player.settlements.includes(vertexId)) {
        result.push({ playerId: player.id, isCity: false, vertexId });
      }
    }
  }
  return result;
}

// Calculate longest road for a player using DFS
export function calculateLongestRoad(
  state: GameState,
  graph: BoardGraph,
  playerId: string
): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.roads.length === 0) return 0;

  const playerRoads = new Set(player.roads);
  let longest = 0;

  // DFS from each road endpoint
  function dfs(vertexId: VertexId, visited: Set<EdgeId>, length: number) {
    longest = Math.max(longest, length);

    const adjacentEdges = graph.vertexToEdges.get(vertexId) || [];
    for (const edgeId of adjacentEdges) {
      if (!playerRoads.has(edgeId) || visited.has(edgeId)) continue;

      // Check if an opponent's building blocks the path at this vertex
      const owner = getVertexOwner(state, vertexId);
      if (owner && owner !== playerId && length > 0) continue;

      const [v1, v2] = graph.edgeToVertices.get(edgeId)!;
      const nextVertex = v1 === vertexId ? v2 : v1;

      visited.add(edgeId);
      dfs(nextVertex, visited, length + 1);
      visited.delete(edgeId);
    }
  }

  // Start DFS from each endpoint of each road
  for (const road of playerRoads) {
    const [v1, v2] = graph.edgeToVertices.get(road)!;
    dfs(v1, new Set(), 0);
    dfs(v2, new Set(), 0);
  }

  return longest;
}
