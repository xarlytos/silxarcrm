import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const ZADARMA_BASE = 'https://api.zadarma.com';

function buildSignature(method: string, params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');
  const md5 = crypto.createHash('md5').update(queryString).digest('hex');
  const stringToSign = `${method}${queryString}${md5}`;
  const sha1 = crypto
    .createHmac('sha1', env.ZADARMA_SECRET_KEY)
    .update(stringToSign)
    .digest('hex');
  return Buffer.from(`${env.ZADARMA_USER_KEY}:${sha1}`).toString('base64');
}

interface ZadarmaCall {
  from: string;
  to: string;
  sip?: string;
  predicted?: boolean;
}

export async function zadarmaRequest(
  method: string,
  params: Record<string, string | number | boolean>,
  httpMethod: 'GET' | 'POST' = 'GET'
): Promise<any> {
  if (!env.ZADARMA_USER_KEY || !env.ZADARMA_SECRET_KEY) {
    throw new Error('Zadarma no configurado (ZADARMA_USER_KEY / ZADARMA_SECRET_KEY)');
  }

  const stringParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    stringParams[k] = String(v);
  }

  const signature = buildSignature(method, stringParams);
  const sortedKeys = Object.keys(stringParams).sort();
  const queryString = sortedKeys.map((k) => `${k}=${encodeURIComponent(stringParams[k])}`).join('&');

  const url =
    httpMethod === 'GET'
      ? `${ZADARMA_BASE}${method}?${queryString}`
      : `${ZADARMA_BASE}${method}`;

  const headers: Record<string, string> = {
    Authorization: signature,
  };
  if (httpMethod === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const res = await fetch(url, {
    method: httpMethod,
    headers,
    body: httpMethod === 'POST' ? queryString : undefined,
  });

  const data: any = await res.json().catch(() => null);
  if (!res.ok || (data && data.status === 'error')) {
    throw new Error(
      `Zadarma ${method} fallo: ${data?.message || res.statusText} (${res.status})`
    );
  }
  return data;
}

export async function clickToCall({ from, to, sip, predicted = false }: ZadarmaCall) {
  const params: Record<string, string | number | boolean> = {
    from,
    to,
    predicted,
  };
  if (sip) params.sip = sip;
  return zadarmaRequest('/v1/request/callback/', params);
}

export async function getRecordingUrl(callId: string, pbxCallId?: string) {
  const params: Record<string, string> = {};
  if (callId) params.call_id = callId;
  if (pbxCallId) params.pbx_call_id = pbxCallId;
  return zadarmaRequest('/v1/pbx/record/request/', params);
}

export interface ZadarmaWebhookEvent {
  event: string;
  call_id?: string;
  pbx_call_id?: string;
  caller_id?: string;
  called_did?: string;
  destination?: string;
  call_start?: string;
  duration?: string;
  status?: string;
  disposition?: string;
  is_recorded?: string | boolean;
  recording_url?: string;
  custom_data?: string;
  [key: string]: any;
}

export function verifyZadarmaSignature(rawBody: string, signature: string): boolean {
  if (!env.ZADARMA_SECRET_KEY) {
    logger.warn('Zadarma signature check saltado (sin secret)');
    return true;
  }
  const expected = crypto
    .createHmac('sha1', env.ZADARMA_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return signature === expected;
}
