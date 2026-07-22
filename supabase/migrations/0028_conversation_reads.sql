-- Tracks when each user last read a conversation, so we can show unread badges.

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

drop policy if exists "read own conversation reads" on public.conversation_reads;
create policy "read own conversation reads"
  on public.conversation_reads for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "insert own conversation reads" on public.conversation_reads;
create policy "insert own conversation reads"
  on public.conversation_reads for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

drop policy if exists "update own conversation reads" on public.conversation_reads;
create policy "update own conversation reads"
  on public.conversation_reads for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
