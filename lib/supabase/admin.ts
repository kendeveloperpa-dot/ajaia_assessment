import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Admin (service-role) Supabase client. BYPASSES RLS — only use in server
 * code and always after validating the caller via the session client
 * (see `lib/supabase/server.ts`). Never expose this client or the key to
 * the browser.
 *
 * Why this exists:
 * `@supabase/ssr`'s server client passes the user JWT to PostgREST through
 * cookies. In some session-refresh edge cases the JWT is missing on the
 * request even when `supabase.auth.getUser()` succeeds, which trips
 * `to authenticated` RLS policies. The pragmatic fix is to authenticate
 * the caller once (session client), then do the mutation with admin
 * privileges and manually constrain `owner_id`/share rules in code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env var"
    );
  }
  return createSbClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
