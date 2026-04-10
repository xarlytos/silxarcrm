import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { env } from './config/env';
import { prisma } from './config/database';
import { initFirebase } from './config/firebase';
import { initSocket } from './websocket/socket';
import { initCronJobs } from './jobs/cronJobs';
import { apiLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth';
import webhookRoutes from './routes/webhooks';
import dashboardRoutes from './routes/dashboard';
import iaRoutes from './routes/ia';
import eventsRoutes from './routes/events';
import adminRoutes from './routes/admin';
import calendarioRoutes from './routes/calendario';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/events', eventsRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Start server
async function start() {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    initFirebase();
    initSocket(httpServer);
    initCronJobs();

    httpServer.listen(env.PORT, () => {
      logger.info(`CRM Maestro API running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  httpServer.close();
  process.exit(0);
});
