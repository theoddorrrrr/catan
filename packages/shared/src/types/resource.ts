export enum ResourceType {
  Brick = 'brick',
  Lumber = 'lumber',
  Ore = 'ore',
  Grain = 'grain',
  Wool = 'wool',
}

export const ALL_RESOURCES: ResourceType[] = [
  ResourceType.Brick,
  ResourceType.Lumber,
  ResourceType.Ore,
  ResourceType.Grain,
  ResourceType.Wool,
];

export type ResourceBundle = Record<ResourceType, number>;

export function emptyResources(): ResourceBundle {
  return {
    [ResourceType.Brick]: 0,
    [ResourceType.Lumber]: 0,
    [ResourceType.Ore]: 0,
    [ResourceType.Grain]: 0,
    [ResourceType.Wool]: 0,
  };
}

export function addResources(a: ResourceBundle, b: ResourceBundle): ResourceBundle {
  return {
    [ResourceType.Brick]: a[ResourceType.Brick] + b[ResourceType.Brick],
    [ResourceType.Lumber]: a[ResourceType.Lumber] + b[ResourceType.Lumber],
    [ResourceType.Ore]: a[ResourceType.Ore] + b[ResourceType.Ore],
    [ResourceType.Grain]: a[ResourceType.Grain] + b[ResourceType.Grain],
    [ResourceType.Wool]: a[ResourceType.Wool] + b[ResourceType.Wool],
  };
}

export function subtractResources(a: ResourceBundle, b: ResourceBundle): ResourceBundle {
  return {
    [ResourceType.Brick]: a[ResourceType.Brick] - b[ResourceType.Brick],
    [ResourceType.Lumber]: a[ResourceType.Lumber] - b[ResourceType.Lumber],
    [ResourceType.Ore]: a[ResourceType.Ore] - b[ResourceType.Ore],
    [ResourceType.Grain]: a[ResourceType.Grain] - b[ResourceType.Grain],
    [ResourceType.Wool]: a[ResourceType.Wool] - b[ResourceType.Wool],
  };
}

export function hasResources(have: ResourceBundle, need: ResourceBundle): boolean {
  return ALL_RESOURCES.every((r) => have[r] >= need[r]);
}

export function totalResources(bundle: ResourceBundle): number {
  return ALL_RESOURCES.reduce((sum, r) => sum + bundle[r], 0);
}

export enum DevCardType {
  Knight = 'knight',
  VictoryPoint = 'victoryPoint',
  RoadBuilding = 'roadBuilding',
  YearOfPlenty = 'yearOfPlenty',
  Monopoly = 'monopoly',
}

export interface DevelopmentCard {
  type: DevCardType;
  turnAcquired: number;
}

// Standard dev card deck distribution
export const DEV_CARD_COUNTS: Record<DevCardType, number> = {
  [DevCardType.Knight]: 14,
  [DevCardType.VictoryPoint]: 5,
  [DevCardType.RoadBuilding]: 2,
  [DevCardType.YearOfPlenty]: 2,
  [DevCardType.Monopoly]: 2,
};

// Building costs
export const BUILDING_COSTS = {
  road: { [ResourceType.Brick]: 1, [ResourceType.Lumber]: 1, [ResourceType.Ore]: 0, [ResourceType.Grain]: 0, [ResourceType.Wool]: 0 } as ResourceBundle,
  settlement: { [ResourceType.Brick]: 1, [ResourceType.Lumber]: 1, [ResourceType.Ore]: 0, [ResourceType.Grain]: 1, [ResourceType.Wool]: 1 } as ResourceBundle,
  city: { [ResourceType.Brick]: 0, [ResourceType.Lumber]: 0, [ResourceType.Ore]: 3, [ResourceType.Grain]: 2, [ResourceType.Wool]: 0 } as ResourceBundle,
  devCard: { [ResourceType.Brick]: 0, [ResourceType.Lumber]: 0, [ResourceType.Ore]: 1, [ResourceType.Grain]: 1, [ResourceType.Wool]: 1 } as ResourceBundle,
  ship: { [ResourceType.Brick]: 0, [ResourceType.Lumber]: 1, [ResourceType.Ore]: 0, [ResourceType.Grain]: 0, [ResourceType.Wool]: 1 } as ResourceBundle,
} as const;

// Terrain to resource mapping
export enum Terrain {
  Hills = 'hills',
  Forest = 'forest',
  Mountains = 'mountains',
  Fields = 'fields',
  Pasture = 'pasture',
  Desert = 'desert',
  Sea = 'sea',
  Gold = 'gold',
}

export const TERRAIN_TO_RESOURCE: Record<Terrain, ResourceType | null> = {
  [Terrain.Hills]: ResourceType.Brick,
  [Terrain.Forest]: ResourceType.Lumber,
  [Terrain.Mountains]: ResourceType.Ore,
  [Terrain.Fields]: ResourceType.Grain,
  [Terrain.Pasture]: ResourceType.Wool,
  [Terrain.Desert]: null,
  [Terrain.Sea]: null,
  [Terrain.Gold]: null, // Gold lets player choose — handled specially in engine
};
