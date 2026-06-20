'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Calendar, Clock, Tag, Share2 } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  keywords: string[];
  type: string;
  publishedAt: string;
  coverImage?: string | null;
}

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPost();
  }, [params.slug]);

  async function loadPost() {
    setLoading(true);
    try {
      // Por ahora, buscamos por cualquier artículo publicado
      // En producción, buscaríamos por slug exacto
      const data = await apiClient.getPublicBlogPost(params.slug as string);
      setPost(data);
    } catch {
      setError('Artículo no encontrado');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
      >
        <div className="text-muted-foreground"
        >Cargando artículo...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center"
        >
          <p className="text-muted-foreground mb-4"
          >{error || 'Artículo no encontrado'}</p>
          <Link href="/blog" className="text-primary hover:underline"
          >
            ← Volver al blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="border-b bg-card"
      >
        {post.coverImage && (
          <div className="w-full h-72 md:h-96 overflow-hidden"
          >
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="max-w-3xl mx-auto px-6 py-8"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4"
            />
            Volver al blog
          </Link>

          <div className="flex items-center gap-2 mb-4"
          >
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              Articulo
            </span>
            <span className="text-sm text-muted-foreground flex items-center gap-1"
            >
              <Calendar className="w-3 h-3"
              />
              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('es-ES') : ''}
            </span>
          </div>

          <h1 className="text-3xl font-bold mb-4"
          >{post.title}</h1>

          {post.excerpt && (
            <p className="text-lg text-muted-foreground"
            >{post.excerpt}</p>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8"
      >
        <article className="prose prose-lg max-w-none dark:prose-invert"
        >
          <div className="whitespace-pre-wrap"
          >{post.body}</div>
        </article>

        {/* Tags */}
        {post.keywords?.length > 0 && (
          <div className="mt-8 pt-8 border-t"
          >
            <div className="flex items-center gap-2 mb-3"
            >
              <Tag className="w-4 h-4 text-muted-foreground"
              />
              <span className="text-sm font-medium"
              >Tags</span>
            </div>
            <div className="flex flex-wrap gap-2"
            >
              {post.keywords.map((k, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-muted text-sm"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Share */}
        <div className="mt-8 pt-8 border-t"
        >
          <div className="flex items-center gap-4"
          >
            <span className="text-sm font-medium"
            >Compartir:</span>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.excerpt,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
            >
              <Share2 className="w-4 h-4"
              />
              Copiar link
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
