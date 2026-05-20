'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft,
  Search,
  MapPin,
  ExternalLink,
  Plus,
  Check,
  Loader2,
  Globe,
  Phone,
  MapPinned,
  Building2,
  Users,
} from 'lucide-react';

type Fuente = 'paginas_amarillas' | 'google_maps';

interface LeadResult {
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  web?: string;
  origen: string;
}

export default function BuscarLeadsPage() {
  const params = useParams();
  const router = useRouter();
  const saas = params.saas as string;

  const [fuente, setFuente] = useState<Fuente>('paginas_amarillas');
  const [termino, setTermino] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeadResult[]>([]);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  // Sugerencias de términos según el software
  const sugerencias: Record<string, string[]> = {
    silxar: ['software', 'tecnología', 'marketing digital', 'consultoría IT'],
    gymflow: ['gimnasio', 'fitness', 'centro deportivo', ' CrossFit'],
    barber: ['peluquería', 'barbería', 'salón de belleza', 'estética'],
    consultora: ['consultoría', 'asesoría', 'abogados', 'despacho profesional'],
  };

  const sugerenciasSaas = sugerencias[saas] || ['empresa', 'negocio', 'comercio'];

  const handleBuscar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!termino.trim()) return;

    setLoading(true);
    setResults([]);
    setGoogleMapsUrl('');
    setSelectedIds(new Set());

    try {
      if (fuente === 'google_maps') {
        const res = await apiClient.getBuscarLeadsUrls(termino, ciudad || undefined);
        setGoogleMapsUrl(res.data.google_maps);
      } else {
        const res = await apiClient.buscarLeads(termino, ciudad || undefined, 'paginas_amarillas');
        setResults(res.data.results || []);
      }
    } catch (err: any) {
      alert(err.message || 'Error buscando leads');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((_, i) => i)));
    }
  };

  const importSelected = async () => {
    const toImport = results.filter((_, i) => selectedIds.has(i));
    if (toImport.length === 0) return;

    setImporting(true);
    setImported(0);

    let successCount = 0;
    for (const lead of toImport) {
      try {
        await apiClient.createLead({
          nombre: lead.nombre,
          email: lead.email || '',
          telefono: lead.telefono || '',
          empresa: lead.empresa || lead.nombre,
          direccion: lead.direccion || '',
          pais: 'España',
          origen: `scraping_${lead.origen}`,
          softwareId: saas,
          estado: 'NUEVO',
          prioridad: 'MEDIA',
          notas: lead.sector ? `Sector: ${lead.sector}` : '',
        });
        successCount++;
        setImported(successCount);
      } catch {
        // ignora duplicados u otros errores
      }
    }

    setImporting(false);
    alert(`${successCount} de ${toImport.length} leads importados correctamente`);
    setSelectedIds(new Set());
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/softwares/${saas}`}
          className="p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)] capitalize">
            Buscar leads para {saas}
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] mt-1">
            Encuentra prospectos en Google Maps o Páginas Amarillas
          </p>
        </div>
      </div>

      {/* Fuente selector */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { setFuente('paginas_amarillas'); setResults([]); setGoogleMapsUrl(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium border transition-all ${
              fuente === 'paginas_amarillas'
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300'
                : 'bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Globe className="w-4 h-4" />
            Páginas Amarillas
          </button>
          <button
            onClick={() => { setFuente('google_maps'); setResults([]); setGoogleMapsUrl(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium border transition-all ${
              fuente === 'google_maps'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <MapPinned className="w-4 h-4" />
            Google Maps
          </button>
        </div>

        {/* Formulario de búsqueda */}
        <form onSubmit={handleBuscar} className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12px] font-medium text-[var(--text-tertiary)] mb-1.5">
              Término de búsqueda
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={termino}
                onChange={(e) => setTermino(e.target.value)}
                placeholder="Ej: restaurantes, fontaneros, abogados..."
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-[12px] font-medium text-[var(--text-tertiary)] mb-1.5">
              Ciudad (opcional)
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej: Madrid, Barcelona..."
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !termino.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </div>
        </form>

        {/* Sugerencias */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[var(--text-tertiary)]">Sugerencias:{` `}
          </span>
          {sugerenciasSaas.map((s) => (
            <button
              key={s}
              onClick={() => setTermino(s)}
              className="px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados - Google Maps */}
      {googleMapsUrl && fuente === 'google_maps' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPinned className="w-5 h-5 text-emerald-600" />
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Google Maps</h3>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-[13px] font-medium hover:bg-emerald-500/20 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en nueva pestaña
            </a>
          </div>
          <div className="p-4">
            <p className="text-[13px] text-[var(--text-secondary)] mb-3">
              Google Maps no permite extracción automática de datos. Abre la búsqueda y copia manualmente los negocios que te interesen.
            </p>
            <div className="rounded-xl overflow-hidden border border-[var(--border-primary)]">
              <iframe
                src={googleMapsUrl}
                className="w-full h-[500px]"
                title="Google Maps"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resultados - Páginas Amarillas */}
      {results.length > 0 && fuente === 'paginas_amarillas' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border-primary)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-violet-600" />
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Resultados de Páginas Amarillas</h3>
              <span className="text-[13px] text-[var(--text-tertiary)]">{results.length} encontrados</span>
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={importSelected}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-[13px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Importando {imported}/{selectedIds.size}...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Importar {selectedIds.size} lead{selectedIds.size === 1 ? '' : 's'}
                  </>
                )}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40">
                  <th className="w-10 px-3 py-2.5">
                    <button onClick={selectAll} className="text-[12px] text-violet-600 dark:text-violet-400 font-medium">
                      {selectedIds.size === results.length ? 'Ninguno' : 'Todos'}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Negocio</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden md:table-cell">Contacto</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden lg:table-cell">Dirección</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden xl:table-cell">Sector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {results.map((lead, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      selectedIds.has(idx)
                        ? 'bg-violet-50/60 dark:bg-violet-900/20'
                        : 'hover:bg-[var(--bg-tertiary)]/40'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(idx)}
                          onChange={() => toggleSelect(idx)}
                          className="sr-only peer"
                        />
                        <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          selectedIds.has(idx)
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'
                        }`}>
                          {selectedIds.has(idx) && <Check className="w-3 h-3" strokeWidth={3} />}
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[13px] font-bold">
                          {lead.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">{lead.nombre}</p>
                          {lead.web && (
                            <a
                              href={lead.web}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] text-violet-600 dark:text-violet-400 hover:underline truncate block max-w-[200px]"
                              title={lead.web}
                            >
                              {lead.web.replace(/^https?:\/\//, '').slice(0, 30)}...
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        {lead.telefono ? (
                          <a
                            href={`tel:${lead.telefono}`}
                            className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-violet-600"
                          >
                            <Phone className="w-3 h-3" />
                            {lead.telefono}
                          </a>
                        ) : (
                          <span className="text-[12px] text-[var(--text-tertiary)]">Sin teléfono</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)] mt-0.5 shrink-0" />
                        <span className="text-[13px] text-[var(--text-secondary)]">
                          {lead.direccion || '—'}
                          {lead.ciudad && <span className="text-[var(--text-tertiary)]">, {lead.ciudad}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      {lead.sector ? (
                        <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[11px] font-medium">
                          {lead.sector}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {!loading && results.length === 0 && fuente === 'paginas_amarillas' && termino && !googleMapsUrl && (
        <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
            <Search className="w-7 h-7 text-[var(--text-tertiary)]" />
          </div>
          <p className="text-[16px] font-medium text-[var(--text-secondary)] mb-2">No se encontraron resultados</p>
          <p className="text-[13px] text-[var(--text-tertiary)]">Prueba con otros términos o ciudad</p>
        </div>
      )}
    </div>
  );
}
