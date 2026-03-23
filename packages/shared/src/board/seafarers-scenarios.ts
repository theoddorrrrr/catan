import { Terrain } from '../types/resource.js';
import { HexCoord, HarborType } from '../types/board.js';
import { SeafarersScenario } from '../types/game.js';

/**
 * Seafarers scenario definition.
 * Each scenario defines the hex layout, terrain distribution, number tokens, and harbors.
 */
export interface ScenarioDefinition {
  name: string;
  description: string;
  // Fixed hex positions with terrain assignments
  // If terrain is null, it will be randomly assigned from the pool
  hexes: Array<{ q: number; r: number; terrain: Terrain | null; numberToken?: number | null }>;
  // Terrain pool for random assignment (for hexes with terrain: null)
  terrainPool?: Terrain[];
  // Number token pool for random assignment (for hexes without numberToken set)
  numberPool?: number[];
  // Harbor definitions (if empty, harbors are auto-generated)
  fixedHarbors?: Array<{ type: HarborType; edgeVertexHint: { q1: number; r1: number; q2: number; r2: number } }>;
  harborTypes?: HarborType[];
  victoryPointsToWin: number;
}

const T = Terrain;
const H = HarborType;

/**
 * Heading for New Shores (4 players)
 * Main island on the left, 3 small islands on the right, sea between.
 * This is the introductory Seafarers scenario.
 */
const headingForNewShores: ScenarioDefinition = {
  name: 'Heading for New Shores',
  description: 'Sail from the main island to discover and settle new shores. The beginner Seafarers scenario.',
  hexes: [
    // Main island (left side) - standard layout, roughly 12 land hexes
    { q: -3, r: 0, terrain: T.Hills, numberToken: 5 },
    { q: -3, r: 1, terrain: T.Forest, numberToken: 6 },
    { q: -3, r: 2, terrain: T.Pasture, numberToken: 9 },
    { q: -2, r: -1, terrain: T.Mountains, numberToken: 10 },
    { q: -2, r: 0, terrain: T.Fields, numberToken: 3 },
    { q: -2, r: 1, terrain: T.Forest, numberToken: 8 },
    { q: -2, r: 2, terrain: T.Pasture, numberToken: 4 },
    { q: -1, r: -1, terrain: T.Hills, numberToken: 11 },
    { q: -1, r: 0, terrain: T.Desert, numberToken: null },
    { q: -1, r: 1, terrain: T.Mountains, numberToken: 6 },
    { q: -1, r: 2, terrain: T.Fields, numberToken: 9 },
    { q: 0, r: -1, terrain: T.Forest, numberToken: 2 },
    { q: 0, r: 0, terrain: T.Fields, numberToken: 4 },
    { q: 0, r: 1, terrain: T.Hills, numberToken: 10 },

    // Sea channel between main island and new shores
    { q: 1, r: -2, terrain: T.Sea, numberToken: null },
    { q: 1, r: -1, terrain: T.Sea, numberToken: null },
    { q: 1, r: 0, terrain: T.Sea, numberToken: null },
    { q: 1, r: 1, terrain: T.Sea, numberToken: null },

    // Small island 1 (top right)
    { q: 2, r: -3, terrain: T.Sea, numberToken: null },
    { q: 2, r: -2, terrain: T.Fields, numberToken: 8 },
    { q: 2, r: -1, terrain: T.Gold, numberToken: 5 },
    { q: 3, r: -3, terrain: T.Pasture, numberToken: 3 },

    // Small island 2 (middle right)
    { q: 2, r: 0, terrain: T.Forest, numberToken: 11 },
    { q: 3, r: -1, terrain: T.Mountains, numberToken: 12 },

    // Small island 3 (bottom right)
    { q: 2, r: 1, terrain: T.Sea, numberToken: null },
    { q: 2, r: 2, terrain: T.Hills, numberToken: 3 },
    { q: 3, r: 0, terrain: T.Gold, numberToken: 4 },
    { q: 3, r: 1, terrain: T.Pasture, numberToken: 8 },

    // Surrounding sea hexes
    { q: -4, r: 0, terrain: T.Sea, numberToken: null },
    { q: -4, r: 1, terrain: T.Sea, numberToken: null },
    { q: -4, r: 2, terrain: T.Sea, numberToken: null },
    { q: -4, r: 3, terrain: T.Sea, numberToken: null },
    { q: -3, r: -1, terrain: T.Sea, numberToken: null },
    { q: -3, r: 3, terrain: T.Sea, numberToken: null },
    { q: -1, r: -2, terrain: T.Sea, numberToken: null },
    { q: 0, r: -2, terrain: T.Sea, numberToken: null },
    { q: 0, r: 2, terrain: T.Sea, numberToken: null },
    { q: -1, r: 3, terrain: T.Sea, numberToken: null },
    { q: 1, r: 2, terrain: T.Sea, numberToken: null },
    { q: 3, r: -2, terrain: T.Sea, numberToken: null },
    { q: 3, r: 2, terrain: T.Sea, numberToken: null },
    { q: 4, r: -3, terrain: T.Sea, numberToken: null },
    { q: 4, r: -2, terrain: T.Sea, numberToken: null },
    { q: 4, r: -1, terrain: T.Sea, numberToken: null },
    { q: 4, r: 0, terrain: T.Sea, numberToken: null },
    { q: 4, r: 1, terrain: T.Sea, numberToken: null },
  ],
  harborTypes: [
    H.Generic, H.Generic, H.Generic, H.Generic,
    H.Brick, H.Lumber, H.Ore, H.Grain, H.Wool,
  ],
  victoryPointsToWin: 14,
};

/**
 * The Four Islands (4 players)
 * Four separate small islands, players start on one and must sail to others.
 */
const theFourIslands: ScenarioDefinition = {
  name: 'The Four Islands',
  description: 'Four separate islands surrounded by sea. You must build ships to reach them all!',
  hexes: [
    // Island 1 (top-left) - 4 land hexes
    { q: -3, r: 0, terrain: T.Hills, numberToken: 5 },
    { q: -3, r: 1, terrain: T.Forest, numberToken: 9 },
    { q: -2, r: 0, terrain: T.Fields, numberToken: 4 },
    { q: -2, r: 1, terrain: T.Mountains, numberToken: 10 },

    // Island 2 (top-right) - 4 land hexes
    { q: 1, r: -3, terrain: T.Forest, numberToken: 6 },
    { q: 1, r: -2, terrain: T.Pasture, numberToken: 3 },
    { q: 2, r: -3, terrain: T.Hills, numberToken: 8 },
    { q: 2, r: -2, terrain: T.Gold, numberToken: 5 },

    // Island 3 (bottom-left) - 4 land hexes
    { q: -2, r: 2, terrain: T.Pasture, numberToken: 11 },
    { q: -2, r: 3, terrain: T.Mountains, numberToken: 6 },
    { q: -1, r: 2, terrain: T.Gold, numberToken: 4 },
    { q: -1, r: 3, terrain: T.Fields, numberToken: 8 },

    // Island 4 (bottom-right) - 4 land hexes
    { q: 1, r: 1, terrain: T.Hills, numberToken: 9 },
    { q: 1, r: 2, terrain: T.Forest, numberToken: 3 },
    { q: 2, r: 0, terrain: T.Fields, numberToken: 10 },
    { q: 2, r: 1, terrain: T.Pasture, numberToken: 12 },

    // Sea hexes filling the gaps
    { q: -3, r: -1, terrain: T.Sea, numberToken: null },
    { q: -3, r: 2, terrain: T.Sea, numberToken: null },
    { q: -2, r: -1, terrain: T.Sea, numberToken: null },
    { q: -1, r: -2, terrain: T.Sea, numberToken: null },
    { q: -1, r: -1, terrain: T.Sea, numberToken: null },
    { q: -1, r: 0, terrain: T.Sea, numberToken: null },
    { q: -1, r: 1, terrain: T.Sea, numberToken: null },
    { q: 0, r: -2, terrain: T.Sea, numberToken: null },
    { q: 0, r: -1, terrain: T.Sea, numberToken: null },
    { q: 0, r: 0, terrain: T.Sea, numberToken: null },
    { q: 0, r: 1, terrain: T.Sea, numberToken: null },
    { q: 0, r: 2, terrain: T.Sea, numberToken: null },
    { q: 1, r: -1, terrain: T.Sea, numberToken: null },
    { q: 1, r: 0, terrain: T.Sea, numberToken: null },
    { q: 2, r: -1, terrain: T.Sea, numberToken: null },
    { q: 2, r: 2, terrain: T.Sea, numberToken: null },
    { q: -4, r: 1, terrain: T.Sea, numberToken: null },
    { q: -4, r: 2, terrain: T.Sea, numberToken: null },
    { q: -3, r: 3, terrain: T.Sea, numberToken: null },
    { q: -2, r: 4, terrain: T.Sea, numberToken: null },
    { q: 3, r: -3, terrain: T.Sea, numberToken: null },
    { q: 3, r: -2, terrain: T.Sea, numberToken: null },
    { q: 3, r: -1, terrain: T.Sea, numberToken: null },
    { q: 3, r: 0, terrain: T.Sea, numberToken: null },
    { q: 3, r: 1, terrain: T.Sea, numberToken: null },
    { q: -1, r: 4, terrain: T.Sea, numberToken: null },
    { q: 0, r: 3, terrain: T.Sea, numberToken: null },
    { q: 1, r: 3, terrain: T.Sea, numberToken: null },
  ],
  harborTypes: [
    H.Generic, H.Generic, H.Generic, H.Generic,
    H.Brick, H.Lumber, H.Ore, H.Grain, H.Wool,
  ],
  victoryPointsToWin: 13,
};

/**
 * Through the Desert (4 players)
 * A large island with a desert strip through the middle and sea around the edges.
 */
const throughTheDesert: ScenarioDefinition = {
  name: 'Through the Desert',
  description: 'A vast island split by an impassable desert. Ships help you reach the other side.',
  hexes: [
    // Top part of the island
    { q: -2, r: -1, terrain: T.Hills, numberToken: 5 },
    { q: -2, r: 0, terrain: T.Forest, numberToken: 9 },
    { q: -1, r: -2, terrain: T.Pasture, numberToken: 3 },
    { q: -1, r: -1, terrain: T.Fields, numberToken: 11 },
    { q: -1, r: 0, terrain: T.Mountains, numberToken: 6 },
    { q: 0, r: -2, terrain: T.Hills, numberToken: 8 },
    { q: 0, r: -1, terrain: T.Forest, numberToken: 4 },
    { q: 1, r: -2, terrain: T.Pasture, numberToken: 10 },

    // Desert strip
    { q: -2, r: 1, terrain: T.Desert, numberToken: null },
    { q: -1, r: 1, terrain: T.Desert, numberToken: null },
    { q: 0, r: 0, terrain: T.Desert, numberToken: null },
    { q: 1, r: -1, terrain: T.Desert, numberToken: null },

    // Bottom part of the island
    { q: -2, r: 2, terrain: T.Mountains, numberToken: 6 },
    { q: -1, r: 2, terrain: T.Fields, numberToken: 4 },
    { q: -1, r: 3, terrain: T.Gold, numberToken: 5 },
    { q: 0, r: 1, terrain: T.Hills, numberToken: 9 },
    { q: 0, r: 2, terrain: T.Forest, numberToken: 12 },
    { q: 1, r: 0, terrain: T.Pasture, numberToken: 8 },
    { q: 1, r: 1, terrain: T.Fields, numberToken: 3 },
    { q: 2, r: -1, terrain: T.Mountains, numberToken: 10 },

    // Surrounding sea
    { q: -3, r: 0, terrain: T.Sea, numberToken: null },
    { q: -3, r: 1, terrain: T.Sea, numberToken: null },
    { q: -3, r: 2, terrain: T.Sea, numberToken: null },
    { q: -3, r: 3, terrain: T.Sea, numberToken: null },
    { q: -2, r: -2, terrain: T.Sea, numberToken: null },
    { q: -2, r: 3, terrain: T.Sea, numberToken: null },
    { q: -1, r: -3, terrain: T.Sea, numberToken: null },
    { q: -1, r: 4, terrain: T.Sea, numberToken: null },
    { q: 0, r: -3, terrain: T.Sea, numberToken: null },
    { q: 0, r: 3, terrain: T.Sea, numberToken: null },
    { q: 1, r: -3, terrain: T.Sea, numberToken: null },
    { q: 1, r: 2, terrain: T.Sea, numberToken: null },
    { q: 2, r: -2, terrain: T.Sea, numberToken: null },
    { q: 2, r: 0, terrain: T.Sea, numberToken: null },
    { q: 3, r: -2, terrain: T.Sea, numberToken: null },
    { q: 3, r: -1, terrain: T.Sea, numberToken: null },
  ],
  harborTypes: [
    H.Generic, H.Generic, H.Generic,
    H.Brick, H.Lumber, H.Ore, H.Grain, H.Wool,
  ],
  victoryPointsToWin: 12,
};

/**
 * The New World (4 players)
 * A randomly generated Seafarers board. Multiple small islands scattered in the sea.
 * This uses random terrain/number placement.
 */
const theNewWorld: ScenarioDefinition = {
  name: 'The New World',
  description: 'A randomly generated world of islands. Every game is different!',
  hexes: [
    // Generate a large hex grid, with terrain assigned randomly
    // Center region has potential for land, outer ring is mostly sea
    ...[
      { q: -2, r: -1 }, { q: -2, r: 0 }, { q: -2, r: 1 }, { q: -2, r: 2 },
      { q: -1, r: -2 }, { q: -1, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: -1, r: 2 },
      { q: 0, r: -2 }, { q: 0, r: -1 }, { q: 0, r: 0 }, { q: 0, r: 1 }, { q: 0, r: 2 },
      { q: 1, r: -2 }, { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 1, r: 1 }, { q: 1, r: 2 },
      { q: 2, r: -2 }, { q: 2, r: -1 }, { q: 2, r: 0 }, { q: 2, r: 1 },
    ].map(c => ({ ...c, terrain: null as Terrain | null, numberToken: undefined as number | undefined })),
    // Outer sea ring
    ...[
      { q: -3, r: 0 }, { q: -3, r: 1 }, { q: -3, r: 2 }, { q: -3, r: 3 },
      { q: -2, r: -2 }, { q: -2, r: 3 },
      { q: -1, r: -3 }, { q: -1, r: 3 },
      { q: 0, r: -3 }, { q: 0, r: 3 },
      { q: 1, r: -3 }, { q: 1, r: 3 },
      { q: 2, r: -3 }, { q: 2, r: 2 },
      { q: 3, r: -3 }, { q: 3, r: -2 }, { q: 3, r: -1 }, { q: 3, r: 0 },
    ].map(c => ({ ...c, terrain: T.Sea, numberToken: null as number | null })),
  ],
  terrainPool: [
    // 15 land hexes distributed among the 23 inner positions (8 become sea)
    T.Hills, T.Hills, T.Hills,
    T.Forest, T.Forest, T.Forest, T.Forest,
    T.Mountains, T.Mountains,
    T.Fields, T.Fields, T.Fields,
    T.Pasture, T.Pasture, T.Pasture,
    T.Gold,
    T.Desert,
    // Rest become sea (6 more to fill 23 inner positions)
    T.Sea, T.Sea, T.Sea, T.Sea, T.Sea, T.Sea,
  ],
  numberPool: [
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
  ],
  harborTypes: [
    H.Generic, H.Generic, H.Generic, H.Generic,
    H.Brick, H.Lumber, H.Ore, H.Grain, H.Wool,
  ],
  victoryPointsToWin: 12,
};

export const SEAFARERS_SCENARIOS: Record<SeafarersScenario, ScenarioDefinition> = {
  headingForNewShores,
  theFourIslands,
  throughTheDesert,
  theNewWorld,
};

export function getScenarioNames(): Array<{ id: SeafarersScenario; name: string; description: string }> {
  return Object.entries(SEAFARERS_SCENARIOS).map(([id, def]) => ({
    id: id as SeafarersScenario,
    name: def.name,
    description: def.description,
  }));
}
