import { type NextRequest, NextResponse } from 'next/server';
import { isStatusHost } from './lib/status/site';
import { updateSession } from './lib/supabase/middleware';

const STATUS_HOST_PATHS = new Set(['/status', '/api/status', '/robots.txt', '/sitemap.xml']);
const PUBLIC_PATHS = new Set(['/status', '/api/status', '/robots.txt']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStatusHost(request.headers.get('host'))) {
    if (STATUS_HOST_PATHS.has(pathname)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/status';
    url.search = '';
    return NextResponse.rewrite(url);
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
