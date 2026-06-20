import { NextRequest, NextResponse } from 'next/server';

/**
 * Enrutado multi-tenant por dominio.
 * - En los hosts de la propia app (CRM) no se reescribe nada.
 * - Cualquier otro host (un dominio de blog o de tienda) se reescribe a
 *   /s/<host>/... donde se resuelve su contenido contra el backend.
 */

const PUBLIC_FILE = /\.(.*)$/;

/** Hosts que sirven el CRM/panel (NO son tenants) */
function isAppHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.ervok.com') ||
    hostname === 'ervok.com'
  );
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // Hosts de la app → sin reescritura
  if (isAppHost(hostname)) return NextResponse.next();

  // No reescribir internals, la propia ruta /s/ ni ficheros estáticos
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/s/') ||
    url.pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(url.pathname)
  ) {
    return NextResponse.next();
  }

  // Dominio tenant → servir su contenido
  url.pathname = `/s/${host}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api/|_next/|.*\\..*).*)'],
};
