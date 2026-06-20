import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdSenseScript from '@/components/ads/AdSenseScript';
import AdSlot from '@/components/ads/AdSlot';
import BuyButton from '@/components/tienda/BuyButton';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function resolve(domain: string) {
  const res = await fetch(`${API}/api/sites/resolve?domain=${encodeURIComponent(domain)}`, { next: { revalidate: 120 } });
  return res.ok ? res.json() : null;
}
async function getArticle(slug: string) {
  const res = await fetch(`${API}/api/adsense/public/articles/${slug}`, { next: { revalidate: 60 } });
  return res.ok ? (await res.json()).article : null;
}
async function getProduct(slug: string) {
  const res = await fetch(`${API}/api/clothing/public/products/${slug}`, { next: { revalidate: 60 } });
  return res.ok ? (await res.json()).product : null;
}

/** Parte el HTML tras el segundo <h2> para intercalar un anuncio */
function splitBody(html: string): [string, string] {
  const first = html.indexOf('</h2>');
  if (first === -1) return [html, ''];
  const second = html.indexOf('</h2>', first + 5);
  const cut = second === -1 ? first + 5 : second + 5;
  return [html.slice(0, cut), html.slice(cut)];
}

export async function generateMetadata({ params }: { params: { domain: string; slug: string } }) {
  const data = await resolve(params.domain);
  if (data?.type === 'store') {
    const p = await getProduct(params.slug);
    return p ? { title: p.title, description: p.description } : { title: 'Producto' };
  }
  const a = await getArticle(params.slug);
  return a ? { title: a.title, description: a.excerpt } : { title: 'Artículo' };
}

export default async function TenantDetail({ params }: { params: { domain: string; slug: string } }) {
  const data = await resolve(params.domain);
  if (!data) notFound();

  // === STORE: producto ===
  if (data.type === 'store') {
    const product = await getProduct(params.slug);
    if (!product) notFound();
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">← {data.brand.nombre}</Link>
          <div className="grid md:grid-cols-2 gap-10 mt-6">
            <div className="rounded-xl overflow-hidden border bg-gray-50 aspect-square">
              {product.mockups?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.mockups[0]} alt={product.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{product.title}</h1>
              <div className="text-2xl mt-3">{(product.priceCents / 100).toFixed(2)} {product.currency}</div>
              {product.description && <p className="text-gray-600 mt-4 whitespace-pre-line">{product.description}</p>}
              <div className="mt-6">
                <BuyButton productId={product.id} variants={product.variants} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === BLOG: artículo ===
  const article = await getArticle(params.slug);
  if (!article) notFound();
  const site = data.site;
  const slots: any = site.adsenseSlots || {};
  const [first, rest] = splitBody(article.body || '');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <AdSenseScript client={site.adsenseClient} />
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <Link href="/" className="text-xl font-bold" style={{ color: site.colorPrimario }}>
            {site.nombre}
          </Link>
        </div>
      </header>
      <article className="max-w-2xl mx-auto px-6 py-10">
        {article.niche && (
          <span className="text-xs uppercase tracking-wide font-medium" style={{ color: site.colorPrimario }}>
            {article.niche.nombre}
          </span>
        )}
        <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4 leading-tight">{article.title}</h1>
        {article.publishedAt && (
          <p className="text-sm text-gray-400 mb-8">
            {new Date(article.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        <AdSlot client={site.adsenseClient} slot={slots.article} className="mb-8" />
        <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: first }} />
        {rest && (
          <>
            <AdSlot client={site.adsenseClient} slot={slots.article} className="my-8" />
            <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: rest }} />
          </>
        )}
        <AdSlot client={site.adsenseClient} slot={slots.article} className="mt-10" />
      </article>
    </div>
  );
}
