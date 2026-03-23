import { GameState } from '../types/game.js';
import { HexCoord, VertexId, EdgeId, hexKey, HarborType } from '../types/board.js';
import { ResourceType, Terrain } from '../types/resource.js';
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

// ========== Seafarers: Ship & Sea Edge Queries ==========

/** Check if an edge is a sea edge (at least one adjacent hex is sea) */
export function isSeaEdge(
  state: GameState,
  graph: BoardGraph,
  edgeId: EdgeId
): boolean {
  const vertices = graph.edgeToVertices.get(edgeId);
  if (!vertices) return false;

  // An edge borders the hexes that both vertices share
  const [v1, v2] = vertices;
  const v1Hexes = graph.vertexToHexes.get(v1) || [];
  const v2Hexes = graph.vertexToHexes.get(v2) || [];

  // Find hexes shared by both vertices (these are the hexes bordering this edge)
  const v1HexKeys = new Set(v1Hexes.map(hexKey));
  const sharedHexes = v2Hexes.filter(h => v1HexKeys.has(hexKey(h)));

  // Check if any shared hex is sea
  for (const h of sharedHexes) {
    const tile = state.board.hexes.find(
      t => t.coord.q === h.q && t.coord.r === h.r && t.coord.s === h.s
    );
    if (tile && tile.terrain === Terrain.Sea) return true;
  }

  // Also sea if edge is on board boundary and one side is "off board" (treat as sea)
  if (sharedHexes.length < 2) return true;

  return false;
}

/** Check if an edge is a land edge (both adjacent hexes are land or only one hex and it's land) */
export function isLandEdge(
  state: GameState,
  graph: BoardGraph,
  edgeId: EdgeId
): boolean {
  return !isSeaEdge(state, graph, edgeId);
}

/** Get the owner of a ship on an edge */
export function getShipOwner(state: GameState, edgeId: EdgeId): string | null {
  for (const player of state.players) {
    if (player.ships.includes(edgeId)) {
      return player.id;
    }
  }
  return null;
}

/** Check if edge is occupied by road or ship */
export function isEdgeOccupiedByAny(state: GameState, edgeId: EdgeId): boolean {
  return getEdgeOwner(state, edgeId) !== null || getShipOwner(state, edgeId) !== null;
}

/** Check if player has an adjacent road, ship, or building to a vertex */
export function playerHasAdjacentConnectionOrBuilding(
  state: GameState,
  graph: BoardGraph,
  playerId: string,
  vertexId: VertexId
): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;

  if (player.settlements.includes(vertexId) || player.cities.includes(vertexId)) return true;

  const adjacentEdges = graph.vertexToEdges.get(vertexId) || [];
  for (const edgeId of adjacentEdges) {
    if (player.roads.includes(edgeId) || player.ships.includes(edgeId)) return true;
  }
  return false;
}

/** Check if player can place a ship on an edge */
export function playerCanPlaceShipOnEdge(
  state: GameState,
  graph: BoardGraph,
  playerId: string,
  edgeId: EdgeId
): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;

  // Ship must be on a sea edge
  if (!isSeaEdge(state, graph, edgeId)) return false;

  // Must connect to player's network (road, ship, or building at one of the edge's vertices)
  const vertices = graph.edgeToVertices.get(edgeId);
  if (!vertices) return false;

  for (const v of vertices) {
    const owner = getVertexOwner(state, v);
    if (owner && owner !== playerId) continue; // Blocked by opponent building

    if (playerHasAdjacentConnectionOrBuilding(state, graph, playerId, v)) return true;
  }
  return false;
}

/** Get valid ship edges for a player */
export function getValidShipEdges(
  state: GameState,
  graph: BoardGraph,
  playerId: string
): EdgeId[] {
  const result: EdgeId[] = [];
  for (const edgeId of graph.edges) {
    if (
      !isEdgeOccupiedByAny(state, edgeId) &&
      playerCanPlaceShipOnEdge(state, graph, playerId, edgeId)
    ) {
      result.push(edgeId);
    }
  }
  return result;
}

/**
 * Check if a ship is "open" (can be moved).
 * An open ship is at the end of a shipping route - one of its endpoints
 * is not connected to another ship or building of the same player.
 */
export function isShipOpen(
  state: GameState,
  graph: BoardGraph,
  playerId: string,
  edgeId: EdgeId
): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;

  const vertices = graph.edgeToVertices.get(edgeId);
  if (!vertices) return false;

  const [v1, v2] = vertices;

  // Count connections at each endpoint (other ships or buildings)
  function countConnections(v: VertexId): number {
    let count = 0;
    if (player!.settlements.includes(v) || player!.cities.includes(v)) count++;
    const adjEdges = graph.vertexToEdges.get(v) || [];
    for (const e of adjEdges) {
      if (e !== edgeId && player!.ships.includes(e)) count++;
    }
    return count;
  }

  // Ship is open if at least one endpoint has no other connections
  return countConnections(v1) === 0 || countConnections(v2) === 0;
}

/**
 * Calculate longest trade route for a player (roads + ships combined).
 * Used in Seafarers instead of longest road.
 */
export function calculateLongestTradeRoute(
  state: GameState,
  graph: BoardGraph,
  playerId: string
): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;

  const playerEdges = new Set([...player.roads, ...player.ships]);
  if (playerEdges.size === 0) return 0;

  let longest = 0;

  function dfs(vertexId: VertexId, visited: Set<EdgeId>, length: number) {
    longest = Math.max(longest, length);

    const adjacentEdges = graph.vertexToEdges.get(vertexId) || [];
    for (const edgeId of adjacentEdges) {
      if (!playerEdges.has(edgeId) || visited.has(edgeId)) continue;

      const owner = getVertexOwner(state, vertexId);
      if (owner && owner !== playerId && length > 0) continue;

      const [v1, v2] = graph.edgeToVertices.get(edgeId)!;
      const nextVertex = v1 === vertexId ? v2 : v1;

      visited.add(edgeId);
      dfs(nextVertex, visited, length + 1);
      visited.delete(edgeId);
    }
  }

  for (const edge of playerEdges) {
    const [v1, v2] = graph.edgeToVertices.get(edge)!;
    dfs(v1, new Set(), 0);
    dfs(v2, new Set(), 0);
  }

  return longest;
}

/** Get players with ships adjacent to a hex (for pirate steal) */
export function getPlayersWithShipsOnHex(
  state: GameState,
  graph: BoardGraph,
  hexCoord: HexCoord
): string[] {
  const hk = hexKey(hexCoord);
  const hexEdges = graph.hexToEdges.get(hk) || [];
  const playerIds = new Set<string>();

  for (const edgeId of hexEdges) {
    const shipOwner = getShipOwner(state, edgeId);
    if (shipOwner) playerIds.add(shipOwner);
  }

  return [...playerIds];
}
