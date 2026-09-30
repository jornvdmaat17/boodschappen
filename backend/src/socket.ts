import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyToken } from './auth.js';
import { config } from './config.js';

let io: Server;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || verifyToken(token) === null) return next(new Error('Unauthorized'));
    next();
  });

  io.on('connection', (socket) => {
    socket.on('join_list', (listId: number) => {
      socket.join(`list:${listId}`);
    });
    socket.on('leave_list', (listId: number) => {
      socket.leave(`list:${listId}`);
    });
  });

  return io;
}

export function emitToList(listId: number | string, event: string, payload: any) {
  io?.to(`list:${listId}`).emit(event, payload);
}
