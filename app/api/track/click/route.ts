import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

// Public redirect endpoint used inside the final DM's link button.
// The destination URL is looked up server-side from the automation record
// rather than trusted from the query string, to avoid an open redirect.
export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("c");
  const fallback = new URL("/", process.env.NEXT_PUBLIC_APP_URL);

  if (!conversationId) {
    return NextResponse.redirect(fallback);
  }

  const supabase = createServiceClient();
  const { data: conversation } = await supabase
    .from("dm_conversations")
    .select("id, automation_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return NextResponse.redirect(fallback);
  }

  const { data: automation } = await supabase
    .from("automations")
    .select("dm_final_link_url")
    .eq("id", conversation.automation_id)
    .single();

  await supabase.from("link_clicks").insert({
    conversation_id: conversation.id,
    automation_id: conversation.automation_id,
    user_agent: request.headers.get("user-agent"),
  });

  const destination = automation?.dm_final_link_url || fallback.toString();
  return NextResponse.redirect(destination);
}
