'use client';

import { useEffect } from 'react';

interface AdSlotProps {
  client?: string | null; // ca-pub-... del sitio
  slot?: string | null; // id del bloque de anuncio
  format?: string;
  className?: string;
}

/**
 * Bloque de anuncio AdSense. El client/slot vienen de la config del sitio
 * (multi-tenant). Si no hay client, muestra un placeholder.
 */
export default function AdSlot({ client, slot, format = 'auto', className }: AdSlotProps) {
  const pub = client || process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';

  useEffect(() => {
    if (!pub) return;
    try {
      // @ts-ignore — adsbygoogle lo inyecta el script global
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* noop */
    }
  }, [pub]);

  if (!pub || !slot) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 ${className || ''}`}
        style={{ minHeight: 90 }}
      >
        Espacio publicitario
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className || ''}`}
      style={{ display: 'block' }}
      data-ad-client={pub}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
