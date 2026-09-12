-- Deliver admin chat changes immediately. RPC access remains the only way clients
-- mutate chat data; this read policy only exposes rows to authenticated staff.
drop policy if exists "Authenticated staff can receive conversation changes" on public.support_conversations;
create policy "Authenticated staff can receive conversation changes"
  on public.support_conversations for select to authenticated using (auth.uid() is not null);

drop policy if exists "Authenticated staff can receive message changes" on public.support_messages;
create policy "Authenticated staff can receive message changes"
  on public.support_messages for select to authenticated using (auth.uid() is not null);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='support_conversations'
  ) then alter publication supabase_realtime add table public.support_conversations; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='support_messages'
  ) then alter publication supabase_realtime add table public.support_messages; end if;
end $$;
