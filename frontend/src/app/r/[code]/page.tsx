'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Gift, Check, Star, Users, ArrowRight, Loader2 } from 'lucide-react';

interface ReferralData {
  code: string;
  software: {
    nombre: string;
    tagline: string;
    descripcion: string;
    colorPrimario: string;
    logoUrl: string;
    urlWebsite: string;
  };
  referrerName: string;
  rewardType: string;
  rewardValue: number;
  doubleReward: boolean;
}

export default function ReferralLandingPage() {
  const params = useParams();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.code]);

  async function loadData() {
    try {
      const result = await apiClient.getPublicReferralData(params.code as string);
      setData(result);
    } catch {
      setError('Enlace de referido no válido o expirado');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !nombre) return;

    setSubmitting(true);
    try {
      await apiClient.createInboundLead({
        nombre,
        email,
        empresa,
        source: `referral_${params.code}`,
        softwareId: data?.software?.nombre || 'default',
      });
      setSubmitted(true);
    } catch {
      alert('Error al enviar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎁</div>
          <p className="text-muted-foreground">{error || 'Algo salió mal'}</p>
        </div>
      </div>
    );
  }

  const rewardLabels: Record<string, string> = {
    months_free: `${data.rewardValue} mes${data.rewardValue > 1 ? 'es' : ''} gratis`,
    discount_percentage: `${data.rewardValue}% de descuento`,
    credit_amount: `€${data.rewardValue} de crédito`,
    feature_access: 'Feature premium incluida',
  };

  const rewardText = rewardLabels[data.rewardType] || `${data.rewardValue} recompensa`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30"
    >
      <div className="max-w-lg mx-auto px-6 py-12"
      >
        {/* Header */}
        <div className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-4"
          >
            <Gift className="w-4 h-4" />
            Tienes un regalo esperando
          </div>

          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold"
            style={{ backgroundColor: data.software.colorPrimario || '#6366F1' }}
          >
            {data.software.nombre?.charAt(0) || '?'}
          </div>

          <h1 className="text-3xl font-bold mb-2"
          >{data.software.nombre}</h1>
          <p className="text-muted-foreground"
          >{data.software.tagline}</p>
        </div>

        {/* Reward Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 mb-8"
        >
          <div className="flex items-center gap-3 mb-3"
          >
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center"
            >
              <Star className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground"
              >Recomendado por {data.referrerName}</p>
              <p className="font-bold text-lg"
003eConsigue {rewardText}</p>
            </div>
          </div>

          {data.doubleReward && (
            <p className="text-sm text-muted-foreground"
            >
              🎉 Ambos ganáis: tú y {data.referrerName} recibís la recompensa
            </p>
          )}
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-8"
        >
          {[
            'Gestión simplificada de tu negocio',
            'Ahorra horas cada semana',
            'Soporte prioritario incluido',
            'Sin compromiso, cancela cuando quieras',
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"
              >
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        {submitted ? (
          <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-200 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">¡Gracias! 🎉</h3>
            <p className="text-muted-foreground">
              Hemos recibido tu solicitud. Te contactaremos pronto con tu {rewardText}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Empresa (opcional)</label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Nombre de tu negocio"
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: data.software.colorPrimario || '#6366F1' }}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Reclamar {rewardText}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8"
        >
          Al registrarte, aceptas los términos de servicio.
          {data.software.urlWebsite && (
            <>
              {' '}
              <a href={data.software.urlWebsite} className="underline">
                Más información
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
