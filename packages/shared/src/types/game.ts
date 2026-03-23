import { BoardState, HexCoord } from './board.js';
import { Player } from './player.js';
import { ResourceBundle, DevCardType } from './resource.js';
import { GameEvent, TimestampedEvent } from './event.js';

export enum GamePhase {
  Lobby = 'lobby',
  SetupRound1 = 'setupRound1',
  SetupRound2 = 'setupRound2',
  Playing = 'playing',
  Finished = 'finished',
}

export enum TurnPhase {
  PreRoll = 'preRoll',
  Rolling = 'rolling',
  RobberDiscard = 'robberDiscard',
  RobberMove = 'robberMove',
  RobberSteal = 'robberSteal',
  PostRoll = 'postRoll',
  GoldChoice = 'goldChoice', // Seafarers: players choose resource from gold hex
}

// Seafarers scenario identifiers
export type SeafarersScenario =
  | 'headingForNewShores'
  | 'theFourIslands'
  | 'throughTheDesert'
  | 'theNewWorld';

export interface GameConfig {
  playerCount: number;
  victoryPointsToWin: number;
  robberEnabled: boolean;
  devCardsEnabled: boolean;
  turnTimeLimitSeconds: number | null;
  boardSeed: number | null;
  // Seafarers
  seafarersEnabled: boolean;
  seafarersScenario: SeafarersScenario | null;
}

export const DEFAULT_CONFIG: GameConfig = {
  playerCount: 4,
  victoryPointsToWin: 10,
  robberEnabled: true,
  devCardsEnabled: true,
  turnTimeLimitSeconds: null,
  boardSeed: null,
  seafarersEnabled: false,
  seafarersScenario: null,
};

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  offering: ResourceBundle;
  requesting: ResourceBundle;
  acceptedBy: string[];
  status: 'open' | 'accepted' | 'rejected' | 'cancelled';
}

export interface SetupState {
  currentSetupPlayerIndex: number;
  settlementsPlacedThisRound: number;
  awaitingRoad: boolean; // true when player placed settlement, now must place road
}

export interface GameState {
  gameId: string;
  config: GameConfig;
  phase: GamePhase;
  turnPhase: TurnPhase;

  board: BoardState;
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;

  setupState: SetupState | null;

  lastDiceRoll: [number, number] | null;
  devCardDeck: DevCardType[];
  activeTradeOffer: TradeOffer | null;

  robberHex: HexCoord;
  pirateHex: HexCoord | null; // Seafarers: pirate on a sea hex
  playersNeedingDiscard: string[];
  // Seafarers: gold hex resource choice pending
  playersNeedingGoldChoice: Array<{ playerId: string; count: number }>;

  longestRoadPlayerId: string | null;
  longestRoadLength: number;
  largestArmyPlayerId: string | null;
  largestArmySize: number;

  winnerId: string | null;

  bank: ResourceBundle;
  diceRollHistory: Array<{ roll: number; playerId: string }>;
  gameStartTimestamp: number;

  eventLog: TimestampedEvent[];
  actionIndex: number;
}
