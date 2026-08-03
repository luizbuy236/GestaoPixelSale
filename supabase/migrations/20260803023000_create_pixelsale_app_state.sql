create table if not exists public.pixelsale_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pixelsale_app_state enable row level security;

revoke all on table public.pixelsale_app_state from anon, authenticated;
grant select, insert, update on table public.pixelsale_app_state to authenticated;

create policy "Users can read their own PixelSale state"
on public.pixelsale_app_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own PixelSale state"
on public.pixelsale_app_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own PixelSale state"
on public.pixelsale_app_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
