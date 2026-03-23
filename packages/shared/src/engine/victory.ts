import { GameState, GamePhase } from '../types/game.js';
import { GameEvent } from '../types/event.js';
import { BoardGraph } from '../board/hex-grid.js';
import { calculateLongestRoad, calculateLongestTradeRoute } from './board-query.js';

export function calculateVP(state: GameState, playerIdx: number): number {
  const player = state.players[playerIdx];
  let vp = 0;
  vp += player.settlements.length; // 1 VP each
  vp += player.cities.length * 2;  // 2 VP each
  vp += player.hiddenVP;           // VP dev cards
  if (player.hasLongestRoad) vp += 2;
  if (player.hasLargestArmy) vp += 2;
  return vp;
}

export function updateLongestRoad(state: GameState, graph: BoardGraph, events: GameEvent[]) {
  let longestLength = state.longestRoadLength;
  let longestPlayerId = state.longestRoadPlayerId;

  for (let i = 0; i < state.players.length; i++) {
    // In Seafarers, use longest trade route (roads + ships); otherwise just roads
    const roadLen = state.config.seafarersEnabled
      ? calculateLongestTradeRoute(state, graph, state.players[i].id)
      : calculateLongestRoad(state, graph, state.players[i].id);

    if (roadLen >= 5 && roadLen > longestLength) {
      longestLength = roadLen;
      longestPlayerId = state.players[i].id;
    }
  }

  if (longestPlayerId !== state.longestRoadPlayerId) {
    // Remove old holder
    for (const p of state.players) {
      p.hasLongestRoad = false;
    }
    // Set new holder
    if (longestPlayerId) {
      const holder = state.players.find((p) => p.id === longestPlayerId);
      if (holder) holder.hasLongestRoad = true;
    }
    state.longestRoadPlayerId = longestPlayerId;
    state.longestRoadLength = longestLength;
    events.push({ type: 'longestRoadChanged', playerId: longestPlayerId, length: longestLength });
  }
}

export function updateLargestArmy(state: GameState, events: GameEvent[]) {
  let largestSize = state.largestArmySize;
  let largestPlayerId = state.largestArmyPlayerId;

  for (const player of state.players) {
    if (player.knightsPlayed >= 3 && player.knightsPlayed > largestSize) {
      largestSize = player.knightsPlayed;
      largestPlayerId = player.id;
    }
  }

  if (largestPlayerId !== state.largestArmyPlayerId) {
    for (const p of state.players) {
      p.hasLargestArmy = false;
    }
    if (largestPlayerId) {
      const holder = state.players.find((p) => p.id === largestPlayerId);
      if (holder) holder.hasLargestArmy = true;
    }
    state.largestArmyPlayerId = largestPlayerId;
    state.largestArmySize = largestSize;
    events.push({ type: 'largestArmyChanged', playerId: largestPlayerId, size: largestSize });
  }
}

export function checkVictory(state: GameState, events: GameEvent[]) {
  for (let i = 0; i < state.players.length; i++) {
    const vp = calculateVP(state, i);
    state.players[i].victoryPoints = vp;

    if (vp >= state.config.victoryPointsToWin && state.phase === GamePhase.Playing) {
      state.phase = GamePhase.Finished;
      state.winnerId = state.players[i].id;

      const finalScores: Record<string, number> = {};
      for (let j = 0; j < state.players.length; j++) {
        finalScores[state.players[j].id] = calculateVP(state, j);
      }
      events.push({ type: 'gameWon', winnerId: state.players[i].id, finalScores });
      return;
    }
  }
}
