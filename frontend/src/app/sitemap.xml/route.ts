import { headers } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** sitemap.xml host-aware: el sitemap del dominio que lo pide. */
export async function GET() {
  const host = (await headers()).get('host') || '';
  const hostname = host.split(':')[0];

  try {
    const res = await fetch(`${API}/api/adsense/public/sitemap.xml?domain=${encodeURIComponent(hostname)}`, {
      next: { revalidate: 600 },
    });
    const xml = await res.text();
    return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
  } catch {
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      { headers: { 'Content-Type': 'application/xml' } }
    );
  }
}
