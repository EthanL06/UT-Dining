import { supabase } from '~/utils/supabase';

export const sendTestPush = async (token: string) => {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    'qa-test-push',
    { body: { token } },
  );
  if (error) {
    const context = (error as { context?: Response }).context;
    const detail = context ? await context.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  if (!data?.success) throw new Error(data?.error ?? 'The push was not accepted.');
};
