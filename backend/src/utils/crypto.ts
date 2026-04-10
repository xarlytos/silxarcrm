import crypto from 'crypto';

export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function validateSignature(receivedSignature: string, payload: string, secret: string): boolean {
  const expected = `sha256=${generateSignature(payload, secret)}`;
  const received = receivedSignature;

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(received, 'utf8')
  );
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

export function generateTokenPair(): { accessToken: string; refreshToken: string } {
  return {
    accessToken: crypto.randomBytes(32).toString('hex'),
    refreshToken: crypto.randomBytes(64).toString('hex'),
  };
}
