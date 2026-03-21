import { Terrain, PlayerColor } from '@catan/shared';

export const TERRAIN_COLORS: Record<Terrain, string> = {
  [Terrain.Hills]: '#c45a2c',
  [Terrain.Forest]: '#2d6a2d',
  [Terrain.Mountains]: '#8a8a8a',
  [Terrain.Fields]: '#e8c44a',
  [Terrain.Pasture]: '#7ec850',
  [Terrain.Desert]: '#e8d8a0',
};

export const TERRAIN_LABELS: Record<Terrain, string> = {
  [Terrain.Hills]: 'Brick',
  [Terrain.Forest]: 'Wood',
  [Terrain.Mountains]: 'Ore',
  [Terrain.Fields]: 'Grain',
  [Terrain.Pasture]: 'Wool',
  [Terrain.Desert]: 'Desert',
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
