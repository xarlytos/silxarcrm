'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Download } from 'lucide-react';
import Link from 'next/link';

export default function ImportarLeadsPage() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<{ saas: string; descripcion?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ creados: number; duplicados: number; errores: number } | null>(null);

  useEffect(() => {
    apiClient.getSaasList()
      .then((res) => setSoftwares(res.data))
      .catch(() => setSoftwares([]));
  }, []);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFile = useCallback((f: File) => {
    if (f.type !== 'text/csv' && !f.name.endsWith('.csv')) {
      alert('El archivo debe ser CSV');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPreview(parseCSV(text).slice(0, 11));
    };
    reader.readAsText(f);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!file || !softwareId) {
      alert('Selecciona un archivo y un software');
      return;
    }
    setLoading(true);
    try {
      const text = await file.text();
      const res = await apiClient.importLeadsCSV(text, softwareId);
      setResult(res.data);
    } catch (err: any) {
      alert(err.message || 'Error importando CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/leads"
          className="p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
            Importar leads
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] mt-1">
            Sube un archivo CSV con tus prospectos
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 space-y-6">
        {/* Software selector */}
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
            Software destino *
          </label>
          <select
            value={softwareId}
            onChange={(e) => setSoftwareId(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          >
            <option value="">Seleccionar software...</option>
            {softwares.map((s) => (
              <option key={s.saas} value={s.saas}>{s.saas}</option>
            ))}
          </select>
        </div>

        {/* Template download */}
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/leads/plantilla-csv`}
          download
          className="inline-flex items-center gap-2 text-[14px] font-medium text-violet-600 dark:text-violet-400 hover:underline"
        >
          <Download className="w-4 h-4" />
          Descargar plantilla CSV
        </a>

        {/* Drop zone */}
        {!result && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-input')?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-violet-500 bg-violet-50/30 dark:bg-violet-900/10'
                : 'border-[var(--border-primary)] hover:border-[var(--text-tertiary)]'
            }`}
          >
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-[15px] font-medium text-[var(--text-primary)]">
              Arrastra un archivo CSV aquí
            </p>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
              O haz clic para seleccionar
            </p>
            {file && (
              <p className="text-[13px] text-violet-600 dark:text-violet-400 mt-2 font-medium">
                {file.name}
              </p>
            )}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && !result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[var(--text-secondary)]" />
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Vista previa
              </h3>
              <span className="text-[12px] text-[var(--text-tertiary)]">
                (primeras 10 filas)
              </span>
            </div>
            <div className="overflow-x-auto border border-[var(--border-primary)] rounded-xl">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-primary)]">
                    {preview[0].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left font-medium text-[var(--text-secondary)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-primary)]">
                  {preview.slice(1).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2.5 text-[var(--text-primary)] truncate max-w-[200px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleImport}
              disabled={loading || !softwareId}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
            >
              {loading ? 'Importando...' : 'Confirmar importación'}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Resultado de la importación
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.creados}</p>
                <p className="text-[13px] text-emerald-600 dark:text-emerald-400">Creados</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{result.duplicados}</p>
                <p className="text-[13px] text-amber-600 dark:text-amber-400">Duplicados</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result.errores}</p>
                <p className="text-[13px] text-red-600 dark:text-red-400">Errores</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard/leads')}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                Ver leads
              </button>
              <button
                onClick={() => { setResult(null); setFile(null); setPreview([]); }}
                className="flex-1 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
              >
                Importar otro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
