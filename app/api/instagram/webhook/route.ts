import { NextRequest, NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/instagram/client";
import { processWebhookEntry } from "@/lib/instagram/webhook-handlers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  if (payload.object === "instagram" && Array.isArray(payload.entry)) {
    for (const entry of payload.entry) {
      try {
        await processWebhookEntry(entry);
      } catch (err) {
        console.error("Failed to process webhook entry:", err);
      }
    }
  }

  // Meta requires a fast 200 response regardless of processing outcome.
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
