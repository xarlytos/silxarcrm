'use client';

import Script from 'next/script';

/**
 * Carga el script global de Google AdSense para un cliente concreto.
 * En multi-tenant, el `client` (ca-pub-...) viene de la config del sitio.
 * Fallback al env para previews.
 */
export default function AdSenseScript({ client }: { client?: string | null }) {
  const pub = client || process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
  if (!pub) return null;

  return (
    <Script
      id="adsbygoogle-init"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pub}`}
    />
  );
}
