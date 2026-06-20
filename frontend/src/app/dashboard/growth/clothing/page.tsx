'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Shirt, Sparkles, Send, ExternalLink, Loader2, Package, Globe } from 'lucide-react';

interface Brand {
  id: string;
  nombre: string;
  slug: string;
  domain?: string | null;
  nicho?: string;
  eslogan?: string;
  logoUrl?: string | null;
  colorPrimario: string;
  status: string;
  _count?: { designs: number; products: number };
}
interface Design {
  id: string;
  tema?: string;
  imageUrl?: string | null;
}
interface Product {
  id: string;
  title: string;
  slug: string;
  priceCents: number;
  published: boolean;
  mockups: string[];
  brand?: { nombre: string; slug: string };
}

export default function ClothingNetwork() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [nicho, setNicho] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [domainDrafts, setDomainDrafts] = useState<Record<string, string>>({});

  async function loadAll() {
    const [b, p, s]: any[] = await Promise.all([
      apiClient.getClothingBrands(),
      apiClient.getClothingProducts(),
      apiClient.getClothingStats(),
    ]);
    setBrands(b.brands || []);
    setProducts(p.products || []);
    setStats(s);
  }
  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selectedBrand) apiClient.getClothingDesigns(selectedBrand).then((d: any) => setDesigns(d.designs || []));
    else setDesigns([]);
  }, [selectedBrand]);

  // map slug → domain para los enlaces de preview
  const slugToDomain: Record<string, string | undefined> = {};
  brands.forEach((b) => (slugToDomain[b.slug] = b.domain || undefined));

  async function generateBrand() {
    setBusy('brand');
    try {
      await apiClient.generateClothingBrand(nicho || undefined);
      setNicho('');
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function generateDesigns(brandId: string) {
    setBusy(brandId);
    try {
      await apiClient.generateClothingDesigns(brandId, 3);
      setSelectedBrand(brandId);
      const d: any = await apiClient.getClothingDesigns(brandId);
      setDesigns(d.designs || []);
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function saveDomain(b: Brand) {
    const dom = (domainDrafts[b.id] ?? b.domain ?? '').trim();
    setBusy('dom-' + b.id);
    try {
      await apiClient.updateClothingBrand(b.id, { domain: dom });
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function publishBrand(b: Brand) {
    setBusy('pub-' + b.id);
    try {
      await apiClient.updateClothingBrand(b.id, { status: b.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' });
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function createProduct(designId: string) {
    setBusy(designId);
    try {
      await apiClient.createClothingProduct({ designId });
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function publishProduct(id: string) {
    setBusy(id);
    try {
      await apiClient.publishClothingProduct(id);
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shirt className="w-6 h-6 text-pink-600" /> Red de marcas de ropa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cada marca con su propio dominio. IA genera marca + diseños → Printify → venta sin stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input value={nicho} onChange={(e) => setNicho(e.target.value)} placeholder="Nicho (opcional)"
            className="px-3 py-2 rounded-lg border bg-card text-sm" />
          <button onClick={generateBrand} disabled={busy === 'brand'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-50">
            {busy === 'brand' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generar marca
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Marcas', value: stats.brands },
            { label: 'Productos', value: stats.products },
            { label: 'Publicados', value: stats.published },
            { label: 'Pedidos', value: stats.paidOrders },
            { label: 'Ingresos', value: `${(stats.revenueCents / 100).toFixed(2)} €` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Marcas */}
      <section className="mb-8">
        <h2 className="font-semibold mb-3">Marcas</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {brands.map((b) => (
            <div key={b.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-4">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logoUrl} alt={b.nombre} className="w-14 h-14 rounded-lg object-cover border" />
                ) : (
                  <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: b.colorPrimario }}>
                    {b.nombre[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {b.nombre}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${b.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {b.status === 'PUBLISHED' ? 'live' : 'draft'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{b.eslogan || b.nicho}</div>
                  <div className="text-xs text-muted-foreground mt-1">{b._count?.designs || 0} diseños · {b._count?.products || 0} productos</div>
                </div>
                <button onClick={() => generateDesigns(b.id)} disabled={busy === b.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-50 text-pink-700 text-sm hover:bg-pink-100 disabled:opacity-50 shrink-0">
                  {busy === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Diseños
                </button>
              </div>

              {/* Dominio + publicar */}
              <div className="flex items-center gap-2 mt-3">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  className="flex-1 px-2.5 py-1.5 rounded-lg border bg-background text-xs"
                  placeholder="dominio propio (ej: mimarca.com)"
                  value={domainDrafts[b.id] ?? b.domain ?? ''}
                  onChange={(e) => setDomainDrafts({ ...domainDrafts, [b.id]: e.target.value })}
                />
                <button onClick={() => saveDomain(b)} disabled={busy === 'dom-' + b.id}
                  className="px-2.5 py-1.5 rounded-lg border text-xs hover:bg-gray-50 disabled:opacity-50">
                  {busy === 'dom-' + b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                </button>
                <button onClick={() => publishBrand(b)} disabled={busy === 'pub-' + b.id}
                  className={`px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-50 ${b.status === 'PUBLISHED' ? 'border' : 'bg-pink-600 text-white hover:bg-pink-700'}`}>
                  {b.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                </button>
                {b.status === 'PUBLISHED' && b.domain && (
                  <Link href={`/s/${b.domain}`} target="_blank" className="p-1.5 text-gray-400 hover:text-gray-700">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Diseños de la marca seleccionada */}
      {selectedBrand && designs.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold mb-3">Diseños — convierte en producto</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {designs.map((d) => (
              <div key={d.id} className="rounded-xl border bg-card overflow-hidden">
                {d.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.imageUrl} alt={d.tema || ''} className="w-full aspect-square object-cover" />
                )}
                <div className="p-3">
                  <div className="text-sm font-medium truncate">{d.tema}</div>
                  <button onClick={() => createProduct(d.id)} disabled={busy === d.id}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs hover:bg-gray-50 disabled:opacity-50">
                    <Package className="w-3.5 h-3.5" /> Crear producto
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Productos */}
      <section>
        <h2 className="font-semibold mb-3">Productos</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Aún no hay productos.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {products.map((p) => {
              const domain = p.brand ? slugToDomain[p.brand.slug] : undefined;
              return (
                <div key={p.id} className="rounded-xl border bg-card p-4 flex items-center gap-4">
                  {p.mockups[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.mockups[0]} alt={p.title} className="w-16 h-16 rounded-lg object-cover border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {(p.priceCents / 100).toFixed(2)} € ·{' '}
                      <span className={p.published ? 'text-green-600' : 'text-amber-600'}>
                        {p.published ? 'Publicado' : 'Borrador'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.published && domain && (
                      <Link href={`/s/${domain}/${p.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-gray-700">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    {!p.published && (
                      <button onClick={() => publishProduct(p.id)} disabled={busy === p.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50">
                        <Send className="w-3.5 h-3.5" /> Publicar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
