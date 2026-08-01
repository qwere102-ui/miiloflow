import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getRecentMedia } from "@/lib/instagram/client";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("account_id");
  if (!accountId) {
    return NextResponse.json({ error: "account_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getClaims();
  if (authError || !userData?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS scopes this to accounts owned by the current user.
  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, access_token_encrypted")
    .eq("id", accountId)
    .single();
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const accessToken = decryptToken(account.access_token_encrypted);
    const media = await getRecentMedia(accessToken);
    return NextResponse.json({ media });
  } catch (err) {
    console.error("Failed to fetch Instagram media:", err);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 502 });
  }
}
