import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { signToken, signRefreshToken, verifyToken } from '../utils/jwt';
import { authLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña requeridos' });
      return;
    }

    const user = await prisma.usuarioCrm.findUnique({ where: { email } });
    if (!user || !user.activo) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const payload = { userId: user.id, email: user.email, rol: user.rol };
    const accessToken = signToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.usuarioCrm.update({
      where: { id: user.id },
      data: { ultimoLogin: new Date(), ultimoLoginIp: req.ip },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token requerido' });
      return;
    }

    const decoded = verifyToken(refreshToken);
    const user = await prisma.usuarioCrm.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.activo) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    const payload = { userId: user.id, email: user.email, rol: user.rol };
    const newAccessToken = signToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
});

router.post('/logout', authMiddleware, (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Sesión cerrada' });
});

router.post('/register-fcm', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      res.status(400).json({ error: 'FCM token requerido' });
      return;
    }

    await prisma.usuarioCrm.update({
      where: { id: req.user!.userId },
      data: { fcmToken },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('FCM register error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.usuarioCrm.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, nombre: true, rol: true, notificacionesActivas: true },
  });
  res.json({ success: true, data: user });
});

export default router;
