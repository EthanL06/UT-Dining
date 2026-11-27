import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const isStatusHost = (host: string | null) => host?.split(':')[0].startsWith('status.') ?? false;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStatusHost(request.headers.get('host'))) {
    if (pathname === '/status' || pathname === '/api/status') return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/status';
    url.search = '';
    return NextResponse.rewrite(url);
  }

  if (pathname === '/status' || pathname === '/api/status') {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
