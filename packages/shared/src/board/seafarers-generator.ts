import { HexTile, HexCoord, BoardState, HarborType, Harbor, hexKey } from '../types/board.js';
import { Terrain } from '../types/resource.js';
import { SeafarersScenario } from '../types/game.js';
import { SeededRandom } from '../utils/random.js';
import { buildBoardGraph, getHexVertices } from './hex-grid.js';
import { SEAFARERS_SCENARIOS, ScenarioDefinition } from './seafarers-scenarios.js';

export function generateSeafarersBoard(
  scenario: SeafarersScenario,
  seed: number
): { board: BoardState; graph: ReturnType<typeof buildBoardGraph> } {
  const rng = new SeededRandom(seed);
  const def = SEAFARERS_SCENARIOS[scenario];

  const hexCoords: HexCoord[] = def.hexes.map(h => ({
    q: h.q, r: h.r, s: -h.q - h.r,
  }));

  const graph = buildBoardGraph(hexCoords);

  // Assign terrain to hexes
  let terrainPool = def.terrainPool ? rng.shuffle([...def.terrainPool]) : [];
  let numberPool = def.numberPool ? rng.shuffle([...def.numberPool]) : [];

  const hexes: HexTile[] = def.hexes.map(h => {
    let terrain: Terrain;
    if (h.terrain !== null) {
      terrain = h.terrain;
    } else {
      // Pull from pool
      terrain = terrainPool.pop() ?? Terrain.Sea;
    }

    let numberToken: number | null = null;
    if (h.numberToken !== undefined) {
      numberToken = h.numberToken;
    } else if (terrain !== Terrain.Sea && terrain !== Terrain.Desert) {
      // Assign from number pool
      numberToken = numberPool.pop() ?? null;
    }

    const isDesert = terrain === Terrain.Desert;
    const isSea = terrain === Terrain.Sea;

    return {
      coord: { q: h.q, r: h.r, s: -h.q - h.r },
      terrain,
      numberToken,
      hasRobber: isDesert, // Robber starts on first desert
      hasPirate: false,
    };
  });

  // Ensure only one desert has the robber
  let foundRobber = false;
  for (const hex of hexes) {
    if (hex.terrain === Terrain.Desert) {
      if (!foundRobber) {
        hex.hasRobber = true;
        foundRobber = true;
      } else {
        hex.hasRobber = false;
      }
    }
  }

  // Place pirate on a sea hex (if there are sea hexes)
  const seaHexes = hexes.filter(h => h.terrain === Terrain.Sea);
  if (seaHexes.length > 0) {
    // Pick a central-ish sea hex for the pirate
    const centerSea = seaHexes.reduce((best, h) => {
      const dist = Math.abs(h.coord.q) + Math.abs(h.coord.r) + Math.abs(h.coord.s);
      const bestDist = Math.abs(best.coord.q) + Math.abs(best.coord.r) + Math.abs(best.coord.s);
      return dist < bestDist ? h : best;
    });
    centerSea.hasPirate = true;
  }

  // Generate harbors
  const harbors = generateSeafarersHarbors(hexCoords, hexes, graph, def, rng);

  return {
    board: { hexes, harbors },
    graph,
  };
}

function generateSeafarersHarbors(
  hexCoords: HexCoord[],
  hexes: HexTile[],
  graph: ReturnType<typeof buildBoardGraph>,
  def: ScenarioDefinition,
  rng: SeededRandom
): Harbor[] {
  const harborTypes = def.harborTypes
    ? rng.shuffle([...def.harborTypes])
    : [HarborType.Generic, HarborType.Generic, HarborType.Generic, HarborType.Generic,
       HarborType.Brick, HarborType.Lumber, HarborType.Ore, HarborType.Grain, HarborType.Wool];

  const hexTerrainMap = new Map<string, Terrain>();
  for (const hex of hexes) {
    hexTerrainMap.set(hexKey(hex.coord), hex.terrain);
  }

  // Find coastal edges: edges where one side is land and the other is sea (or off-board)
  // A "coastal vertex" touches at least one land hex and at least one sea hex (or is on board edge)
  const coastalEdges: [string, string][] = [];

  for (const [edgeId, [v1, v2]] of graph.edgeToVertices) {
    // Check if this edge is on the coast (between land and sea)
    const v1Hexes = graph.vertexToHexes.get(v1) || [];
    const v2Hexes = graph.vertexToHexes.get(v2) || [];

    // Both vertices must touch at least one land hex
    const v1HasLand = v1Hexes.some(h => {
      const t = hexTerrainMap.get(hexKey(h));
      return t && t !== Terrain.Sea;
    });
    const v2HasLand = v2Hexes.some(h => {
      const t = hexTerrainMap.get(hexKey(h));
      return t && t !== Terrain.Sea;
    });

    if (!v1HasLand || !v2HasLand) continue;

    // At least one vertex must also touch a sea hex or be on board edge (< 3 hexes)
    const v1HasSea = v1Hexes.some(h => hexTerrainMap.get(hexKey(h)) === Terrain.Sea) || v1Hexes.length < 3;
    const v2HasSea = v2Hexes.some(h => hexTerrainMap.get(hexKey(h)) === Terrain.Sea) || v2Hexes.length < 3;

    if (v1HasSea || v2HasSea) {
      coastalEdges.push([v1, v2]);
    }
  }

  // Shuffle and pick non-adjacent harbors
  const shuffled = rng.shuffle(coastalEdges);
  const usedVertices = new Set<string>();
  const selected: [string, string][] = [];

  for (const [v1, v2] of shuffled) {
    if (selected.length >= harborTypes.length) break;
    if (!usedVertices.has(v1) && !usedVertices.has(v2)) {
      selected.push([v1, v2]);
      usedVertices.add(v1);
      usedVertices.add(v2);
    }
  }

  return selected.map(([v1, v2], i) => ({
    type: harborTypes[i] || HarborType.Generic,
    vertices: [v1, v2] as [string, string],
  }));
}

/**
 * Find the initial robber position for Seafarers boards.
 * Returns the desert hex coord, or the first non-sea hex if no desert.
 */
export function findSeafarersRobberHex(hexes: HexTile[]): HexCoord {
  const desert = hexes.find(h => h.terrain === Terrain.Desert);
  if (desert) return desert.coord;
  // Fallback: first land hex
  const land = hexes.find(h => h.terrain !== Terrain.Sea);
  if (land) return land.coord;
  return hexes[0].coord;
}

/**
 * Find the initial pirate position for Seafarers boards.
 * Returns a sea hex coord.
 */
export function findSeafarersPirateHex(hexes: HexTile[]): HexCoord | null {
  const pirate = hexes.find(h => h.hasPirate);
  if (pirate) return pirate.coord;
  const sea = hexes.find(h => h.terrain === Terrain.Sea);
  return sea ? sea.coord : null;
}
