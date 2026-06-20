import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdSenseScript from '@/components/ads/AdSenseScript';
import AdSlot from '@/components/ads/AdSlot';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function resolve(domain: string) {
  const res = await fetch(`${API}/api/sites/resolve?domain=${encodeURIComponent(domain)}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function getArticles(domain: string) {
  const res = await fetch(`${API}/api/adsense/public/articles?domain=${encodeURIComponent(domain)}&limit=30`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) return [];
  return (await res.json()).articles || [];
}

export async function generateMetadata({ params }: { params: { domain: string } }) {
  const data = await resolve(params.domain);
  if (!data) return { title: 'Sitio' };
  if (data.type === 'blog') return { title: data.site.nombre, description: data.site.descripcion };
  return { title: data.brand.nombre, description: data.brand.eslogan };
}

export default async function TenantHome({ params }: { params: { domain: string } }) {
  const data = await resolve(params.domain);
  if (!data) notFound();

  if (data.type === 'blog') {
    const { site, niches } = data;
    const articles = await getArticles(params.domain);
    const slots: any = site.adsenseSlots || {};
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <AdSenseScript client={site.adsenseClient} />
        <header className="border-b">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold" style={{ color: site.colorPrimario }}>
              {site.nombre}
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">
          {site.descripcion && <p className="text-gray-500 mb-8">{site.descripcion}</p>}
          {niches.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {niches.map((n: any) => (
                <span key={n.id} className="px-3 py-1.5 rounded-full border text-sm">
                  {n.nombre}
                </span>
              ))}
            </div>
          )}
          <AdSlot client={site.adsenseClient} slot={slots.list} className="mb-10" />
          {articles.length === 0 ? (
            <p className="text-gray-400 py-12 text-center">Aún no hay artículos publicados.</p>
          ) : (
            <div className="grid gap-8">
              {articles.map((a: any, i: number) => (
                <div key={a.id}>
                  <article className="border-b pb-8">
                    {a.niche && (
                      <span className="text-xs uppercase tracking-wide font-medium" style={{ color: site.colorPrimario }}>
                        {a.niche.nombre}
                      </span>
                    )}
                    <h2 className="text-2xl font-bold mt-1 mb-2">
                      <Link href={`/${a.slug}`}>{a.title}</Link>
                    </h2>
                    <p className="text-gray-600 mb-3">{a.excerpt}</p>
                    <Link href={`/${a.slug}`} className="text-sm font-medium" style={{ color: site.colorPrimario }}>
                      Leer artículo →
                    </Link>
                  </article>
                  {(i + 1) % 3 === 0 && <AdSlot client={site.adsenseClient} slot={slots.infeed} className="my-8" />}
                </div>
              ))}
            </div>
          )}
        </main>
        <footer className="border-t mt-16">
          <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-gray-400 flex justify-between">
            <span>© {new Date().getFullYear()} {site.nombre}</span>
            <Link href="/privacidad" className="hover:text-gray-700">Privacidad</Link>
          </div>
        </footer>
      </div>
    );
  }

  // === STORE ===
  const { brand, products } = data;
  return (
    <div className="min-h-screen bg-white" style={{ color: brand.colorPrimario }}>
      <header className="border-b" style={{ borderColor: brand.colorPrimario + '20' }}>
        <div className="max-w-5xl mx-auto px-6 py-8 text-center">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.nombre} className="w-20 h-20 mx-auto rounded-xl object-cover mb-4" />
          )}
          <h1 className="text-3xl font-bold">{brand.nombre}</h1>
          {brand.eslogan && <p className="mt-2 opacity-70">{brand.eslogan}</p>}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        {products.length === 0 ? (
          <p className="text-center opacity-60 py-12">Próximamente nuevos productos.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((p: any) => (
              <Link key={p.id} href={`/${p.slug}`} className="group">
                <div className="rounded-xl overflow-hidden border bg-gray-50 aspect-square">
                  {p.mockups?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.mockups[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </div>
                <div className="mt-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="opacity-70 text-sm">{(p.priceCents / 100).toFixed(2)} {p.currency}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
