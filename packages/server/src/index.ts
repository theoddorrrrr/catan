import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClientToServerEvents, ServerToClientEvents } from '@catan/shared';
import { RoomManager } from './room-manager.js';
import { setupSocketHandlers } from './socket-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '4000', 10);
const isDev = process.env.NODE_ENV !== 'production';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: isDev
    ? { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
    : undefined,
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// In production, serve the client build
if (!isDev) {
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Set up game logic
const roomManager = new RoomManager();
roomManager.startCleanupInterval();
setupSocketHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`Catan server running on port ${PORT}`);
  if (isDev) {
    console.log(`WebSocket accepting connections from http://localhost:3000`);
  }
});
