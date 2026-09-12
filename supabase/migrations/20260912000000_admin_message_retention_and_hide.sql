create table if not exists public.support_message_admin_hides (
  message_id uuid not null references public.support_messages(id) on delete cascade,
  user_id uuid not null,
  hidden_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.support_message_admin_hides enable row level security;

create or replace function public.chat_admin_hide_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if not exists (select 1 from public.support_messages where id=p_message_id) then
    raise exception 'Mensagem não encontrada';
  end if;
  insert into public.support_message_admin_hides(message_id,user_id)
  values(p_message_id,auth.uid()) on conflict do nothing;
end $$;

drop function if exists public.chat_admin_list();
create function public.chat_admin_list()
returns table(id uuid,customer_name text,customer_email text,page_url text,status text,unread_admin integer,updated_at timestamptz,last_message text,atendimento_started_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  perform public.chat_expire_inactive();
  return query select c.id,c.customer_name,c.customer_email,c.page_url,c.status,c.unread_admin,c.updated_at,
    (select case when m.message_type='image' then '📷 Imagem' else m.body end
     from public.support_messages m
     where m.conversation_id=c.id and m.created_at >= now() - interval '3 days'
       and not exists (select 1 from public.support_message_admin_hides h where h.message_id=m.id and h.user_id=auth.uid())
     order by m.created_at desc limit 1),
    c.atendimento_started_at
  from public.support_conversations c
  where c.updated_at >= now() - interval '3 days'
  order by (c.status='closed'),c.updated_at desc;
end $$;

drop function if exists public.chat_admin_messages(uuid);
create function public.chat_admin_messages(p_conversation_id uuid)
returns table(id uuid,sender text,body text,message_type text,media_data text,created_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  update public.support_conversations set unread_admin=0 where support_conversations.id=p_conversation_id;
  return query
    select m.id,m.sender,m.body,m.message_type,m.media_data,m.created_at
    from public.support_messages m
    where m.conversation_id=p_conversation_id
      and m.created_at >= now() - interval '3 days'
      and not exists (select 1 from public.support_message_admin_hides h where h.message_id=m.id and h.user_id=auth.uid())
    order by m.created_at;
end $$;

grant execute on function public.chat_admin_hide_message(uuid) to authenticated;
grant execute on function public.chat_admin_messages(uuid) to authenticated;
grant execute on function public.chat_admin_list() to authenticated;
