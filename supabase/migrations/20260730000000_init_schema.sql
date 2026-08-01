-- InstaFlow initial schema
-- Instagram accounts, automation rules, comment detection, DM flow, follow check, link clicks.

create extension if not exists "pgcrypto";

-- 1. Connected Instagram professional accounts, one per user (can have several)
create table if not exists public.instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_user_id text not null,
  username text,
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  is_active boolean not null default true,
  connected_at timestamptz not null default now(),
  unique (user_id, ig_user_id)
);

-- 2. Automation rules attached to an Instagram account
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  name text not null default 'Untitled automation',
  target_scope text not null default 'all_posts' check (target_scope in ('all_posts', 'specific_post')),
  target_post_id text,
  keyword_mode text not null default 'all_comments' check (keyword_mode in ('all_comments', 'specific_keywords')),
  keywords text[] not null default '{}',
  dm_initial_message text not null,
  dm_follow_recheck_button_text text not null default '팔로우 다시 확인',
  dm_final_message text,
  dm_final_link_url text,
  dm_final_button_text text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint specific_post_requires_id check (
    target_scope <> 'specific_post' or target_post_id is not null
  ),
  constraint specific_keywords_requires_list check (
    keyword_mode <> 'specific_keywords' or array_length(keywords, 1) > 0
  )
);

-- 3. Detected comments that matched an automation's trigger
create table if not exists public.comment_events (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  ig_comment_id text not null unique,
  ig_media_id text,
  commenter_ig_id text not null,
  commenter_username text,
  comment_text text,
  matched_keyword text,
  detected_at timestamptz not null default now()
);

-- 4. One conversation per (automation, commenter): tracks DM flow state
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  comment_event_id uuid references public.comment_events(id) on delete set null,
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  recipient_ig_id text not null,
  status text not null default 'dm_sent' check (
    status in (
      'dm_sent',
      'awaiting_reply',
      'follow_recheck_sent',
      'followed_confirmed',
      'not_following',
      'final_sent',
      'completed'
    )
  ),
  is_following boolean,
  follow_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Individual DM sends within a conversation
create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  message_type text not null check (message_type in ('initial', 'follow_recheck', 'final')),
  content text,
  ig_message_id text,
  sent_at timestamptz not null default now()
);

-- 6. Link clicks recorded from the final message's link button
create table if not exists public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  user_agent text,
  ip_hash text
);

create index if not exists idx_automations_user_id on public.automations(user_id);
create index if not exists idx_automations_instagram_account_id on public.automations(instagram_account_id);
create index if not exists idx_comment_events_automation_id on public.comment_events(automation_id);
create index if not exists idx_dm_conversations_automation_id on public.dm_conversations(automation_id);
create index if not exists idx_dm_conversations_recipient on public.dm_conversations(recipient_ig_id);
create index if not exists idx_dm_messages_conversation_id on public.dm_messages(conversation_id);
create index if not exists idx_link_clicks_conversation_id on public.link_clicks(conversation_id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_automations_updated_at on public.automations;
create trigger trg_automations_updated_at
  before update on public.automations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_dm_conversations_updated_at on public.dm_conversations;
create trigger trg_dm_conversations_updated_at
  before update on public.dm_conversations
  for each row execute function public.set_updated_at();

-- Row Level Security: users only see their own data.
-- Webhook / server-side processing uses the service role key, which bypasses RLS.
alter table public.instagram_accounts enable row level security;
alter table public.automations enable row level security;
alter table public.comment_events enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_messages enable row level security;
alter table public.link_clicks enable row level security;

create policy "Users manage their own instagram accounts"
  on public.instagram_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own automations"
  on public.automations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read comment events for their automations"
  on public.comment_events
  for select
  using (
    exists (
      select 1 from public.automations a
      where a.id = comment_events.automation_id
        and a.user_id = auth.uid()
    )
  );

create policy "Users read their conversations"
  on public.dm_conversations
  for select
  using (
    exists (
      select 1 from public.automations a
      where a.id = dm_conversations.automation_id
        and a.user_id = auth.uid()
    )
  );

create policy "Users read their dm messages"
  on public.dm_messages
  for select
  using (
    exists (
      select 1 from public.dm_conversations c
      join public.automations a on a.id = c.automation_id
      where c.id = dm_messages.conversation_id
        and a.user_id = auth.uid()
    )
  );

create policy "Users read their link clicks"
  on public.link_clicks
  for select
  using (
    exists (
      select 1 from public.automations a
      where a.id = link_clicks.automation_id
        and a.user_id = auth.uid()
    )
  );
