'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import PostGenerator from '@/components/growth/PostGenerator';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GenerarPostsPage() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);

  useEffect(() => {
    loadSoftwares();
  }, []);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) setSoftwareId(list[0].id);
    } catch { }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/growth"
            className="p-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Generar Posts con IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Crea contenido optimizado para cada red social en segundos.
            </p>
          </div>
        </div>
        <select
          value={softwareId}
          onChange={(e) => setSoftwareId(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-card"
        >
          {softwares.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {softwareId && <PostGenerator softwareId={softwareId} />}
    </div>
  );
}
