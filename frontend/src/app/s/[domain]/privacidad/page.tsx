import Link from 'next/link';

export const metadata = { title: 'Política de privacidad y cookies' };

export default function Privacidad({ params }: { params: { domain: string } }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="prose prose-lg max-w-2xl mx-auto px-6 py-10">
        <Link href="/" className="text-sm text-gray-400 no-underline">← Inicio</Link>
        <h1>Política de privacidad y cookies</h1>
        <p>
          En {params.domain} utilizamos cookies propias y de terceros para analizar el tráfico y mostrar
          publicidad. Al continuar navegando aceptas su uso.
        </p>
        <h2>Publicidad — Google AdSense</h2>
        <p>
          Este sitio utiliza Google AdSense. Google y sus socios usan cookies para mostrar anuncios basados
          en visitas previas a este u otros sitios. Puedes inhabilitar la publicidad personalizada en la{' '}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
            Configuración de anuncios de Google
          </a>
          . Más información en{' '}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            policies.google.com/technologies/partner-sites
          </a>
          .
        </p>
        <h2>Contacto</h2>
        <p>Para cualquier duda sobre esta política, contáctanos a través de los canales del sitio.</p>
      </div>
    </div>
  );
}
