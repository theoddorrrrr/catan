import { ResourceBundle, emptyResources, DevelopmentCard } from './resource.js';
import { VertexId, EdgeId } from './board.js';

export enum PlayerColor {
  Red = 'red',
  Blue = 'blue',
  White = 'white',
  Orange = 'orange',
}

export const ALL_PLAYER_COLORS: PlayerColor[] = [
  PlayerColor.Red,
  PlayerColor.Blue,
  PlayerColor.White,
  PlayerColor.Orange,
];

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  isBot: boolean;
  isConnected: boolean;

  resources: ResourceBundle;
  devCards: DevelopmentCard[];
  knightsPlayed: number;
  devCardPlayedThisTurn: boolean;

  settlements: VertexId[];
  cities: VertexId[];
  roads: EdgeId[];
  ships: EdgeId[]; // Seafarers: ships on sea edges

  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  victoryPoints: number;
  hiddenVP: number;

  remainingSettlements: number;
  remainingCities: number;
  remainingRoads: number;
  remainingShips: number; // Seafarers: 15 ships per player
}

export function createPlayer(
  id: string,
  name: string,
  color: PlayerColor,
  isBot: boolean
): Player {
  return {
    id,
    name,
    color,
    isBot,
    isConnected: true,
    resources: emptyResources(),
    devCards: [],
    knightsPlayed: 0,
    devCardPlayedThisTurn: false,
    settlements: [],
    cities: [],
    roads: [],
    ships: [],
    hasLongestRoad: false,
    hasLargestArmy: false,
    victoryPoints: 0,
    hiddenVP: 0,
    remainingSettlements: 5,
    remainingCities: 4,
    remainingRoads: 15,
    remainingShips: 15,
  };
}
