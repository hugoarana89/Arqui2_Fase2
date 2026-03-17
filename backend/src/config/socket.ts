import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyToken } from '../utils/jwt.util.js';
import { getPublicState } from '../state/plantState.js';

// ──────────────────────────────────────────────
//  Singleton de Socket.io
//  Se inicializa una vez desde index.ts
// ──────────────────────────────────────────────
let io: SocketServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env['FRONTEND_URL'] ?? '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Autenticación del socket mediante JWT ──
  io.use((socket, next) => {
    const token =
      socket.handshake.auth['token'] ??
      socket.handshake.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Token de autenticación requerido.'));
    }
    try {
      const payload = verifyToken(token as string);
      (socket as typeof socket & { user: typeof payload }).user = payload;
      next();
    } catch {
      next(new Error('Token inválido o expirado.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Enviar estado actual inmediatamente al conectarse
    socket.emit('state_update', getPublicState());

    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });

  console.log('✅ Socket.io inicializado.');
  return io;
};

/** Emite el estado global a todos los clientes conectados */
export const emitStateUpdate = (): void => {
  if (!io) return;
  io.emit('state_update', getPublicState());
};

export const getSocketServer = (): SocketServer | null => io;
