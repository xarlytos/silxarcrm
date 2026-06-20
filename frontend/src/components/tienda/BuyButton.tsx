'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface Variant {
  id: number;
  title?: string;
  is_enabled?: boolean;
}

export default function BuyButton({
  productId,
  variants,
}: {
  productId: string;
  variants?: Variant[] | null;
}) {
  const vs = Array.isArray(variants) ? variants.filter((v) => v.is_enabled !== false) : [];
  const [variantId, setVariantId] = useState<string>(vs[0] ? String(vs[0].id) : '');
  const [buying, setBuying] = useState(false);

  async function buy() {
    setBuying(true);
    try {
      const res: any = await apiClient.createClothingCheckout({
        productId,
        variantId: variantId || undefined,
      });
      if (res.url) window.location.href = res.url;
      else throw new Error('No se pudo iniciar el pago');
    } catch (e: any) {
      alert(e.message);
      setBuying(false);
    }
  }

  return (
    <div>
      {vs.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Variante</label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-white"
          >
            {vs.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title || `Variante ${v.id}`}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        onClick={buy}
        disabled={buying}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {buying && <Loader2 className="w-4 h-4 animate-spin" />}
        Comprar
      </button>
      <p className="text-xs text-gray-400 mt-3 text-center">
        Pago seguro con Stripe · Envío bajo demanda (print-on-demand)
      </p>
    </div>
  );
}
