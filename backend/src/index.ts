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
import leadsRoutes from './routes/leads';
import spechsRoutes from './routes/spechs';
import simulacionRoutes from './routes/simulacion';
import llamadasRoutes from './routes/llamadas';
import emailRoutes from './routes/email';
import whatsappRoutes from './routes/whatsapp';
import whatsappWebJsRoutes from './routes/whatsappWebJs';
import whatsappChatbotRoutes from './routes/whatsappChatbot';
import landingsRoutes from './routes/landings';
import freeValuesRoutes from './routes/freeValues';
import propuestasRoutes from './routes/propuestas';
import tareasRoutes from './routes/tareas';
import softwareRoutes from './routes/software';
import voiceAgentRoutes from './routes/voiceAgent';
import growthRoutes from './routes/growth';
import adsenseRoutes from './routes/adsense';
import clothingRoutes from './routes/clothing';
import assetsRoutes from './routes/assets';
import sitesRoutes from './routes/sites';
import { startGrowthJobs, stopGrowthJobs } from './jobs/growthJobs';
import { startAdsenseJobs, stopAdsenseJobs } from './jobs/adsenseJobs';
import { startClothingJobs, stopClothingJobs } from './jobs/clothingJobs';
import { startAssetJobs, stopAssetJobs } from './jobs/assetJobs';

console.log('[BOOT] CRM Maestro API process started');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
const allowedOrigins = [
  ...env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean),
  'https://crmpropio.vercel.app',
  'https://app.ervok.com',
  'https://ervok.com',
  'http://localhost:3000',
  'http://localhost:3001',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const hostname = new URL(origin).hostname;
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(hostname) ||
      /\.ervok\.com$/.test(hostname) ||
      hostname === 'ervok.com'
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origen no permitido (${origin})`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
// Capturamos el raw body para verificación de firmas en webhooks (Resend/Svix)
app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use('/api', apiLimiter);
app.use('/uploads', express.static('uploads'));

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
app.use('/api/leads', leadsRoutes);
app.use('/api/spechs', spechsRoutes);
app.use('/api/simulacion', simulacionRoutes);
app.use('/api/llamadas', llamadasRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/whatsapp-wweb', whatsappWebJsRoutes);
app.use('/api/whatsapp-chatbot', whatsappChatbotRoutes);
app.use('/api/landings', landingsRoutes);
app.use('/api/free-values', freeValuesRoutes);
app.use('/api/propuestas', propuestasRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/softwares', softwareRoutes);
app.use('/api/voice-agent', voiceAgentRoutes);
app.use('/api/growth', growthRoutes);
app.use('/api/adsense', adsenseRoutes);
app.use('/api/clothing', clothingRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/events', eventsRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Start server
async function start() {
  try {
    logger.info(`Starting CRM Maestro API on port ${env.PORT}...`);
    await prisma.$connect();
    logger.info('Database connected');

    initFirebase();
    initSocket(httpServer);
    initCronJobs();
    startGrowthJobs();
    startAdsenseJobs();
    startClothingJobs();
    startAssetJobs();

    httpServer.listen(env.PORT, '0.0.0.0', () => {
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
  stopGrowthJobs();
  stopAdsenseJobs();
  stopClothingJobs();
  stopAssetJobs();
  await prisma.$disconnect();
  httpServer.close();
  process.exit(0);
});
