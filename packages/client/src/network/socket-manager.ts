import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameState,
  GameAction,
  LobbyRoom,
  GameConfig,
  PlayerColor,
} from '@catan/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

class SocketManager {
  private socket: TypedSocket | null = null;
  private lastLobbyRoom: LobbyRoom | null = null;
  private lastGameState: GameState | null = null;
  private listeners: {
    lobbyUpdate: Array<(room: LobbyRoom) => void>;
    gameState: Array<(state: GameState) => void>;
    playerStatus: Array<(playerId: string, connected: boolean) => void>;
    connectionChange: Array<(status: ConnectionStatus) => void>;
  } = {
    lobbyUpdate: [],
    gameState: [],
    playerStatus: [],
    connectionChange: [],
  };

  connect(serverUrl?: string): void {
    if (this.socket?.connected) return;

    const url = serverUrl || (
      window.location.hostname === 'localhost'
        ? 'http://localhost:4000'
        : window.location.origin
    );

    this.notifyConnection('connecting');

    this.socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.notifyConnection('connected');

      // Auto-rejoin if we have a session token
      const token = sessionStorage.getItem('catan_session_token');
      if (token) {
        this.socket!.emit('lobby:rejoin', { sessionToken: token }, (res) => {
          if (res.ok) {
            sessionStorage.setItem('catan_room_code', res.roomCode || '');
            sessionStorage.setItem('catan_player_id', res.playerId || '');
          }
        });
      }
    });

    this.socket.on('disconnect', () => {
      this.notifyConnection('reconnecting');
    });

    this.socket.io.on('reconnect_failed', () => {
      this.notifyConnection('disconnected');
    });

    // Wire up server events
    this.socket.on('lobby:update', (room) => {
      this.lastLobbyRoom = room;
      this.listeners.lobbyUpdate.forEach((cb) => cb(room));
    });

    this.socket.on('game:state', (state) => {
      this.lastGameState = state;
      this.listeners.gameState.forEach((cb) => cb(state));
    });

    this.socket.on('game:playerStatus', (playerId, connected) => {
      this.listeners.playerStatus.forEach((cb) => cb(playerId, connected));
    });
  }

  async createRoom(
    playerName: string,
    config?: Partial<GameConfig>
  ): Promise<{ roomCode: string; sessionToken: string; playerId: string }> {
    this.ensureConnected();
    return new Promise((resolve, reject) => {
      this.socket!.emit('lobby:create', { playerName, config }, (res) => {
        sessionStorage.setItem('catan_session_token', res.sessionToken);
        sessionStorage.setItem('catan_room_code', res.roomCode);
        sessionStorage.setItem('catan_player_id', res.playerId);
        resolve(res);
      });

      setTimeout(() => reject(new Error('Create room timeout')), 5000);
    });
  }

  async joinRoom(
    roomCode: string,
    playerName: string
  ): Promise<{ sessionToken: string; playerId: string }> {
    this.ensureConnected();
    return new Promise((resolve, reject) => {
      this.socket!.emit('lobby:join', { roomCode: roomCode.toUpperCase(), playerName }, (res) => {
        if (!res.ok) {
          reject(new Error(res.error || 'Failed to join'));
          return;
        }
        sessionStorage.setItem('catan_session_token', res.sessionToken!);
        sessionStorage.setItem('catan_room_code', roomCode.toUpperCase());
        sessionStorage.setItem('catan_player_id', res.playerId!);
        resolve({ sessionToken: res.sessionToken!, playerId: res.playerId! });
      });

      setTimeout(() => reject(new Error('Join room timeout')), 5000);
    });
  }

  async sendAction(action: GameAction): Promise<{ ok: boolean; error?: string }> {
    this.ensureConnected();
    return new Promise((resolve) => {
      this.socket!.emit('game:action', action, resolve);
      setTimeout(() => resolve({ ok: false, error: 'Action timeout' }), 5000);
    });
  }

  setReady(ready: boolean): void {
    this.socket?.emit('lobby:setReady', ready);
  }

  setColor(color: PlayerColor): void {
    this.socket?.emit('lobby:setColor', color);
  }

  setSlotType(slotIndex: number, type: 'bot' | 'open'): void {
    this.socket?.emit('lobby:setSlotType', slotIndex, type);
  }

  async startGame(): Promise<{ ok: boolean; error?: string }> {
    this.ensureConnected();
    return new Promise((resolve) => {
      this.socket!.emit('lobby:start', resolve);
      setTimeout(() => resolve({ ok: false, error: 'Start timeout' }), 5000);
    });
  }

  leave(): void {
    this.socket?.emit('lobby:leave');
    this.lastLobbyRoom = null;
    this.lastGameState = null;
    sessionStorage.removeItem('catan_session_token');
    sessionStorage.removeItem('catan_room_code');
    sessionStorage.removeItem('catan_player_id');
  }

  // Event subscriptions
  onLobbyUpdate(cb: (room: LobbyRoom) => void): () => void {
    this.listeners.lobbyUpdate.push(cb);
    // Immediately emit cached value so late subscribers get current state
    if (this.lastLobbyRoom) {
      cb(this.lastLobbyRoom);
    }
    return () => {
      this.listeners.lobbyUpdate = this.listeners.lobbyUpdate.filter((l) => l !== cb);
    };
  }

  onGameState(cb: (state: GameState) => void): () => void {
    this.listeners.gameState.push(cb);
    // Immediately emit cached value so late subscribers get current state
    if (this.lastGameState) {
      cb(this.lastGameState);
    }
    return () => {
      this.listeners.gameState = this.listeners.gameState.filter((l) => l !== cb);
    };
  }

  onPlayerStatus(cb: (playerId: string, connected: boolean) => void): () => void {
    this.listeners.playerStatus.push(cb);
    return () => {
      this.listeners.playerStatus = this.listeners.playerStatus.filter((l) => l !== cb);
    };
  }

  onConnectionChange(cb: (status: ConnectionStatus) => void): () => void {
    this.listeners.connectionChange.push(cb);
    return () => {
      this.listeners.connectionChange = this.listeners.connectionChange.filter((l) => l !== cb);
    };
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners = { lobbyUpdate: [], gameState: [], playerStatus: [], connectionChange: [] };
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private ensureConnected(): void {
    if (!this.socket) {
      this.connect();
    }
  }

  private notifyConnection(status: ConnectionStatus): void {
    this.listeners.connectionChange.forEach((cb) => cb(status));
  }
}

export const socketManager = new SocketManager();
