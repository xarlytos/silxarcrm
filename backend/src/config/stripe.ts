import Stripe from 'stripe';
import { env } from './env';

/**
 * Cliente Stripe para la tienda de ropa.
 * Si no hay clave configurada, las llamadas fallarán con un error claro
 * (la tienda es opcional hasta que se configure STRIPE_SECRET_KEY).
 */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  // @ts-ignore — fijamos versión estable; el SDK acepta el override
  apiVersion: '2024-06-20',
});

export const isStripeConfigured = (): boolean => Boolean(env.STRIPE_SECRET_KEY);
