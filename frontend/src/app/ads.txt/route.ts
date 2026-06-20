import { headers } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * ads.txt host-aware: cada dominio devuelve su propio Publisher ID de AdSense.
 * Requisito de AdSense para verificar la propiedad del inventario.
 */
export async function GET() {
  const host = (await headers()).get('host') || '';
  const hostname = host.split(':')[0];

  let pub = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
  try {
    const res = await fetch(`${API}/api/adsense/public/site?domain=${encodeURIComponent(hostname)}`, {
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.site?.adsenseClient) pub = data.site.adsenseClient;
    }
  } catch {
    /* fallback al env */
  }

  // pub viene como ca-pub-XXXX; ads.txt usa solo pub-XXXX
  const pubId = pub.replace(/^ca-/, '');
  const body = pubId
    ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`
    : '# Sin AdSense configurado para este dominio\n';

  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
