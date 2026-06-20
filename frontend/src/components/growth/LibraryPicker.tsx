'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import {
  X,
  Search,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Layers,
  Film,
  Check,
  TrendingUp,
  Library,
} from 'lucide-react';

const ASSET_TYPE_ICON: Record<string, any> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  GIF: Film,
  CAROUSEL: Layers,
  DOCUMENT: FileText,
  AUDIO: Music,
};

const SNIPPET_TYPE_LABEL: Record<string, string> = {
  CAPTION: 'Caption',
  CTA: 'CTA',
  HASHTAG_SET: 'Hashtags',
  BIO: 'Bio',
  RESPONSE: 'Respuesta',
  HOOK: 'Hook',
};

interface MediaAsset {
  id: string;
  nombre: string;
  tipo: string;
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  usoCount: number;
}

interface CopySnippet {
  id: string;
  nombre: string;
  contenido: string;
  tipo: string;
  tags: string[];
  usoCount: number;
}

export default function LibraryPicker({
  mode,
  softwareId,
  onPickMedia,
  onPickCopy,
  onClose,
}: {
  mode: 'media' | 'copy';
  softwareId: string;
  onPickMedia?: (asset: MediaAsset) => void;
  onPickCopy?: (snippet: CopySnippet) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [snippets, setSnippets] = useState<CopySnippet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!softwareId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { softwareId };
      if (search) params.search = search;
      if (mode === 'media') {
        const res = await apiClient.getMediaAssets(params);
        setAssets(res?.assets || []);
      } else {
        const res = await apiClient.getCopySnippets(params);
        setSnippets(res?.snippets || []);
      }
    } catch {
      setAssets([]);
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  }, [softwareId, mode, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  function pickMedia(a: MediaAsset) {
    apiClient.useMediaAsset(a.id).catch(() => {});
    onPickMedia?.(a);
    onClose();
  }

  function pickCopy(s: CopySnippet) {
    apiClient.useCopySnippet(s.id).catch(() => {});
    onPickCopy?.(s);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Library className="w-4 h-4 text-blue-500" />
            {mode === 'media' ? 'Insertar media de la biblioteca' : 'Insertar copy de la biblioteca'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--surface-hover)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border-primary)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar ${mode === 'media' ? 'assets' : 'copys'}...`}
              autoFocus
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] animate-pulse" />
              ))}
            </div>
          ) : mode === 'media' ? (
            assets.length === 0 ? (
              <Empty text="No hay media en la biblioteca para este software." />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {assets.map((a) => {
                  const Icon = ASSET_TYPE_ICON[a.tipo] || ImageIcon;
                  const isImage = a.tipo === 'IMAGE' || a.tipo === 'GIF';
                  return (
                    <button
                      key={a.id}
                      onClick={() => pickMedia(a)}
                      className="group relative rounded-xl border border-[var(--border-primary)] overflow-hidden hover:border-blue-500/60 hover:ring-2 hover:ring-blue-500/20 transition-all text-left"
                    >
                      <div className="aspect-square bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden">
                        {isImage && (a.thumbnailUrl || a.url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.thumbnailUrl || a.url} alt={a.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Icon className="w-8 h-8 text-[var(--text-tertiary)]" />
                        )}
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 flex items-center justify-center transition-colors">
                          <span className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-blue-500 text-white transition-opacity">
                            <Check className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate" title={a.nombre}>{a.nombre}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : snippets.length === 0 ? (
            <Empty text="No hay copys en la biblioteca para este software." />
          ) : (
            <div className="space-y-2">
              {snippets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickCopy(s)}
                  className="group w-full text-left p-3 rounded-xl border border-[var(--border-primary)] hover:border-blue-500/60 hover:ring-2 hover:ring-blue-500/20 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 shrink-0">
                        {SNIPPET_TYPE_LABEL[s.tipo] || s.tipo}
                      </span>
                      <span className="text-sm font-medium truncate">{s.nombre}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)] inline-flex items-center gap-1 shrink-0">
                      <TrendingUp className="w-3 h-3" /> {s.usoCount}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--text-tertiary)] line-clamp-2 whitespace-pre-wrap">{s.contenido}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-[var(--text-tertiary)]">
      {text}
      <div className="mt-2">
        <a href="/dashboard/growth/biblioteca" className="text-blue-500 hover:underline">Ir a la biblioteca</a>
      </div>
    </div>
  );
}
