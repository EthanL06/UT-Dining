import { createServerClient } from '@supabase/ssr';
import type { Database } from '@ut-dining/supabase';
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseEnv } from './env';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = pathname.startsWith('/login') || pathname.startsWith('/auth/');

  const redirectTo = (path: string, search = '') => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search;
    const response = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    return response;
  };

  if (!user) {
    return isPublicPath ? supabaseResponse : redirectTo('/login');
  }

  if (pathname.startsWith('/auth/')) {
    return supabaseResponse;
  }

  const { data: isAdmin } = await supabase.rpc('is_dashboard_admin');

  if (!isAdmin) {
    await supabase.auth.signOut();
    return redirectTo('/login', '?error=not_allowed');
  }

  if (!pathname.startsWith('/dashboard')) {
    return redirectTo('/dashboard');
  }

  return supabaseResponse;
}
