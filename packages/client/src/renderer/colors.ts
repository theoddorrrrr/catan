import { Terrain, PlayerColor, HarborType, ResourceType } from '@catan/shared';

export const TERRAIN_COLORS: Record<Terrain, string> = {
  [Terrain.Hills]: '#b8533a',
  [Terrain.Forest]: '#2a7a3a',
  [Terrain.Mountains]: '#6e7580',
  [Terrain.Fields]: '#d4a830',
  [Terrain.Pasture]: '#5db84a',
  [Terrain.Desert]: '#d6c894',
  [Terrain.Sea]: '#1a5fa0',
  [Terrain.Gold]: '#c9a820',
};

export const TERRAIN_COLORS_LIGHT: Record<Terrain, string> = {
  [Terrain.Hills]: '#d47a5a',
  [Terrain.Forest]: '#3da450',
  [Terrain.Mountains]: '#8e95a0',
  [Terrain.Fields]: '#ecc44a',
  [Terrain.Pasture]: '#7ed464',
  [Terrain.Desert]: '#ece0b4',
  [Terrain.Sea]: '#2a7fc0',
  [Terrain.Gold]: '#e8c830',
};

export const TERRAIN_LABELS: Record<Terrain, string> = {
  [Terrain.Hills]: 'Brick',
  [Terrain.Forest]: 'Wood',
  [Terrain.Mountains]: 'Ore',
  [Terrain.Fields]: 'Grain',
  [Terrain.Pasture]: 'Wool',
  [Terrain.Desert]: 'Desert',
  [Terrain.Sea]: 'Sea',
  [Terrain.Gold]: 'Gold',
};

// SVG path data for small terrain icons (centered at 0,0, designed for ~12px)
export const TERRAIN_ICONS: Record<Terrain, string> = {
  [Terrain.Hills]: 'M-5,3 L-2,-3 L1,1 L4,-2 L7,3 Z',  // zigzag hills
  [Terrain.Forest]: 'M0,-5 L-4,2 L-2,1 L-3,5 L3,5 L2,1 L4,2 Z',  // tree
  [Terrain.Mountains]: 'M-6,4 L-1,-4 L2,0 L5,-3 L8,4 Z',  // mountain peaks
  [Terrain.Fields]: 'M0,-4 C2,-4 3,-2 3,0 C3,2 2,4 0,4 C-2,4 -3,2 -3,0 C-3,-2 -2,-4 0,-4 M-1,-2 L-1,2 M1,-3 L1,1',  // wheat
  [Terrain.Pasture]: 'M-3,0 C-3,-3 3,-3 3,0 C3,2 -3,2 -3,0',  // cloud/wool
  [Terrain.Desert]: 'M-5,2 Q-2,-2 0,2 Q2,-1 5,2',  // sand dune
  [Terrain.Sea]: 'M-5,0 Q-3,-2 -1,0 Q1,2 3,0 Q5,-2 7,0',  // wave
  [Terrain.Gold]: 'M0,-4 L1.5,-1.5 L4.5,-1.5 L2,0.5 L3,3.5 L0,1.5 L-3,3.5 L-2,0.5 L-4.5,-1.5 L-1.5,-1.5 Z',  // star
};

export const HARBOR_RESOURCE: Record<HarborType, ResourceType | null> = {
  [HarborType.Generic]: null,
  [HarborType.Brick]: ResourceType.Brick,
  [HarborType.Lumber]: ResourceType.Lumber,
  [HarborType.Ore]: ResourceType.Ore,
  [HarborType.Grain]: ResourceType.Grain,
  [HarborType.Wool]: ResourceType.Wool,
};

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Brick]: '#c45a2c',
  [ResourceType.Lumber]: '#2d6a2d',
  [ResourceType.Ore]: '#8a8a8a',
  [ResourceType.Grain]: '#e8c44a',
  [ResourceType.Wool]: '#7ec850',
};

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  [PlayerColor.Red]: '#e74c3c',
  [PlayerColor.Blue]: '#3498db',
  [PlayerColor.White]: '#ecf0f1',
  [PlayerColor.Orange]: '#f39c12',
};

export const PLAYER_COLORS_DARK: Record<PlayerColor, string> = {
  [PlayerColor.Red]: '#c0392b',
  [PlayerColor.Blue]: '#2980b9',
  [PlayerColor.White]: '#bdc3c7',
  [PlayerColor.Orange]: '#d68910',
};

export const NUMBER_COLORS: Record<number, string> = {
  2: '#333', 3: '#333', 4: '#333', 5: '#333',
  6: '#c0392b', 8: '#c0392b',
  9: '#333', 10: '#333', 11: '#333', 12: '#333',
};
