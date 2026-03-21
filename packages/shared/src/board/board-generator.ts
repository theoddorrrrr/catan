import { HexTile, HexCoord, BoardState, HarborType, Harbor, hexKey } from '../types/board.js';
import { Terrain } from '../types/resource.js';
import { SeededRandom } from '../utils/random.js';
import { generateHexCoords, buildBoardGraph, getHexVertices, hexNeighbors } from './hex-grid.js';

// Standard Catan terrain distribution (19 hexes)
const STANDARD_TERRAINS: Terrain[] = [
  Terrain.Hills, Terrain.Hills, Terrain.Hills,
  Terrain.Forest, Terrain.Forest, Terrain.Forest, Terrain.Forest,
  Terrain.Mountains, Terrain.Mountains, Terrain.Mountains,
  Terrain.Fields, Terrain.Fields, Terrain.Fields, Terrain.Fields,
  Terrain.Pasture, Terrain.Pasture, Terrain.Pasture, Terrain.Pasture,
  Terrain.Desert,
];

// Standard number token distribution (no 2 or 12 on same hex, no 6/8 adjacent)
// Standard layout places tokens in spiral order, but we'll shuffle and validate
const STANDARD_NUMBERS: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

// Standard harbor distribution
const STANDARD_HARBORS: HarborType[] = [
  HarborType.Generic, HarborType.Generic, HarborType.Generic, HarborType.Generic,
  HarborType.Brick, HarborType.Lumber, HarborType.Ore, HarborType.Grain, HarborType.Wool,
];

// Number of probability dots for each number token
export function numberPips(num: number): number {
  if (num <= 1 || num > 12) return 0;
  return num <= 7 ? num - 1 : 13 - num;
}

export function generateBoard(seed: number): { board: BoardState; graph: ReturnType<typeof buildBoardGraph> } {
  const rng = new SeededRandom(seed);
  const hexCoords = generateHexCoords(2);
  const graph = buildBoardGraph(hexCoords);

  // Shuffle terrains
  const terrains = rng.shuffle(STANDARD_TERRAINS);

  // Place number tokens (skip desert)
  const numbers = rng.shuffle(STANDARD_NUMBERS);
  let numberIdx = 0;

  const hexes: HexTile[] = hexCoords.map((coord, i) => {
    const terrain = terrains[i];
    const isDesert = terrain === Terrain.Desert;
    return {
      coord,
      terrain,
      numberToken: isDesert ? null : numbers[numberIdx++],
      hasRobber: isDesert, // Robber starts on desert
    };
  });

  // Generate harbors on coastal edges
  const harbors = generateHarbors(hexCoords, graph, rng);

  return {
    board: { hexes, harbors },
    graph,
  };
}

function generateHarbors(
  hexCoords: HexCoord[],
  graph: ReturnType<typeof buildBoardGraph>,
  rng: SeededRandom
): Harbor[] {
  const hexSet = new Set(hexCoords.map(hexKey));

  // Find coastal vertices (vertices that have fewer than 3 board hexes adjacent)
  const coastalVertices = new Set<string>();
  for (const [vertexId, adjHexes] of graph.vertexToHexes) {
    if (adjHexes.length < 3) {
      coastalVertices.add(vertexId);
    }
  }

  // Find coastal edges (edges where both vertices are coastal)
  const coastalEdges: [string, string][] = [];
  for (const [edgeId, [v1, v2]] of graph.edgeToVertices) {
    if (coastalVertices.has(v1) && coastalVertices.has(v2)) {
      // Also verify at least one vertex has a board hex adjacent (not fully off-board edge)
      const v1Hexes = graph.vertexToHexes.get(v1) || [];
      const v2Hexes = graph.vertexToHexes.get(v2) || [];
      if (v1Hexes.length > 0 && v2Hexes.length > 0) {
        coastalEdges.push([v1, v2]);
      }
    }
  }

  // Shuffle coastal edges and pick 9 that are spread out
  const shuffledEdges = rng.shuffle(coastalEdges);
  const shuffledHarborTypes = rng.shuffle(STANDARD_HARBORS);

  // Pick edges that don't share vertices (to spread harbors out)
  const usedVertices = new Set<string>();
  const selectedEdges: [string, string][] = [];

  for (const [v1, v2] of shuffledEdges) {
    if (selectedEdges.length >= 9) break;
    if (!usedVertices.has(v1) && !usedVertices.has(v2)) {
      selectedEdges.push([v1, v2]);
      usedVertices.add(v1);
      usedVertices.add(v2);
    }
  }

  return selectedEdges.map(([v1, v2], i) => ({
    type: shuffledHarborTypes[i] || HarborType.Generic,
    vertices: [v1, v2] as [string, string],
  }));
}

// Find the desert hex (where robber starts)
export function findDesertHex(hexes: HexTile[]): HexCoord {
  const desert = hexes.find((h) => h.terrain === Terrain.Desert);
  if (!desert) throw new Error('No desert hex found');
  return desert.coord;
}
