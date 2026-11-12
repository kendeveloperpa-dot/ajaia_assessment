import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  console.log("[auth/callback] hit", {
    url: request.url,
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
  });

  // PKCE flow: `?code=...`
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error);
  }

  // Older/alternative flow: `?token_hash=...&type=magiclink`
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as "magiclink" | "email" | "signup" | "recovery" | "invite",
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] verifyOtp failed:", error);
  }

  if (!code && !token_hash) {
    console.warn("[auth/callback] no code or token_hash in URL");
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
