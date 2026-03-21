import { GameState } from '../types/game.js';
import { GameAction } from '../types/action.js';
import { ResourceBundle } from '../types/resource.js';
import { HexCoord, VertexId, EdgeId } from '../types/board.js';
import { BoardGraph } from '../board/hex-grid.js';

export interface BotStrategy {
  chooseAction(state: GameState, playerId: string, graph: BoardGraph): GameAction;
  chooseInitialSettlement(state: GameState, playerId: string, graph: BoardGraph): VertexId;
  chooseInitialRoad(state: GameState, playerId: string, graph: BoardGraph, settlementVertex: VertexId): EdgeId;
  chooseDiscard(state: GameState, playerId: string, graph: BoardGraph, mustDiscard: number): ResourceBundle;
  chooseRobberHex(state: GameState, playerId: string, graph: BoardGraph): HexCoord;
  chooseStealTarget(state: GameState, playerId: string, graph: BoardGraph, candidates: string[]): string;
}
