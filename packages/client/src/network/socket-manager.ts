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
    sessionTakenOver: Array<() => void>;
  } = {
    lobbyUpdate: [],
    gameState: [],
    playerStatus: [],
    connectionChange: [],
    sessionTakenOver: [],
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

      // Auto-rejoin if we have a session token (for Socket.IO reconnects)
      const token = localStorage.getItem('catan_session_token');
      if (token) {
        this.socket!.emit('lobby:rejoin', { sessionToken: token }, (res) => {
          if (res.ok) {
            localStorage.setItem('catan_room_code', res.roomCode || '');
            localStorage.setItem('catan_player_id', res.playerId || '');
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

    this.socket.on('session:takenOver', () => {
      this.clearSession();
      this.listeners.sessionTakenOver.forEach((cb) => cb());
      this.listeners.connectionChange.forEach((cb) => cb('disconnected'));
    });
  }

  /**
   * Attempt to reconnect using a saved session token.
   * Used on app load to restore a previous game/lobby session.
   */
  async attemptReconnect(token?: string): Promise<{
    ok: true; roomCode: string; playerId: string; roomStatus: string;
  } | { ok: false }> {
    const sessionToken = token || localStorage.getItem('catan_session_token');
    if (!sessionToken) return { ok: false };

    this.connect();

    // Wait for socket to connect
    await new Promise<void>((resolve) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }
      const onConnect = () => {
        this.socket?.off('connect', onConnect);
        resolve();
      };
      this.socket?.on('connect', onConnect);
      // Timeout after 5s
      setTimeout(resolve, 5000);
    });

    if (!this.socket?.connected) {
      this.clearSession();
      return { ok: false };
    }

    return new Promise((resolve) => {
      this.socket!.emit('lobby:rejoin', { sessionToken }, (res) => {
        if (res.ok) {
          localStorage.setItem('catan_session_token', sessionToken);
          localStorage.setItem('catan_room_code', res.roomCode || '');
          localStorage.setItem('catan_player_id', res.playerId || '');
          resolve({
            ok: true,
            roomCode: res.roomCode!,
            playerId: res.playerId!,
            roomStatus: res.roomStatus || 'waiting',
          });
        } else {
          this.clearSession();
          resolve({ ok: false });
        }
      });

      setTimeout(() => {
        this.clearSession();
        resolve({ ok: false });
      }, 5000);
    });
  }

  async createRoom(
    playerName: string,
    config?: Partial<GameConfig>
  ): Promise<{ roomCode: string; sessionToken: string; playerId: string }> {
    this.ensureConnected();
    return new Promise((resolve, reject) => {
      this.socket!.emit('lobby:create', { playerName, config }, (res) => {
        localStorage.setItem('catan_session_token', res.sessionToken);
        localStorage.setItem('catan_room_code', res.roomCode);
        localStorage.setItem('catan_player_id', res.playerId);
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
        localStorage.setItem('catan_session_token', res.sessionToken!);
        localStorage.setItem('catan_room_code', roomCode.toUpperCase());
        localStorage.setItem('catan_player_id', res.playerId!);
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

  setConfig(config: Partial<import('@catan/shared').GameConfig>): void {
    this.socket?.emit('lobby:setConfig', config);
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
    this.clearSession();
  }

  // Event subscriptions
  onLobbyUpdate(cb: (room: LobbyRoom) => void): () => void {
    this.listeners.lobbyUpdate.push(cb);
    if (this.lastLobbyRoom) {
      cb(this.lastLobbyRoom);
    }
    return () => {
      this.listeners.lobbyUpdate = this.listeners.lobbyUpdate.filter((l) => l !== cb);
    };
  }

  onGameState(cb: (state: GameState) => void): () => void {
    this.listeners.gameState.push(cb);
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

  onSessionTakenOver(cb: () => void): () => void {
    this.listeners.sessionTakenOver.push(cb);
    return () => {
      this.listeners.sessionTakenOver = this.listeners.sessionTakenOver.filter((l) => l !== cb);
    };
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners = { lobbyUpdate: [], gameState: [], playerStatus: [], connectionChange: [], sessionTakenOver: [] };
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

  private clearSession(): void {
    localStorage.removeItem('catan_session_token');
    localStorage.removeItem('catan_room_code');
    localStorage.removeItem('catan_player_id');
  }
}

export const socketManager = new SocketManager();
