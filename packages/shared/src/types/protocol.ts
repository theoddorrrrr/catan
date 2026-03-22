import { GameConfig, GameState } from './game.js';
import { GameAction } from './action.js';
import { PlayerColor } from './player.js';

// --- Lobby types ---

export interface LobbySlot {
  index: number;
  type: 'human' | 'bot' | 'open';
  playerId?: string;
  playerName?: string;
  color: PlayerColor;
  ready: boolean;
}

export interface LobbyRoom {
  roomCode: string;
  hostPlayerId: string;
  slots: LobbySlot[];
  config: Partial<GameConfig>;
  status: 'waiting' | 'starting' | 'in_progress';
}

// --- Socket.IO event maps ---

export interface ClientToServerEvents {
  'lobby:create': (
    opts: { playerName: string; config?: Partial<GameConfig> },
    cb: (res: { roomCode: string; sessionToken: string; playerId: string }) => void
  ) => void;

  'lobby:join': (
    opts: { roomCode: string; playerName: string },
    cb: (res: { ok: boolean; error?: string; sessionToken?: string; playerId?: string }) => void
  ) => void;

  'lobby:rejoin': (
    opts: { sessionToken: string },
    cb: (res: { ok: boolean; error?: string; roomCode?: string; playerId?: string }) => void
  ) => void;

  'lobby:setReady': (ready: boolean) => void;
  'lobby:setColor': (color: PlayerColor) => void;
  'lobby:setSlotType': (slotIndex: number, type: 'bot' | 'open') => void;
  'lobby:start': (cb: (res: { ok: boolean; error?: string }) => void) => void;
  'lobby:leave': () => void;

  'game:action': (
    action: GameAction,
    cb: (res: { ok: boolean; error?: string }) => void
  ) => void;
}

export interface ServerToClientEvents {
  'lobby:update': (room: LobbyRoom) => void;
  'game:state': (state: GameState) => void;
  'game:playerStatus': (playerId: string, connected: boolean) => void;
}
