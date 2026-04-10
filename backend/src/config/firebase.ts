import admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

export function initFirebase(): void {
  if (firebaseApp) return;

  try {
    if (env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    } else {
      logger.warn('Firebase not configured - push notifications disabled');
      return;
    }
    logger.info('Firebase initialized');
  } catch (error) {
    logger.error('Firebase init error:', error);
  }
}

export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  if (!firebaseApp) return null;
  return admin.messaging();
}
