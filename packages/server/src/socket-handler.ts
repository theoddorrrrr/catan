import { Server as SocketIOServer, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@catan/shared';
import { RoomManager } from './room-manager.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Map socketId -> sessionToken for disconnect handling
const socketToSession = new Map<string, string>();

export function setupSocketHandlers(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // --- Lobby: Create room ---
    socket.on('lobby:create', (opts, cb) => {
      const { roomCode, sessionToken, playerId } = roomManager.createRoom(opts.playerName, opts.config);
      roomManager.bindSocket(sessionToken, socket.id);
      socketToSession.set(socket.id, sessionToken);
      socket.join(roomCode);

      const roomData = roomManager.getRoomByCode(roomCode)!;
      cb({ roomCode, sessionToken, playerId });
      io.to(roomCode).emit('lobby:update', roomData.room);
    });

    // --- Lobby: Join room ---
    socket.on('lobby:join', (opts, cb) => {
      const result = roomManager.joinRoom(opts.roomCode, opts.playerName);
      if (!result.ok) {
        cb({ ok: false, error: result.error });
        return;
      }

      roomManager.bindSocket(result.sessionToken!, socket.id);
      socketToSession.set(socket.id, result.sessionToken!);
      socket.join(opts.roomCode);

      const roomData = roomManager.getRoomByCode(opts.roomCode)!;
      cb({ ok: true, sessionToken: result.sessionToken, playerId: result.playerId });
      io.to(opts.roomCode).emit('lobby:update', roomData.room);
    });

    // --- Lobby: Rejoin (reconnection) ---
    socket.on('lobby:rejoin', (opts, cb) => {
      const result = roomManager.rejoinByToken(opts.sessionToken);
      if (!result.ok || !result.roomData || !result.playerSession) {
        cb({ ok: false, error: result.error || 'Session not found' });
        return;
      }

      const { roomData, playerSession } = result;
      roomManager.bindSocket(opts.sessionToken, socket.id);
      socketToSession.set(socket.id, opts.sessionToken);
      socket.join(roomData.room.roomCode);

      // Mark player as connected in game state
      if (roomData.gameSession) {
        const state = roomData.gameSession.getState();
        const player = state.players.find((p) => p.id === playerSession.playerId);
        if (player) {
          player.isConnected = true;
          player.isBot = false;
        }
      }

      cb({
        ok: true,
        roomCode: roomData.room.roomCode,
        playerId: playerSession.playerId,
      });

      // Send current state
      if (roomData.room.status === 'in_progress' && roomData.gameSession) {
        const filtered = roomData.gameSession.filterStateForPlayer(playerSession.playerId);
        socket.emit('game:state', filtered);
        io.to(roomData.room.roomCode).emit('game:playerStatus', playerSession.playerId, true);
      } else {
        io.to(roomData.room.roomCode).emit('lobby:update', roomData.room);
      }
    });

    // --- Lobby: Set ready ---
    socket.on('lobby:setReady', (ready) => {
      const sessionToken = socketToSession.get(socket.id);
      if (!sessionToken) return;

      const roomCode = roomManager.setReady(sessionToken, ready);
      if (!roomCode) return;

      const roomData = roomManager.getRoomByCode(roomCode)!;
      io.to(roomCode).emit('lobby:update', roomData.room);
    });

    // --- Lobby: Set color ---
    socket.on('lobby:setColor', (color) => {
      const sessionToken = socketToSession.get(socket.id);
      if (!sessionToken) return;

      const roomCode = roomManager.setColor(sessionToken, color);
      if (!roomCode) return;

      const roomData = roomManager.getRoomByCode(roomCode)!;
      io.to(roomCode).emit('lobby:update', roomData.room);
    });

    // --- Lobby: Set slot type (host only) ---
    socket.on('lobby:setSlotType', (slotIndex, type) => {
      const sessionToken = socketToSession.get(socket.id);
      if (!sessionToken) return;

      const session = roomManager.getSessionByToken(sessionToken);
      if (!session) return;

      const ok = roomManager.setSlotType(
        session.roomData.room.roomCode,
        session.playerSession.playerId,
        slotIndex,
        type
      );
      if (!ok) return;

      io.to(session.roomData.room.roomCode).emit('lobby:update', session.roomData.room);
    });

    // --- Lobby: Start game (host only) ---
    socket.on('lobby:start', (cb) => {
      const sessionToken = socketToSession.get(socket.id);
      if (!sessionToken) {
        cb({ ok: false, error: 'Not authenticated' });
        return;
      }

      const session = roomManager.getSessionByToken(sessionToken);
      if (!session) {
        cb({ ok: false, error: 'Session not found' });
        return;
      }

      const { roomData, playerSession } = session;
      const roomCode = roomData.room.roomCode;

      const canStart = roomManager.canStartGame(roomCode, playerSession.playerId);
      if (!canStart.ok) {
        cb({ ok: false, error: canStart.error });
        return;
      }

      const gameSession = roomManager.startGame(roomCode);
      if (!gameSession) {
        cb({ ok: false, error: 'Failed to start game' });
        return;
      }

      // Set up state change callback to broadcast to all players
      gameSession.setOnStateChange(() => {
        broadcastState(io, roomData, gameSession);
      });

      cb({ ok: true });

      // Send initial state to each player
      broadcastState(io, roomData, gameSession);

      // Start bot ticks
      gameSession.scheduleBotTick();
    });

    // --- Lobby: Leave ---
    socket.on('lobby:leave', () => {
      const sessionToken = socketToSession.get(socket.id);
      if (!sessionToken) return;

      const session = roomManager.getSessionByToken(sessionToken);
      const roomCode = session?.roomData.room.roomCode;

      const result = roomManager.leaveRoom(sessionToken);
      socketToSession.delete(socket.id);

      if (result && !result.destroyed && roomCode) {
        socket.leave(roomCode);
        const roomData = roomManager.getRoomByCode(roomCode);
        if (roomData) {
          io.to(roomCode).emit('lobby:update', roomData.room);
        }
      } else if (result?.destroyed && roomCode) {
        socket.leave(roomCode);
      }
    });

    // --- Game: Action ---
    socket.on('game:action', (action, cb) => {
      const sessionToken = socketToSession.get(socket.id);
      if (!sessionToken) {
        cb({ ok: false, error: 'Not authenticated' });
        return;
      }

      const session = roomManager.getSessionByToken(sessionToken);
      if (!session || !session.roomData.gameSession) {
        cb({ ok: false, error: 'No active game' });
        return;
      }

      const { roomData, playerSession } = session;
      const result = roomData.gameSession!.handleAction(playerSession.playerId, action);
      cb(result);
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      const sessionToken = socketToSession.get(socket.id);
      if (!sessionToken) return;

      const session = roomManager.getSessionByToken(sessionToken);
      if (!session) {
        socketToSession.delete(socket.id);
        return;
      }

      const { roomData, playerSession } = session;
      roomManager.markDisconnected(sessionToken);
      socketToSession.delete(socket.id);

      const roomCode = roomData.room.roomCode;

      if (roomData.room.status === 'in_progress' && roomData.gameSession) {
        // Mark player as disconnected in game state
        const state = roomData.gameSession.getState();
        const player = state.players.find((p) => p.id === playerSession.playerId);
        if (player) {
          player.isConnected = false;
        }

        io.to(roomCode).emit('game:playerStatus', playerSession.playerId, false);

        // Start disconnect timer — convert to bot after 5 minutes
        playerSession.disconnectTimer = setTimeout(() => {
          const converted = roomManager.convertToBot(sessionToken);
          if (converted && roomData.gameSession) {
            // Bot should now take over this player's turns
            roomData.gameSession.scheduleBotTick();
            broadcastState(io, roomData, roomData.gameSession);
          }
        }, 5 * 60 * 1000);

        // If it's currently this player's turn, schedule bot after 60s
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (currentPlayer.id === playerSession.playerId) {
          setTimeout(() => {
            // Check if still disconnected
            if (!playerSession.socketId && roomData.gameSession) {
              const s = roomData.gameSession.getState();
              const p = s.players.find((pl) => pl.id === playerSession.playerId);
              if (p && !p.isConnected) {
                p.isBot = true;
                roomData.gameSession.scheduleBotTick();
              }
            }
          }, 60 * 1000);
        }
      } else {
        // In lobby — just leave
        const result = roomManager.leaveRoom(sessionToken);
        if (result && !result.destroyed) {
          const rd = roomManager.getRoomByCode(roomCode);
          if (rd) {
            io.to(roomCode).emit('lobby:update', rd.room);
          }
        }
      }

      console.log(`Socket disconnected: ${socket.id} (player: ${playerSession.playerName})`);
    });
  });
}

function broadcastState(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomData: { room: { roomCode: string }; playerSessions: Map<string, { playerId: string; socketId: string | null }> },
  gameSession: { filterStateForPlayer: (id: string) => any }
): void {
  // Send filtered state to each connected player
  for (const [, ps] of roomData.playerSessions) {
    if (ps.socketId) {
      const filtered = gameSession.filterStateForPlayer(ps.playerId);
      io.to(ps.socketId).emit('game:state', filtered);
    }
  }
}
