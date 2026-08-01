import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import {
  exchangeCodeForToken,
  getConnectedProfile,
  getLongLivedToken,
} from "@/lib/instagram/client";
import { STATE_COOKIE } from "@/app/api/instagram/connect/route";

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_APP_URL));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  if (error) {
    return redirectTo(`/protected/instagram?error=${encodeURIComponent(error)}`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectTo("/protected/instagram?error=invalid_state");
  }

  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getClaims();
  if (authError || !data?.claims) {
    return redirectTo("/auth/login");
  }
  const userId = data.claims.sub as string;

  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await getLongLivedToken(shortLived.access_token);
    const profile = await getConnectedProfile(longLived.access_token);

    const expiresAt = new Date(
      Date.now() + longLived.expires_in * 1000,
    ).toISOString();

    const { error: dbError } = await supabase.from("instagram_accounts").upsert(
      {
        user_id: userId,
        ig_user_id: profile.user_id,
        username: profile.username,
        access_token_encrypted: encryptToken(longLived.access_token),
        token_expires_at: expiresAt,
        is_active: true,
      },
      { onConflict: "user_id,ig_user_id" },
    );

    if (dbError) {
      throw dbError;
    }

    return redirectTo("/protected/instagram?connected=1");
  } catch (err) {
    console.error("Instagram OAuth callback failed:", err);
    return redirectTo("/protected/instagram?error=connection_failed");
  }
}
