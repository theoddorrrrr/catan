import { HexCoord, VertexId, EdgeId, hexKey } from '../types/board.js';

// Cube coordinate hex grid utilities
// Convention: q + r + s = 0 always

// The 6 directions in cube coordinates
export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: -1, s: 0 },
  { q: 1, r: 0, s: -1 },
  { q: 0, r: 1, s: -1 },
  { q: -1, r: 1, s: 0 },
  { q: -1, r: 0, s: 1 },
  { q: 0, r: -1, s: 1 },
];

export function hexAdd(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r, s: a.s + b.s };
}

export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s;
}

export function hexNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => hexAdd(coord, d));
}

// Generate all hex coords for a standard Catan board (radius 2, 19 hexes)
export function generateHexCoords(radius: number = 2): HexCoord[] {
  const coords: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) <= radius) {
        coords.push({ q, r, s });
      }
    }
  }
  return coords;
}

// A vertex is the meeting point of exactly 3 hexes.
// We identify it by the sorted keys of the 3 hex coords.
// For a hex grid, each vertex is shared by exactly 3 hexes (for internal vertices)
// or fewer for edge/corner vertices (which we extend with "virtual" hexes outside the board).

// Get the 6 vertices around a hex, each identified by the 3 hexes that share it.
// For a hex at coord, its 6 vertices are shared with specific neighbor pairs.
export function getHexVertices(coord: HexCoord): VertexId[] {
  const n = hexNeighbors(coord);
  // Each vertex is at the junction of the hex and two consecutive neighbors
  const vertices: VertexId[] = [];
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const triHexes = [coord, n[i], n[next]];
    const sorted = triHexes.map(hexKey).sort();
    vertices.push(`v_${sorted.join('_')}`);
  }
  return vertices;
}

// Get the 6 edges of a hex, each identified by the 2 vertices it connects
export function getHexEdges(coord: HexCoord): EdgeId[] {
  const verts = getHexVertices(coord);
  const edges: EdgeId[] = [];
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const sorted = [verts[i], verts[next]].sort();
    edges.push(`e_${sorted[0]}_${sorted[1]}`);
  }
  return edges;
}

// Build complete adjacency maps for a set of hex coordinates
export interface BoardGraph {
  // All unique vertex IDs on the board
  vertices: Set<VertexId>;
  // All unique edge IDs on the board
  edges: Set<EdgeId>;
  // Which hexes touch a given vertex
  vertexToHexes: Map<VertexId, HexCoord[]>;
  // Which two vertices an edge connects
  edgeToVertices: Map<EdgeId, [VertexId, VertexId]>;
  // Which edges connect to a vertex
  vertexToEdges: Map<VertexId, EdgeId[]>;
  // Which vertices are adjacent (connected by one edge)
  vertexToVertices: Map<VertexId, VertexId[]>;
  // Which vertices belong to a hex
  hexToVertices: Map<string, VertexId[]>;
  // Which edges belong to a hex
  hexToEdges: Map<string, EdgeId[]>;
}

export function buildBoardGraph(hexCoords: HexCoord[]): BoardGraph {
  const hexSet = new Set(hexCoords.map(hexKey));
  const vertices = new Set<VertexId>();
  const edges = new Set<EdgeId>();
  const vertexToHexes = new Map<VertexId, HexCoord[]>();
  const edgeToVertices = new Map<EdgeId, [VertexId, VertexId]>();
  const vertexToEdgesMap = new Map<VertexId, Set<EdgeId>>();
  const vertexToVerticesMap = new Map<VertexId, Set<VertexId>>();
  const hexToVertices = new Map<string, VertexId[]>();
  const hexToEdges = new Map<string, EdgeId[]>();

  for (const coord of hexCoords) {
    const hk = hexKey(coord);
    const hexVerts = getHexVertices(coord);
    const hexEdgeIds = getHexEdges(coord);

    hexToVertices.set(hk, hexVerts);
    hexToEdges.set(hk, hexEdgeIds);

    // Register vertices
    for (const v of hexVerts) {
      vertices.add(v);
      if (!vertexToHexes.has(v)) {
        vertexToHexes.set(v, []);
      }
      // Only add this hex if it's actually on the board
      const existing = vertexToHexes.get(v)!;
      if (!existing.some((h) => hexEqual(h, coord))) {
        existing.push(coord);
      }
    }

    // Register edges
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      const v1 = hexVerts[i];
      const v2 = hexVerts[next];
      const sorted = [v1, v2].sort() as [VertexId, VertexId];
      const edgeId = `e_${sorted[0]}_${sorted[1]}`;
      edges.add(edgeId);
      edgeToVertices.set(edgeId, sorted);

      // Vertex to edges
      if (!vertexToEdgesMap.has(v1)) vertexToEdgesMap.set(v1, new Set());
      if (!vertexToEdgesMap.has(v2)) vertexToEdgesMap.set(v2, new Set());
      vertexToEdgesMap.get(v1)!.add(edgeId);
      vertexToEdgesMap.get(v2)!.add(edgeId);

      // Vertex adjacency
      if (!vertexToVerticesMap.has(v1)) vertexToVerticesMap.set(v1, new Set());
      if (!vertexToVerticesMap.has(v2)) vertexToVerticesMap.set(v2, new Set());
      vertexToVerticesMap.get(v1)!.add(v2);
      vertexToVerticesMap.get(v2)!.add(v1);
    }
  }

  // Convert sets to arrays for the final output
  const vertexToEdges = new Map<VertexId, EdgeId[]>();
  for (const [v, edgeSet] of vertexToEdgesMap) {
    vertexToEdges.set(v, [...edgeSet]);
  }

  const vertexToVertices = new Map<VertexId, VertexId[]>();
  for (const [v, vSet] of vertexToVerticesMap) {
    vertexToVertices.set(v, [...vSet]);
  }

  return {
    vertices,
    edges,
    vertexToHexes,
    edgeToVertices,
    vertexToEdges,
    vertexToVertices,
    hexToVertices,
    hexToEdges,
  };
}

// Pixel layout for rendering (pointy-top hexes)
export interface PixelCoord {
  x: number;
  y: number;
}

export function hexToPixel(coord: HexCoord, size: number): PixelCoord {
  // Pointy-top hex layout
  const x = size * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r);
  const y = size * ((3 / 2) * coord.r);
  return { x, y };
}

export function getVertexPixelPosition(
  vertexId: VertexId,
  vertexToHexes: Map<VertexId, HexCoord[]>,
  size: number
): PixelCoord {
  const hexes = vertexToHexes.get(vertexId);
  if (!hexes || hexes.length === 0) {
    return { x: 0, y: 0 };
  }
  // Vertex position is the average of its adjacent hex centers
  // But we need to compute it from the actual hex geometry
  // For a vertex shared by hexes, it's the centroid of those hex centers
  // projected to the correct corner position.

  // Actually, for accurate positions we parse the vertex ID to get all 3 hex coords
  // and compute the centroid of those 3 hexes (including virtual ones off-board)
  const parts = vertexId.slice(2).split('_'); // Remove 'v_' prefix
  const coords: PixelCoord[] = parts.map((p) => {
    const [q, r] = p.split(',').map(Number);
    return hexToPixel({ q, r, s: -q - r }, size);
  });

  const cx = coords.reduce((s, c) => s + c.x, 0) / coords.length;
  const cy = coords.reduce((s, c) => s + c.y, 0) / coords.length;
  return { x: cx, y: cy };
}

export function getEdgePixelPositions(
  edgeId: EdgeId,
  vertexToHexes: Map<VertexId, HexCoord[]>,
  size: number
): [PixelCoord, PixelCoord] {
  // Edge ID format: "e_v_..._v_..."
  // Extract the two vertex IDs
  const withoutPrefix = edgeId.slice(2); // Remove 'e_'
  // Find where the second vertex starts (it starts with 'v_')
  const secondVIdx = withoutPrefix.indexOf('_v_', 1) + 1;
  const v1 = withoutPrefix.slice(0, secondVIdx);
  const v2 = withoutPrefix.slice(secondVIdx + 1);

  return [
    getVertexPixelPosition(v1, vertexToHexes, size),
    getVertexPixelPosition(v2, vertexToHexes, size),
  ];
}
