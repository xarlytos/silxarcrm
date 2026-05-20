import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        try {
          const hostname = new URL(origin).hostname;
          const envOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean);
          const staticAllowed = [
            ...envOrigins,
            'https://crmpropio.vercel.app',
            'https://app.ervok.com',
            'https://ervok.com',
            'http://localhost:3000',
            'http://localhost:3001',
          ];
          if (
            staticAllowed.includes(origin) ||
            /\.vercel\.app$/.test(hostname) ||
            /\.ervok\.com$/.test(hostname) ||
            hostname === 'ervok.com'
          ) {
            return callback(null, true);
          }
        } catch { /* fallthrough */ }
        return callback(new Error(`Socket CORS: origen no permitido (${origin})`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Autenticación requerida'));
    }
    try {
      const decoded = verifyToken(token);
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`WebSocket connected: ${(socket as any).user?.email}`);

    socket.on('join_saas', (saas: string) => {
      socket.join(`saas:${saas}`);
    });

    socket.on('leave_saas', (saas: string) => {
      socket.leave(`saas:${saas}`);
    });

    socket.on('join_llamadas', () => {
      socket.join('llamadas');
    });

    socket.on('leave_llamadas', () => {
      socket.leave('llamadas');
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected: ${(socket as any).user?.email}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
