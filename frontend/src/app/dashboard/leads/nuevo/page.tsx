'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import LeadForm from '@/components/leads/LeadForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NuevoLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const softwareParam = searchParams.get('software');
  const [softwares, setSoftwares] = useState<{ saas: string; descripcion?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.getSaasList()
      .then((res) => setSoftwares(res.data))
      .catch(() => setSoftwares([]));
  }, []);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await apiClient.createLead(data);
      router.push('/dashboard/leads');
    } catch (err: any) {
      alert(err.message || 'Error creando lead');
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
            Nuevo lead
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] mt-1">
            Completa la información del prospecto
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
        <LeadForm
          initial={{ softwareId: softwareParam || undefined }}
          softwares={softwares}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/leads')}
          loading={loading}
        />
      </div>
    </div>
  );
}
