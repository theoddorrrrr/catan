import { HexCoord, VertexId, EdgeId } from './board.js';
import { ResourceBundle, ResourceType } from './resource.js';
import { GameState } from './game.js';
import { GameEvent } from './event.js';

export type GameAction =
  | { type: 'rollDice' }
  | { type: 'buildSettlement'; vertexId: VertexId }
  | { type: 'buildCity'; vertexId: VertexId }
  | { type: 'buildRoad'; edgeId: EdgeId }
  | { type: 'buyDevCard' }
  | { type: 'playKnight'; moveRobberTo: HexCoord; stealFromPlayerId?: string }
  | { type: 'playRoadBuilding'; edges: [EdgeId, EdgeId] }
  | { type: 'playYearOfPlenty'; resources: [ResourceType, ResourceType] }
  | { type: 'playMonopoly'; resource: ResourceType }
  | { type: 'moveRobber'; hex: HexCoord }
  | { type: 'stealResource'; targetPlayerId: string }
  | { type: 'discardResources'; resources: ResourceBundle }
  | { type: 'proposeTrade'; offering: ResourceBundle; requesting: ResourceBundle }
  | { type: 'acceptTrade'; tradeId: string }
  | { type: 'rejectTrade'; tradeId: string }
  | { type: 'cancelTrade'; tradeId: string }
  | { type: 'bankTrade'; giving: ResourceBundle; receiving: ResourceBundle }
  | { type: 'endTurn' }
  | { type: 'placeInitialSettlement'; vertexId: VertexId }
  | { type: 'placeInitialRoad'; edgeId: EdgeId }
  // Seafarers actions
  | { type: 'buildShip'; edgeId: EdgeId }
  | { type: 'moveShip'; fromEdgeId: EdgeId; toEdgeId: EdgeId }
  | { type: 'movePirate'; hex: HexCoord }
  | { type: 'chooseGoldResource'; resource: ResourceType }
  | { type: 'placeInitialShip'; edgeId: EdgeId };

export interface ActionEnvelope {
  action: GameAction;
  playerId: string;
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface ActionResult {
  newState: GameState;
  events: GameEvent[];
}
