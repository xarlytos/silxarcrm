'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PlantillaEditor from '@/components/email/PlantillaEditor';
import GeneradorPlantillaIA from '@/components/email/GeneradorPlantillaIA';

export default function NuevaPlantillaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const generarIA = searchParams.get('generar') === 'ia';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/email/plantillas" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a plantillas
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]"
        >
          {generarIA ? 'Generar plantilla con IA' : 'Nueva plantilla'}
        </h1>
        {!generarIA && (
          <p className="text-[14px] text-[var(--text-secondary)] mt-1"
          >
            Usa <code className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono text-[12px]">{'{{nombre}}'}</code>,{' '}
            <code className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono text-[12px]">{'{{empresa}}'}</code>{' '}
            y otras variables para personalizar.
          </p>
        )}
      </div>

      {generarIA ? (
        <GeneradorPlantillaIA
          onSaved={(p) => router.push(`/dashboard/email/plantillas/${p.id}`)}
          onCancel={() => router.push('/dashboard/email/plantillas')}
        />
      ) : (
        <PlantillaEditor
          onSaved={(p) => router.push(`/dashboard/email/plantillas/${p.id}`)}
          onCancel={() => router.push('/dashboard/email/plantillas')}
        />
      )}
    </div>
  );
}
