import { createHmac, timingSafeEqual } from "crypto";

const GRAPH_VERSION = process.env.META_API_VERSION || "v23.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("META_APP_ID"),
    redirect_uri: requireEnv("META_REDIRECT_URI"),
    response_type: "code",
    scope: [
      "instagram_business_basic",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ].join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string;
  permissions?: string[];
}

export async function exchangeCodeForToken(
  code: string,
): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: requireEnv("META_APP_ID"),
    client_secret: requireEnv("META_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: requireEnv("META_REDIRECT_URI"),
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function getLongLivedToken(
  shortLivedToken: string,
): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: requireEnv("META_APP_SECRET"),
    access_token: shortLivedToken,
  });
  const res = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(
      `Long-lived token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export async function refreshLongLivedToken(
  longLivedToken: string,
): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: longLivedToken,
  });
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

interface InstagramProfile {
  user_id: string;
  username: string;
  account_type?: string;
}

export async function getConnectedProfile(
  accessToken: string,
): Promise<InstagramProfile> {
  const params = new URLSearchParams({
    fields: "user_id,username,account_type",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/me?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Fetching profile failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
}

export async function getRecentMedia(
  accessToken: string,
  limit = 25,
): Promise<InstagramMedia[]> {
  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    limit: String(limit),
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/me/media?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Fetching media failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.data ?? [];
}

export async function sendTextMessage(
  igBusinessUserId: string,
  accessToken: string,
  recipientId: string,
  text: string,
): Promise<void> {
  const res = await fetch(
    `${GRAPH_BASE}/${igBusinessUserId}/messages?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Sending message failed: ${res.status} ${await res.text()}`);
  }
}

export interface ButtonTemplateButton {
  type: "web_url" | "postback";
  title: string;
  url?: string;
  payload?: string;
}

export async function sendButtonMessage(
  igBusinessUserId: string,
  accessToken: string,
  recipientId: string,
  text: string,
  buttons: ButtonTemplateButton[],
): Promise<void> {
  const res = await fetch(
    `${GRAPH_BASE}/${igBusinessUserId}/messages?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text,
              buttons,
            },
          },
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Sending button message failed: ${res.status} ${await res.text()}`);
  }
}

interface RecipientProfile {
  name?: string;
  username?: string;
  follower_count?: number;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
}

// is_user_follow_business is only available for IGSIDs the business has an
// open conversation with (Instagram Messaging User Profile API).
export async function getRecipientFollowStatus(
  recipientId: string,
  accessToken: string,
): Promise<RecipientProfile> {
  const params = new URLSearchParams({
    fields: "name,username,follower_count,is_user_follow_business,is_business_follow_user",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${recipientId}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(
      `Fetching recipient profile failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  // Webhook payloads are signed with the app's top-level Basic Settings
  // secret, not the Instagram-product-specific secret used for OAuth.
  const expected = createHmac("sha256", requireEnv("META_WEBHOOK_APP_SECRET"))
    .update(rawBody, "utf8")
    .digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
