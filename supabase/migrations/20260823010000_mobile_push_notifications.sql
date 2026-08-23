create extension if not exists pg_net with schema extensions;

create table if not exists public.support_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_push_subscriptions enable row level security;
revoke all on public.support_push_subscriptions from anon, authenticated;

alter table public.support_messages add column if not exists push_notified_at timestamptz;

create or replace function public.chat_push_subscribe(p_endpoint text,p_p256dh text,p_auth text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if length(p_endpoint)>2000 or length(p_p256dh)>500 or length(p_auth)>500 then raise exception 'Inscrição inválida'; end if;
  insert into public.support_push_subscriptions(user_id,endpoint,p256dh,auth)
  values(auth.uid(),p_endpoint,p_p256dh,p_auth)
  on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,updated_at=now();
end $$;

create or replace function public.notify_support_push()
returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$
begin
  if new.sender='customer' then
    perform net.http_post(
      url:='https://pglafsnqlrkgcvnakyyi.supabase.co/functions/v1/support-push',
      headers:='{"Content-Type":"application/json"}'::jsonb,
      body:=jsonb_build_object('message_id',new.id),
      timeout_milliseconds:=5000
    );
  end if;
  return new;
end $$;

drop trigger if exists support_message_push_trigger on public.support_messages;
create trigger support_message_push_trigger after insert on public.support_messages
for each row execute function public.notify_support_push();

grant execute on function public.chat_push_subscribe(text,text,text) to authenticated;
