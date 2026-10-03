create table public.memories (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, payload jsonb not null, created_at timestamptz not null default now());
create index on public.memories(user_id,created_at desc);
alter table public.memories enable row level security;
create policy "Own memories" on public.memories for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.chat_messages (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, payload jsonb not null, created_at timestamptz not null default now());
create index on public.chat_messages(user_id,created_at);
alter table public.chat_messages enable row level security;
create policy "Own chats" on public.chat_messages for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.daily_usage(user_id uuid references auth.users(id) on delete cascade, day date, count integer not null, primary key(user_id,day));
alter table public.daily_usage enable row level security;
create or replace function public.consume_chat_quota() returns boolean language plpgsql security definer set search_path=public as $$
declare current_count integer;
begin
 if auth.uid() is null then return false; end if;
 insert into daily_usage values(auth.uid(),(now() at time zone 'UTC')::date,1)
 on conflict(user_id,day) do update set count=daily_usage.count+1 where daily_usage.count<20 returning count into current_count;
 return current_count is not null;
end $$;
revoke all on function public.consume_chat_quota() from public;
grant execute on function public.consume_chat_quota() to authenticated;
