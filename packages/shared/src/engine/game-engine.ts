import { GameState, GamePhase, TurnPhase } from '../types/game.js';
import { GameAction, ActionEnvelope, ActionResult, ValidationResult } from '../types/action.js';
import { GameEvent, TimestampedEvent } from '../types/event.js';
import { BoardGraph } from '../board/hex-grid.js';
import { SeededRandom } from '../utils/random.js';
import { handleSetupAction, validateSetupAction } from './setup-phase.js';
import { handlePlayAction, validatePlayAction } from './play-phase.js';

export class GameEngine {
  private graph: BoardGraph;
  private rng: SeededRandom;

  constructor(graph: BoardGraph, rng: SeededRandom) {
    this.graph = graph;
    this.rng = rng;
  }

  validate(state: GameState, envelope: ActionEnvelope): ValidationResult {
    const { action, playerId } = envelope;

    if (state.phase === GamePhase.Finished) {
      return { valid: false, reason: 'Game is finished' };
    }

    if (state.phase === GamePhase.SetupRound1 || state.phase === GamePhase.SetupRound2) {
      return validateSetupAction(state, envelope, this.graph);
    }

    if (state.phase === GamePhase.Playing) {
      return validatePlayAction(state, envelope, this.graph);
    }

    return { valid: false, reason: `Invalid game phase: ${state.phase}` };
  }

  applyAction(state: GameState, envelope: ActionEnvelope): ActionResult {
    const validation = this.validate(state, envelope);
    if (!validation.valid) {
      throw new Error(`Invalid action: ${validation.reason}`);
    }

    let result: ActionResult;

    if (state.phase === GamePhase.SetupRound1 || state.phase === GamePhase.SetupRound2) {
      result = handleSetupAction(state, envelope, this.graph);
    } else {
      result = handlePlayAction(state, envelope, this.graph, this.rng);
    }

    // Add timestamped events to log
    const newEvents: TimestampedEvent[] = result.events.map((event) => ({
      index: result.newState.actionIndex,
      event,
      timestamp: envelope.timestamp,
    }));

    result.newState = {
      ...result.newState,
      eventLog: [...result.newState.eventLog, ...newEvents],
      actionIndex: result.newState.actionIndex + 1,
    };

    return result;
  }

  getGraph(): BoardGraph {
    return this.graph;
  }

  getRng(): SeededRandom {
    return this.rng;
  }
}
