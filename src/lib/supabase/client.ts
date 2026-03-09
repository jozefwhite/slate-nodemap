import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client during build/prerender when env vars aren't available
    return null as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(url, key);
}
