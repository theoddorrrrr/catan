import { nanoid, customAlphabet } from 'nanoid';
import { LobbyRoom, LobbySlot, GameConfig, PlayerColor, ALL_PLAYER_COLORS } from '@catan/shared';
import { GameSession } from './game-session.js';

const generateRoomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

export interface PlayerSession {
  sessionToken: string;
  playerId: string;
  playerName: string;
  socketId: string | null;
  slotIndex: number;
  roomCode: string;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

export interface RoomData {
  room: LobbyRoom;
  gameSession: GameSession | null;
  playerSessions: Map<string, PlayerSession>; // sessionToken -> PlayerSession
  createdAt: number;
  lastActivityAt: number;
}

export class RoomManager {
  private rooms = new Map<string, RoomData>();
  private sessionIndex = new Map<string, RoomData>(); // sessionToken -> RoomData

  createRoom(
    hostName: string,
    config: Partial<GameConfig> = {}
  ): { roomCode: string; sessionToken: string; playerId: string } {
    const roomCode = generateRoomCode();
    const sessionToken = nanoid(21);
    const playerId = 'player-0';

    const slots: LobbySlot[] = ALL_PLAYER_COLORS.map((color, i) => ({
      index: i,
      type: i === 0 ? 'human' as const : 'open' as const,
      playerId: i === 0 ? playerId : undefined,
      playerName: i === 0 ? hostName : undefined,
      color,
      ready: false,
    }));

    const room: LobbyRoom = {
      roomCode,
      hostPlayerId: playerId,
      slots,
      config,
      status: 'waiting',
    };

    const playerSession: PlayerSession = {
      sessionToken,
      playerId,
      playerName: hostName,
      socketId: null,
      slotIndex: 0,
      roomCode,
    };

    const now = Date.now();
    const roomData: RoomData = {
      room,
      gameSession: null,
      playerSessions: new Map([[sessionToken, playerSession]]),
      createdAt: now,
      lastActivityAt: now,
    };

    this.rooms.set(roomCode, roomData);
    this.sessionIndex.set(sessionToken, roomData);

    return { roomCode, sessionToken, playerId };
  }

  joinRoom(
    roomCode: string,
    playerName: string
  ): { ok: boolean; error?: string; sessionToken?: string; playerId?: string } {
    const roomData = this.rooms.get(roomCode);
    if (!roomData) return { ok: false, error: 'Room not found' };
    if (roomData.room.status !== 'waiting') return { ok: false, error: 'Game already in progress' };

    const openSlot = roomData.room.slots.find((s) => s.type === 'open');
    if (!openSlot) return { ok: false, error: 'Room is full' };

    const sessionToken = nanoid(21);
    const playerId = `player-${openSlot.index}`;

    openSlot.type = 'human';
    openSlot.playerId = playerId;
    openSlot.playerName = playerName;
    openSlot.ready = false;

    const playerSession: PlayerSession = {
      sessionToken,
      playerId,
      playerName,
      socketId: null,
      slotIndex: openSlot.index,
      roomCode,
    };

    roomData.playerSessions.set(sessionToken, playerSession);
    this.sessionIndex.set(sessionToken, roomData);
    roomData.lastActivityAt = Date.now();

    return { ok: true, sessionToken, playerId };
  }

  rejoinByToken(sessionToken: string): {
    ok: boolean;
    error?: string;
    roomData?: RoomData;
    playerSession?: PlayerSession;
  } {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return { ok: false, error: 'Session not found' };

    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return { ok: false, error: 'Session not found' };

    // Clear disconnect timer if any
    if (playerSession.disconnectTimer) {
      clearTimeout(playerSession.disconnectTimer);
      playerSession.disconnectTimer = undefined;
    }

    roomData.lastActivityAt = Date.now();
    return { ok: true, roomData, playerSession };
  }

  leaveRoom(sessionToken: string): { roomCode: string; destroyed: boolean } | null {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return null;

    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return null;

    const { roomCode } = roomData.room;
    const slot = roomData.room.slots[playerSession.slotIndex];

    // Reset slot to open
    slot.type = 'open';
    slot.playerId = undefined;
    slot.playerName = undefined;
    slot.ready = false;

    // Remove session
    roomData.playerSessions.delete(sessionToken);
    this.sessionIndex.delete(sessionToken);

    // Check if room is empty (no human players)
    const hasHumans = roomData.room.slots.some((s) => s.type === 'human');
    if (!hasHumans) {
      if (roomData.gameSession) {
        roomData.gameSession.destroy();
      }
      this.rooms.delete(roomCode);
      return { roomCode, destroyed: true };
    }

    // Promote new host if the host left
    if (roomData.room.hostPlayerId === playerSession.playerId) {
      const nextHuman = roomData.room.slots.find((s) => s.type === 'human');
      if (nextHuman) {
        roomData.room.hostPlayerId = nextHuman.playerId!;
      }
    }

    return { roomCode, destroyed: false };
  }

  setSlotType(roomCode: string, requesterId: string, slotIndex: number, type: 'bot' | 'open'): boolean {
    const roomData = this.rooms.get(roomCode);
    if (!roomData) return false;
    if (roomData.room.hostPlayerId !== requesterId) return false;
    if (roomData.room.status !== 'waiting') return false;

    const slot = roomData.room.slots[slotIndex];
    if (!slot || slot.type === 'human') return false;

    slot.type = type;
    if (type === 'bot') {
      slot.playerName = `Bot ${slotIndex + 1}`;
      slot.playerId = `bot-${slotIndex}`;
      slot.ready = true;
    } else {
      slot.playerName = undefined;
      slot.playerId = undefined;
      slot.ready = false;
    }

    return true;
  }

  setReady(sessionToken: string, ready: boolean): string | null {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return null;

    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return null;

    const slot = roomData.room.slots[playerSession.slotIndex];
    slot.ready = ready;

    return roomData.room.roomCode;
  }

  setColor(sessionToken: string, color: PlayerColor): string | null {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return null;

    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return null;

    const mySlot = roomData.room.slots[playerSession.slotIndex];
    const targetSlot = roomData.room.slots.find((s) => s.color === color);
    if (!targetSlot) return null;

    // Swap colors
    const oldColor = mySlot.color;
    mySlot.color = color;
    targetSlot.color = oldColor;

    return roomData.room.roomCode;
  }

  setConfig(sessionToken: string, config: Partial<GameConfig>): string | null {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return null;

    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return null;

    // Only host can change config
    if (roomData.room.hostPlayerId !== playerSession.playerId) return null;
    if (roomData.room.status !== 'waiting') return null;

    roomData.room.config = { ...roomData.room.config, ...config };
    return roomData.room.roomCode;
  }

  canStartGame(roomCode: string, requesterId: string): { ok: boolean; error?: string } {
    const roomData = this.rooms.get(roomCode);
    if (!roomData) return { ok: false, error: 'Room not found' };
    if (roomData.room.hostPlayerId !== requesterId) return { ok: false, error: 'Only host can start' };
    if (roomData.room.status !== 'waiting') return { ok: false, error: 'Game already started' };

    // All non-open slots must be ready
    const activeSlotsCount = roomData.room.slots.filter((s) => s.type !== 'open').length;
    if (activeSlotsCount < 2) return { ok: false, error: 'Need at least 2 players' };

    const allReady = roomData.room.slots
      .filter((s) => s.type === 'human')
      .every((s) => s.ready);
    if (!allReady) return { ok: false, error: 'Not all players are ready' };

    return { ok: true };
  }

  startGame(roomCode: string): GameSession | null {
    const roomData = this.rooms.get(roomCode);
    if (!roomData) return null;

    roomData.room.status = 'in_progress';
    roomData.lastActivityAt = Date.now();
    const gameSession = new GameSession(roomData.room);
    roomData.gameSession = gameSession;

    return gameSession;
  }

  getRoomByCode(roomCode: string): RoomData | undefined {
    return this.rooms.get(roomCode);
  }

  getSessionByToken(sessionToken: string): { roomData: RoomData; playerSession: PlayerSession } | undefined {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return undefined;
    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return undefined;
    return { roomData, playerSession };
  }

  markDisconnected(sessionToken: string): PlayerSession | null {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return null;
    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return null;
    playerSession.socketId = null;
    return playerSession;
  }

  bindSocket(sessionToken: string, socketId: string): void {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return;
    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return;
    playerSession.socketId = socketId;
  }

  // Convert disconnected player to bot permanently
  convertToBot(sessionToken: string): string | null {
    const roomData = this.sessionIndex.get(sessionToken);
    if (!roomData) return null;
    const playerSession = roomData.playerSessions.get(sessionToken);
    if (!playerSession) return null;

    const slot = roomData.room.slots[playerSession.slotIndex];
    slot.type = 'bot';
    slot.ready = true;

    // Mark the player as bot in the game state if game is in progress
    if (roomData.gameSession) {
      const state = roomData.gameSession.getState();
      const player = state.players.find((p) => p.id === playerSession.playerId);
      if (player) {
        player.isBot = true;
        player.isConnected = false;
      }
    }

    // Clean up session
    roomData.playerSessions.delete(sessionToken);
    this.sessionIndex.delete(sessionToken);

    return roomData.room.roomCode;
  }

  hasNoHumans(roomCode: string): boolean {
    const roomData = this.rooms.get(roomCode);
    if (!roomData) return true;
    return roomData.playerSessions.size === 0;
  }

  destroyRoom(roomCode: string): void {
    const roomData = this.rooms.get(roomCode);
    if (!roomData) return;

    for (const [token, ps] of roomData.playerSessions) {
      if (ps.disconnectTimer) clearTimeout(ps.disconnectTimer);
      this.sessionIndex.delete(token);
    }

    if (roomData.gameSession) {
      roomData.gameSession.destroy();
    }

    this.rooms.delete(roomCode);
    console.log(`Room ${roomCode} destroyed (cleanup)`);
  }

  updateActivity(roomCode: string): void {
    const roomData = this.rooms.get(roomCode);
    if (roomData) {
      roomData.lastActivityAt = Date.now();
    }
  }

  startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      const THIRTY_MINUTES = 30 * 60 * 1000;

      for (const [roomCode, roomData] of this.rooms) {
        if (now - roomData.createdAt > TWO_HOURS) {
          this.destroyRoom(roomCode);
          continue;
        }
        if (roomData.room.status === 'waiting' && now - roomData.lastActivityAt > THIRTY_MINUTES) {
          this.destroyRoom(roomCode);
          continue;
        }
        if (this.hasNoHumans(roomCode)) {
          this.destroyRoom(roomCode);
        }
      }
    }, 5 * 60 * 1000);
  }
}
