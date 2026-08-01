import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto";
import {
  getRecipientFollowStatus,
  sendButtonMessage,
  sendTextMessage,
} from "@/lib/instagram/client";

type ServiceClient = ReturnType<typeof createServiceClient>;

interface CommentChangeValue {
  id: string;
  text?: string;
  from?: { id: string; username?: string };
  media?: { id: string };
}

interface WebhookEntry {
  id: string;
  changes?: { field: string; value: CommentChangeValue }[];
  messaging?: MessagingItem[];
}

interface MessagingItem {
  sender: { id: string };
  recipient: { id: string };
  message?: { mid: string; text?: string; is_echo?: boolean };
  postback?: { title?: string; payload?: string };
}

export async function processWebhookEntry(entry: WebhookEntry) {
  const supabase = createServiceClient();

  if (entry.changes) {
    for (const change of entry.changes) {
      if (change.field === "comments") {
        await handleCommentEvent(supabase, entry.id, change.value);
      }
    }
  }

  if (entry.messaging) {
    for (const item of entry.messaging) {
      if (item.message?.is_echo) continue;
      await handleMessagingEvent(supabase, entry.id, item);
    }
  }
}

async function handleCommentEvent(
  supabase: ServiceClient,
  igBusinessId: string,
  value: CommentChangeValue,
) {
  if (!value.from || !value.media) return;

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, ig_user_id, access_token_encrypted")
    .eq("ig_user_id", igBusinessId)
    .eq("is_active", true)
    .single();
  if (!account) return;

  // Ignore comments made by the connected business account itself.
  if (value.from.id === account.ig_user_id) return;

  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .eq("instagram_account_id", account.id)
    .eq("is_active", true);
  if (!automations?.length) return;

  const commentText = value.text ?? "";
  const matched = automations
    .filter((a) => a.target_scope === "all_posts" || a.target_post_id === value.media!.id)
    .sort((a) => (a.target_scope === "specific_post" ? -1 : 1))
    .find((a) => {
      if (a.keyword_mode === "all_comments") return true;
      const keywords: string[] = a.keywords ?? [];
      return keywords.some((k) =>
        commentText.toLowerCase().includes(k.toLowerCase()),
      );
    });
  if (!matched) return;

  const { data: commentEvent, error: insertError } = await supabase
    .from("comment_events")
    .insert({
      automation_id: matched.id,
      instagram_account_id: account.id,
      ig_comment_id: value.id,
      ig_media_id: value.media.id,
      commenter_ig_id: value.from.id,
      commenter_username: value.from.username,
      comment_text: commentText,
      matched_keyword: matched.keyword_mode === "specific_keywords" ? commentText : null,
    })
    .select("id")
    .single();
  // Unique violation means we've already processed this comment (webhook retry).
  if (insertError || !commentEvent) return;

  const accessToken = decryptToken(account.access_token_encrypted);
  await sendTextMessage(
    account.ig_user_id,
    accessToken,
    value.from.id,
    matched.dm_initial_message,
  );

  const { data: conversation } = await supabase
    .from("dm_conversations")
    .insert({
      automation_id: matched.id,
      comment_event_id: commentEvent.id,
      instagram_account_id: account.id,
      recipient_ig_id: value.from.id,
      status: "dm_sent",
    })
    .select("id")
    .single();
  if (!conversation) return;

  await supabase.from("dm_messages").insert({
    conversation_id: conversation.id,
    message_type: "initial",
    content: matched.dm_initial_message,
  });
}

async function handleMessagingEvent(
  supabase: ServiceClient,
  igBusinessId: string,
  item: MessagingItem,
) {
  const senderId = item.sender.id;

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, ig_user_id, access_token_encrypted")
    .eq("ig_user_id", igBusinessId)
    .eq("is_active", true)
    .single();
  if (!account) return;

  const { data: conversation } = await supabase
    .from("dm_conversations")
    .select("id, automation_id, status")
    .eq("instagram_account_id", account.id)
    .eq("recipient_ig_id", senderId)
    .in("status", ["dm_sent", "follow_recheck_sent"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conversation) return;

  const { data: automation } = await supabase
    .from("automations")
    .select("*")
    .eq("id", conversation.automation_id)
    .single();
  if (!automation) return;

  const accessToken = decryptToken(account.access_token_encrypted);
  const profile = await getRecipientFollowStatus(senderId, accessToken);
  const isFollowing = profile.is_user_follow_business ?? false;

  await supabase
    .from("dm_conversations")
    .update({ is_following: isFollowing, follow_checked_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (!isFollowing) {
    await sendButtonMessage(
      account.ig_user_id,
      accessToken,
      senderId,
      "아직 팔로우가 확인되지 않았어요. 팔로우 후 아래 버튼을 눌러주세요!",
      [
        {
          type: "postback",
          title: automation.dm_follow_recheck_button_text,
          payload: `RECHECK_FOLLOW:${conversation.id}`,
        },
      ],
    );
    await supabase
      .from("dm_conversations")
      .update({ status: "follow_recheck_sent" })
      .eq("id", conversation.id);
    await supabase.from("dm_messages").insert({
      conversation_id: conversation.id,
      message_type: "follow_recheck",
      content: automation.dm_follow_recheck_button_text,
    });
    return;
  }

  const clickUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/track/click?c=${conversation.id}`;
  await sendButtonMessage(
    account.ig_user_id,
    accessToken,
    senderId,
    automation.dm_final_message || "팔로우 감사합니다!",
    [
      {
        type: "web_url",
        title: automation.dm_final_button_text || "바로가기",
        url: clickUrl,
      },
    ],
  );
  await supabase
    .from("dm_conversations")
    .update({ status: "completed" })
    .eq("id", conversation.id);
  await supabase.from("dm_messages").insert({
    conversation_id: conversation.id,
    message_type: "final",
    content: automation.dm_final_message,
  });
}
