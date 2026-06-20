import { headers } from 'next/headers';

/** robots.txt host-aware: apunta al sitemap del propio dominio. */
export async function GET() {
  const host = (await headers()).get('host') || '';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const body = `User-agent: *
Allow: /

Sitemap: ${proto}://${host}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
