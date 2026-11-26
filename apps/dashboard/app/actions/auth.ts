'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signInWithGoogle() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin =
    requestHeaders.get('origin') ??
    `${requestHeaders.get('x-forwarded-proto') ?? 'https'}://${requestHeaders.get('host')}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error || !data.url) {
    redirect('/login?error=auth');
  }

  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect('/dashboard');
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
