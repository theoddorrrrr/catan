import { Terrain } from './resource.js';

// Cube coordinates for hex grid (q + r + s = 0)
export interface HexCoord {
  q: number;
  r: number;
  s: number;
}

// String keys for use in Maps/Sets
export type VertexId = string;
export type EdgeId = string;

export interface HexTile {
  coord: HexCoord;
  terrain: Terrain;
  numberToken: number | null; // null for desert/sea
  hasRobber: boolean;
  hasPirate?: boolean; // Seafarers: pirate on sea hex
}

export enum HarborType {
  Generic = 'generic',
  Brick = 'brick',
  Lumber = 'lumber',
  Ore = 'ore',
  Grain = 'grain',
  Wool = 'wool',
}

export interface Harbor {
  type: HarborType;
  vertices: [VertexId, VertexId];
}

export interface BoardState {
  hexes: HexTile[];
  harbors: Harbor[];
}

// Helper to create a hex coord key string for maps
export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r},${coord.s}`;
}

// Helper to make a vertex ID from 3 adjacent hex coords (sorted for consistency)
export function makeVertexId(hexes: HexCoord[]): VertexId {
  const sorted = hexes
    .map(hexKey)
    .sort();
  return `v_${sorted.join('_')}`;
}

// Helper to make an edge ID from 2 vertex IDs (sorted for consistency)
export function makeEdgeId(v1: VertexId, v2: VertexId): EdgeId {
  const sorted = [v1, v2].sort();
  return `e_${sorted[0]}_${sorted[1]}`;
}
