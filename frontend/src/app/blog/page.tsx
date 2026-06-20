'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Calendar, Clock, Tag, ArrowRight, Search } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  keywords: string[];
  type: string;
  publishedAt: string;
  softwareId: string;
  coverImage?: string | null;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const data = await apiClient.getPublicBlogPosts({ limit: '50' });
      setPosts(data.content || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = posts.filter((p) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const typeLabels: Record<string, string> = {
    ARTICLE: 'Artículo',
    FAQ: 'FAQ',
    CASE_STUDY: 'Caso de éxito',
    COMPARISON: 'Comparativa',
    LANDING_PAGE: 'Guía',
  };

  const typeColors: Record<string, string> = {
    ARTICLE: 'bg-blue-100 text-blue-700',
    FAQ: 'bg-purple-100 text-purple-700',
    CASE_STUDY: 'bg-green-100 text-green-700',
    COMPARISON: 'bg-orange-100 text-orange-700',
    LANDING_PAGE: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <div className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="border-b bg-card"
      >
        <div className="max-w-5xl mx-auto px-6 py-8"
        >
          <h1 className="text-3xl font-bold mb-2"
          >Blog</h1
          >
          <p className="text-muted-foreground"
          >Artículos, guías y recursos para hacer crecer tu negocio.</p
          >
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8"
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artículos..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-card"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 rounded-lg border bg-card"
          >
            <option value=""
            >Todos los tipos</option>
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground"
          >Cargando artículos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12"
          >
            <p className="text-muted-foreground"
            >No hay artículos publicados aún.</p>
          </div>
        ) : (
          <div className="grid gap-6"
          >
            {filtered.map((post) => (
              <article key={post.id} className="rounded-xl border bg-card hover:border-primary/50 transition-all overflow-hidden"
              >
                {post.coverImage && (
                  <div className="w-full h-48 overflow-hidden"
                  >
                    <Link href={`/blog/${slugify(post.title)}`}
                    >
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                  </div>
                )}
                <div className="p-6"
                >
                <div className="flex items-center gap-2 mb-3"
                >
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    Articulo
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3"
                    />
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('es-ES') : 'Borrador'}
                  </span>
                </div>

                <h2 className="text-xl font-bold mb-2"
                >
                  <Link href={`/blog/${slugify(post.title)}`} className="hover:text-primary transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>

                <p className="text-muted-foreground mb-4 line-clamp-2"
                >{post.excerpt || 'Sin descripción'}</p>

                <div className="flex items-center justify-between"
                >
                  <div className="flex flex-wrap gap-1"
                  >
                    {post.keywords?.slice(0, 3).map((k, i) => (
                      <span key={i} className="text-xs text-primary"
                      >{k}</span>
                    ))}
                  </div>
                  <Link
                    href={`/blog/${slugify(post.title)}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Leer más <ArrowRight className="w-4 h-4"
                    />
                  </Link>
                </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}
