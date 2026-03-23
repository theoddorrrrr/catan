import { HexCoord, VertexId, EdgeId } from './board.js';
import { PlayerColor } from './player.js';
import { ResourceBundle, ResourceType, DevCardType } from './resource.js';
import { GameConfig } from './game.js';

export type GameEvent =
  | { type: 'gameCreated'; config: GameConfig; boardSeed: number }
  | { type: 'playerJoined'; playerId: string; name: string; color: PlayerColor }
  | { type: 'gameStarted' }
  | { type: 'setupTurnStarted'; playerIndex: number; round: 1 | 2 }
  | { type: 'turnStarted'; playerIndex: number; turnNumber: number }
  | { type: 'diceRolled'; values: [number, number]; total: number }
  | { type: 'resourcesDistributed'; distributions: Record<string, ResourceBundle> }
  | { type: 'noResourcesProduced'; roll: number }
  | { type: 'settlementBuilt'; playerId: string; vertexId: VertexId }
  | { type: 'cityBuilt'; playerId: string; vertexId: VertexId }
  | { type: 'roadBuilt'; playerId: string; edgeId: EdgeId }
  | { type: 'devCardBought'; playerId: string; cardType?: DevCardType }
  | { type: 'knightPlayed'; playerId: string }
  | { type: 'robberMoved'; hex: HexCoord; movedByPlayerId: string }
  | { type: 'resourceStolen'; fromPlayerId: string; byPlayerId: string; resource?: ResourceType }
  | { type: 'resourcesDiscarded'; playerId: string; resources: ResourceBundle }
  | { type: 'tradeProposed'; offerId: string; fromPlayerId: string; offering: ResourceBundle; requesting: ResourceBundle }
  | { type: 'tradeAccepted'; offerId: string; byPlayerId: string }
  | { type: 'tradeCompleted'; offerId: string; betweenPlayers: [string, string] }
  | { type: 'tradeCancelled'; offerId: string }
  | { type: 'bankTradeCompleted'; playerId: string; gave: ResourceBundle; received: ResourceBundle }
  | { type: 'monopolyPlayed'; playerId: string; resource: ResourceType; amountTaken: number }
  | { type: 'yearOfPlentyPlayed'; playerId: string; resources: [ResourceType, ResourceType] }
  | { type: 'roadBuildingPlayed'; playerId: string; edges: [EdgeId, EdgeId] }
  | { type: 'longestRoadChanged'; playerId: string | null; length: number }
  | { type: 'largestArmyChanged'; playerId: string | null; size: number }
  | { type: 'victoryPointsUpdated'; playerId: string; publicVP: number }
  | { type: 'turnEnded'; playerIndex: number }
  | { type: 'gameWon'; winnerId: string; finalScores: Record<string, number> }
  | { type: 'initialResourcesGranted'; playerId: string; resources: ResourceBundle }
  // Seafarers events
  | { type: 'shipBuilt'; playerId: string; edgeId: EdgeId }
  | { type: 'shipMoved'; playerId: string; fromEdgeId: EdgeId; toEdgeId: EdgeId }
  | { type: 'pirateMoved'; hex: HexCoord; movedByPlayerId: string }
  | { type: 'goldResourceChosen'; playerId: string; resource: ResourceType };

export interface TimestampedEvent {
  index: number;
  event: GameEvent;
  timestamp: number;
}
