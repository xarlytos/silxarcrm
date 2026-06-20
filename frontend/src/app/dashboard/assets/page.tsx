'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import {
  Package,
  Plus,
  FileText,
  Store,
  Globe,
  BookOpen,
  Loader2,
  RefreshCw,
  ExternalLink,
  Trash2,
  Tag,
  DollarSign,
  LayoutGrid,
  List,
  ShoppingBag,
} from 'lucide-react';
import AssetProjectCard from '@/components/assets/AssetProjectCard';
import CreateProjectModal from '@/components/assets/CreateProjectModal';
import type { AssetProject, AssetProduct, AssetListing, AssetCatalogItem } from '@/types';

type Tab = 'proyectos' | 'productos' | 'etsy' | 'kdp' | 'gumroad' | 'tienda';

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('proyectos');
  const [projects, setProjects] = useState<AssetProject[]>([]);
  const [products, setProducts] = useState<AssetProduct[]>([]);
  const [listings, setListings] = useState<AssetListing[]>([]);
  const [gumroadProducts, setGumroadProducts] = useState<any[]>([]);
  const [gumroadSales, setGumroadSales] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<AssetCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<AssetProject | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [projRes, prodRes, listRes] = await Promise.all([
        apiClient.getAssetProjects(),
        apiClient.getAssetProducts(),
        apiClient.getAssetListings(),
      ]);
      setProjects(projRes.projects || []);
      setProducts(prodRes.products || []);
      setListings(listRes.listings || []);

      // Cargar catalog items
      apiClient.getAssetCatalog().then((res) => {
        setCatalogItems(res.items || []);
      }).catch(() => {});

      // Cargar datos de Gumroad en background (no bloquea)
      apiClient.getGumroadProducts().then((res) => {
        setGumroadProducts(res.products?.products || res.products || []);
      }).catch(() => { /* Gumroad no configurado = ok */ });

      apiClient.getGumroadSales().then((res) => {
        setGumroadSales(res.sales?.sales || res.sales || []);
      }).catch(() => { /* Gumroad no configurado = ok */ });
    } catch (err: any) {
      console.error('Error cargando assets:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateProject(data: { nombre: string; nicho: string; descripcion?: string; keywords: string[] }) {
    setCreating(true);
    try {
      const res = await apiClient.createAssetProject(data);
      setProjects([res.project, ...projects]);
      setModalOpen(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(id: string) {
    try {
      await apiClient.deleteAssetProject(id);
      setProjects(projects.filter((p) => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (err: any) {
      alert('Error eliminando: ' + err.message);
    }
  }

  // Stats
  const totalProjects = projects.length;
  const totalProducts = products.length;
  const etsyListings = listings.filter((l) => l.marketplace === 'ETSY').length;
  const kdpListings = listings.filter((l) => l.marketplace === 'KDP').length;
  const gumroadListings = listings.filter((l) => l.marketplace === 'GUMROAD').length;
  const catalogCount = catalogItems.length;
  const totalSales = catalogItems.reduce((sum, item) => sum + (item.salesCount || 0), 0);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'proyectos', label: 'Proyectos', icon: LayoutGrid },
    { key: 'productos', label: 'Productos', icon: FileText },
    { key: 'tienda', label: 'Tienda', icon: Store },
    { key: 'etsy', label: 'Etsy', icon: Store },
    { key: 'kdp', label: 'KDP', icon: BookOpen },
    { key: 'gumroad', label: 'Gumroad', icon: ShoppingBag },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Asset Factory
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Genera activos digitales para Etsy, KDP y más marketplaces
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-primary)] flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard icon={Package} label="Proyectos" value={totalProjects} color="blue" />
        <StatCard icon={FileText} label="Productos" value={totalProducts} color="violet" />
        <StatCard icon={Store} label="En Tienda" value={catalogCount} color="cyan" />
        <StatCard icon={DollarSign} label="Ventas" value={totalSales} color="green" />
        <StatCard icon={BookOpen} label="KDP" value={kdpListings} color="emerald" />
        <StatCard icon={ShoppingBag} label="Gumroad" value={gumroadListings} color="rose" />
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-primary)]"
      >
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'proyectos' && (
            <ProyectosTab
              projects={projects}
              onDelete={handleDeleteProject}
              onSelect={setSelectedProject}
              selected={selectedProject}
            />
          )}
          {activeTab === 'productos' && <ProductosTab products={products} />}
          {activeTab === 'tienda' && (
            <TiendaTab
              items={catalogItems}
              projects={projects}
              onRefresh={loadData}
            />
          )}
          {activeTab === 'etsy' && <ListingsTab listings={listings.filter((l) => l.marketplace === 'ETSY')} />}
          {activeTab === 'kdp' && <ListingsTab listings={listings.filter((l) => l.marketplace === 'KDP')} />}
          {activeTab === 'gumroad' && (
            <GumroadTab
              listings={listings.filter((l) => l.marketplace === 'GUMROAD')}
              gumroadProducts={gumroadProducts}
              gumroadSales={gumroadSales}
              onSync={loadData}
            />
          )}
        </>
      )}

      {/* Modal */}
      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreateProject}
        loading={creating}
      />
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 via-blue-500/10 to-transparent text-blue-600 dark:text-blue-400',
    violet: 'from-violet-500/20 via-violet-500/10 to-transparent text-violet-600 dark:text-violet-400',
    amber: 'from-amber-500/20 via-amber-500/10 to-transparent text-amber-600 dark:text-amber-400',
    emerald: 'from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-600 dark:text-emerald-400',
    cyan: 'from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-600 dark:text-cyan-400',
    green: 'from-green-500/20 via-green-500/10 to-transparent text-green-600 dark:text-green-400',
    rose: 'from-rose-500/20 via-rose-500/10 to-transparent text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROYECTOS TAB
// ============================================================
function ProyectosTab({
  projects,
  onDelete,
  onSelect,
  selected,
}: {
  projects: AssetProject[];
  onDelete: (id: string) => void;
  onSelect: (p: AssetProject | null) => void;
  selected: AssetProject | null;
}) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16"
      >
        <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
        <p className="text-sm text-[var(--text-secondary)]">No hay proyectos todavía</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Crea tu primer proyecto para empezar a generar assets</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      {/* List */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {projects.map((project) => (
          <AssetProjectCard
            key={project.id}
            project={project}
            onDelete={onDelete}
            onClick={(p) => onSelect(selected?.id === p.id ? null : p)}
          />
        ))}
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-1"
      >
        {selected ? (
          <ProjectDetail project={selected} />
        ) : (
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] border-dashed rounded-xl p-6 text-center"
          >
            <List className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2 opacity-50" />
            <p className="text-sm text-[var(--text-secondary)]">Selecciona un proyecto para ver detalles</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PROJECT DETAIL
// ============================================================
function ProjectDetail({ project }: { project: AssetProject }) {
  const [generating, setGenerating] = useState(false);

  async function handleBulkGenerate() {
    if (!confirm('¿Generar productos para este proyecto?')) return;
    setGenerating(true);
    try {
      await apiClient.bulkGenerateAssets(project.id, ['PDF_PLANNER', 'EXCEL_TRACKER']);
      alert('Productos creados. Recarga la página para verlos.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl p-5 space-y-4"
    >
      <div>
        <h3 className="font-semibold text-[var(--text-primary)]"
        >{project.nombre}</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5"
        >{project.nicho}</p>
      </div>

      {project.descripcion && (
        <p className="text-sm text-[var(--text-secondary)]"
        >{project.descripcion}</p>
      )}

      {project.keywords && project.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1"
        >
          {project.keywords.map((k) => (
            <span key={k} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-xs text-blue-600 dark:text-blue-400"
            >
              {k}
            </span>
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-[var(--border-primary)] space-y-2"
      >
        <button
          onClick={handleBulkGenerate}
          disabled={generating}
          className="w-full h-9 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Generar productos base
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PRODUCTOS TAB
// ============================================================
function ProductosTab({ products }: { products: AssetProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16"
      >
        <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
        <p className="text-sm text-[var(--text-secondary)]">No hay productos generados</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Ve a la pestaña Proyectos y genera productos desde ahí</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl overflow-hidden"
    >
      <table className="w-full text-sm"
      >
        <thead>
          <tr className="border-b border-[var(--border-primary)] text-xs text-[var(--text-tertiary)]"
          >
            <th className="text-left px-4 py-3 font-medium"
            >Producto</th>
            <th className="text-left px-4 py-3 font-medium"
            >Tipo</th>
            <th className="text-left px-4 py-3 font-medium"
            >Estado</th>
            <th className="text-left px-4 py-3 font-medium"
            >Proyecto</th>
            <th className="text-left px-4 py-3 font-medium"
            >Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-primary)]"
        >
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-[var(--surface-hover)] transition-colors"
            >
              <td className="px-4 py-3"
              >
                <div className="font-medium text-[var(--text-primary)]"
                >{product.nombre}</div>
                {product.descripcion && (
                  <div className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]"
                  >{product.descripcion}</div>
                )}
              </td>
              <td className="px-4 py-3"
              >
                <span className="inline-flex px-2 py-0.5 rounded-md bg-violet-500/10 text-xs text-violet-600 dark:text-violet-400"
                >
                  {product.tipo}
                </span>
              </td>
              <td className="px-4 py-3"
              >
                <StatusBadge status={product.status} />
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]"
              >{product.project?.nombre}</td>
              <td className="px-4 py-3"
              >
                <div className="flex items-center gap-1"
                >
                  {product.status === 'DRAFT' && (
                    <button
                      onClick={() => apiClient.generateAssetProduct(product.id).then(() => alert('Generación iniciada'))}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                      title="Generar"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {product.files && product.files.length > 0 && (
                    <a
                      href={product.files[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      title="Descargar"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// LISTINGS TAB
// ============================================================
function ListingsTab({ listings }: { listings: AssetListing[] }) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-16"
      >
        <Store className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
        <p className="text-sm text-[var(--text-secondary)]">No hay listings todavía</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Crea listings desde la ficha de un proyecto</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl overflow-hidden"
    >
      <table className="w-full text-sm"
      >
        <thead>
          <tr className="border-b border-[var(--border-primary)] text-xs text-[var(--text-tertiary)]"
          >
            <th className="text-left px-4 py-3 font-medium"
            >Título</th>
            <th className="text-left px-4 py-3 font-medium"
            >Estado</th>
            <th className="text-left px-4 py-3 font-medium"
            >Precio</th>
            <th className="text-left px-4 py-3 font-medium"
            >Tags</th>
            <th className="text-left px-4 py-3 font-medium"
            >Producto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-primary)]"
        >
          {listings.map((listing) => (
            <tr key={listing.id} className="hover:bg-[var(--surface-hover)] transition-colors"
            >
              <td className="px-4 py-3"
              >
                <div className="font-medium text-[var(--text-primary)]"
                >{listing.title}</div>
                {listing.description && (
                  <div className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]"
                  >{listing.description}</div>
                )}
              </td>
              <td className="px-4 py-3"
              >
                <StatusBadge status={listing.status} />
              </td>
              <td className="px-4 py-3"
              >
                <span className="flex items-center gap-1 text-[var(--text-secondary)]"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  {(listing.priceCents / 100).toFixed(2)}
                </span>
              </td>
              <td className="px-4 py-3"
              >
                <div className="flex flex-wrap gap-1"
                >
                  {listing.tags.slice(0, 3).map((t) => (
                    <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[10px] text-[var(--text-tertiary)]"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {t}
                    </span>
                  ))}
                  {listing.tags.length > 3 && (
                    <span className="text-[10px] text-[var(--text-tertiary)]"
                    >+{listing.tags.length - 3}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]"
              >
                {listing.product?.nombre || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    GENERATING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    READY: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    PUBLISHED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    ERROR: 'bg-red-500/10 text-red-600 dark:text-red-400',
    ARCHIVED: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${map[status] || map.DRAFT}`}
    >
      {status}
    </span>
  );
}

// ============================================================
// TIENDA TAB
// ============================================================
function TiendaTab({
  items,
  projects,
  onRefresh,
}: {
  items: AssetCatalogItem[];
  projects: AssetProject[];
  onRefresh: () => void;
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [title, setTitle] = useState('');
  const [assetType, setAssetType] = useState('PDF_PLANNER');
  const [priceCents, setPriceCents] = useState(499);

  async function handleGeneratePreview(id: string) {
    setGenerating(id);
    try {
      await apiClient.generatePreview(id);
      alert('Preview generada. Recarga para verla.');
      onRefresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGenerating(null);
    }
  }

  async function handlePublishGumroad(id: string) {
    setPublishing(id);
    try {
      await apiClient.publishCatalogToGumroad(id);
      alert('Publicado en Gumroad. Recarga para verlo.');
      onRefresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setPublishing(null);
    }
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || !title || !assetType) return;
    setCreatingItem(true);
    try {
      await apiClient.createAssetCatalogItem({
        projectId: selectedProject,
        title,
        assetType,
        priceCents,
      });
      setTitle('');
      setSelectedProject('');
      onRefresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setCreatingItem(false);
    }
  }

  const assetTypes = [
    'PDF_PLANNER', 'PDF_JOURNAL', 'PDF_TRACKER', 'PDF_COLORING_BOOK',
    'EXCEL_TRACKER', 'EXCEL_BUDGET', 'EXCEL_PLANNER',
    'SVG_BUNDLE', 'STICKER_SHEET', 'NOTION_TEMPLATE', 'CANVA_TEMPLATE',
  ];

  return (
    <div className="space-y-6">
      {/* Crear item */}
      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Añadir producto a la tienda</h3>
        <form onSubmit={handleCreateItem} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Proyecto</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
              required
            >
              <option value="">Selecciona...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej: Fitness Planner 2026"
              className="w-full h-9 px-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              required
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Tipo</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
            >
              {assetTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Precio ($)</label>
            <input
              type="number"
              value={priceCents / 100}
              onChange={(e) => setPriceCents(Math.round(parseFloat(e.target.value) * 100))}
              min={0.99}
              step={0.01}
              className="w-full h-9 px-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
            />
          </div>
          <button
            type="submit"
            disabled={creatingItem}
            className="h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {creatingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Añadir
          </button>
        </form>
      </div>

      {/* Grid de items */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Store className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
          <p className="text-sm text-[var(--text-secondary)]">La tienda está vacía</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Añade productos arriba y genera previews con IA</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl overflow-hidden group hover:border-blue-500/40 transition-all"
            >
              {/* Preview image */}
              <div className="aspect-square bg-[var(--bg-secondary)] relative overflow-hidden"
              >
                {item.previewImage ? (
                  <img
                    src={item.previewImage}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-tertiary)]"
                  >
                    <FileText className="w-12 h-12 opacity-30" />
                  </div>
                )}
                {item.isPublished && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase"
                  >
                    Publicado
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4 space-y-2"
              >
                <h4 className="font-semibold text-[var(--text-primary)] text-sm truncate"
                >{item.title}</h4>
                <p className="text-xs text-[var(--text-tertiary)]"
                >{item.assetType}</p>
                <div className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)]"
                  >${(item.priceCents / 100).toFixed(2)} {item.currency}</span>
                  <span className="text-xs text-[var(--text-tertiary)]"
                  >{item.salesCount || 0} ventas</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2"
                >
                  {!item.previewImage && (
                    <button
                      onClick={() => handleGeneratePreview(item.id)}
                      disabled={generating === item.id}
                      className="flex-1 h-8 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {generating === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Generar Preview'}
                    </button>
                  )}
                  {item.previewImage && !item.isPublished && (
                    <button
                      onClick={() => handlePublishGumroad(item.id)}
                      disabled={publishing === item.id}
                      className="flex-1 h-8 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {publishing === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Publicar en Gumroad'}
                    </button>
                  )}
                  {item.gumroadUrl && (
                    <a
                      href={item.gumroadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-lg text-xs font-medium border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// GUMROAD TAB
// ============================================================
function GumroadTab({
  listings,
  gumroadProducts,
  gumroadSales,
  onSync,
}: {
  listings: AssetListing[];
  gumroadProducts: any[];
  gumroadSales: any[];
  onSync: () => void;
}) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await apiClient.syncGumroad();
      onSync();
    } catch (err: any) {
      alert('Error sincronizando: ' + err.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6"
    >
      {/* Actions */}
      <div className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4"
        >
          <div className="text-sm"
          >
            <span className="text-[var(--text-tertiary)]"
            >Productos en Gumroad:</span>{' '}
            <span className="font-semibold text-[var(--text-primary)]"
            >{gumroadProducts.length}</span>
          </div>
          <div className="text-sm"
          >
            <span className="text-[var(--text-tertiary)]"
            >Ventas:</span>{' '}
            <span className="font-semibold text-[var(--text-primary)]"
            >{gumroadSales.length}</span>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="h-9 px-4 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 transition-all"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar con Gumroad
        </button>
      </div>

      {/* Listings locales vinculados */}
      {listings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3"
          >Listings vinculados</h3>
          <ListingsTab listings={listings} />
        </div>
      )}

      {/* Productos de Gumroad */}
      {gumroadProducts.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3"
          >Productos en Gumroad</h3>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl overflow-hidden"
          >
            <table className="w-full text-sm"
            >
              <thead>
                <tr className="border-b border-[var(--border-primary)] text-xs text-[var(--text-tertiary)]"
                >
                  <th className="text-left px-4 py-3 font-medium"
                  >Nombre</th>
                  <th className="text-left px-4 py-3 font-medium"
                  >Precio</th>
                  <th className="text-left px-4 py-3 font-medium"
                  >Ventas</th>
                  <th className="text-left px-4 py-3 font-medium"
                  >URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]"
              >
                {gumroadProducts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <td className="px-4 py-3"
                    >
                      <div className="font-medium text-[var(--text-primary)]"
                      >{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-[var(--text-tertiary)] truncate max-w-[250px]"
                        >{p.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]"
                    >
                      ${(p.price / 100).toFixed(2)} {p.currency}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]"
                    >
                      {p.sales_count || 0}
                    </td>
                    <td className="px-4 py-3"
                    >
                      {p.short_url && (
                        <a
                          href={p.short_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16"
        >
          <ShoppingBag className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
          <p className="text-sm text-[var(--text-secondary)]"
          >No hay productos de Gumroad sincronizados</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1"
          >Configura GUMROAD_ACCESS_TOKEN y presiona Sincronizar</p>
        </div>
      )}

      {/* Ventas recientes */}
      {gumroadSales.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3"
          >Ventas recientes</h3>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl overflow-hidden"
          >
            <table className="w-full text-sm"
            >
              <thead>
                <tr className="border-b border-[var(--border-primary)] text-xs text-[var(--text-tertiary)]"
                >
                  <th className="text-left px-4 py-3 font-medium"
                  >Producto</th>
                  <th className="text-left px-4 py-3 font-medium"
                  >Email</th>
                  <th className="text-left px-4 py-3 font-medium"
                  >Monto</th>
                  <th className="text-left px-4 py-3 font-medium"
                  >Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]"
              >
                {gumroadSales.slice(0, 20).map((s: any, i: number) => (
                  <tr key={i} className="hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]"
                    >{s.product_name || '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]"
                    >{s.email || '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]"
                    >
                      ${(s.price / 100).toFixed(2)} {s.currency}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-tertiary)]"
                    >
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
