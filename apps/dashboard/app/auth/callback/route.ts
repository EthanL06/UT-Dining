import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const loginUrl = (error: string) => NextResponse.redirect(`${origin}/login?error=${error}`);

  if (!code) {
    return loginUrl(searchParams.get('error') ? 'not_allowed' : 'auth');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return loginUrl('auth');
  }

  const { data: isAdmin } = await supabase.rpc('is_dashboard_admin');

  if (!isAdmin) {
    await supabase.auth.signOut();
    return loginUrl('not_allowed');
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
