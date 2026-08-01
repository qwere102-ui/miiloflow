import { createClient } from "@supabase/supabase-js";

// Bypasses RLS — only for server-side webhook/background processing,
// never expose this client or the service role key to the browser.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
