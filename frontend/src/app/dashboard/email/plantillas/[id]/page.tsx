'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import PlantillaEditor from '@/components/email/PlantillaEditor';

export default function EditarPlantillaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [plantilla, setPlantilla] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiClient.getEmailPlantilla(params.id)
      .then((r) => setPlantilla(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('¿Archivar esta plantilla?')) return;
    try {
      await apiClient.deleteEmailPlantilla(params.id);
      router.push('/dashboard/email/plantillas');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-[var(--text-tertiary)]">Cargando...</div>;
  }

  if (notFound) {
    return (
      <div className="text-center py-12">
        <p className="text-[16px] text-[var(--text-secondary)] mb-4">Plantilla no encontrada</p>
        <Link href="/dashboard/email/plantillas" className="text-violet-500 underline">Volver</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/email/plantillas" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a plantillas
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">{plantilla.nombre}</h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-1 capitalize">{plantilla.softwareId}</p>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-[13px] font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Archivar
        </button>
      </div>
      <PlantillaEditor
        initial={plantilla}
        onSaved={() => router.push('/dashboard/email/plantillas')}
        onCancel={() => router.push('/dashboard/email/plantillas')}
      />
    </div>
  );
}
