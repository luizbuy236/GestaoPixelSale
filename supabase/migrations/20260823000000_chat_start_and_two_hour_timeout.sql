alter table public.support_conversations
  add column if not exists atendimento_started_at timestamptz;

create or replace function public.chat_expire_inactive()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.support_conversations
  set status = 'closed', updated_at = now()
  where status <> 'closed'
    and atendimento_started_at is not null
    and last_customer_activity <= now() - interval '2 hours';
end $$;

create or replace function public.chat_admin_start(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  update public.support_conversations
  set atendimento_started_at = coalesce(atendimento_started_at, now()),
      last_customer_activity = case when atendimento_started_at is null then now() else last_customer_activity end,
      status = 'open', updated_at = now()
  where id = p_conversation_id and status <> 'closed';
  if not found then raise exception 'Conversa inválida ou encerrada'; end if;
end $$;

drop function if exists public.chat_admin_list();
create function public.chat_admin_list()
returns table(id uuid,customer_name text,customer_email text,page_url text,status text,unread_admin integer,updated_at timestamptz,last_message text,atendimento_started_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  perform public.chat_expire_inactive();
  return query select c.id,c.customer_name,c.customer_email,c.page_url,c.status,c.unread_admin,c.updated_at,
    (select case when m.message_type='image' then '📷 Imagem' else m.body end from public.support_messages m where m.conversation_id=c.id order by m.created_at desc limit 1),
    c.atendimento_started_at
  from public.support_conversations c order by (c.status='closed'),c.updated_at desc;
end $$;

create or replace function public.chat_admin_send(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_body text:=trim(p_body);
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if char_length(v_body) not between 1 and 2000 then raise exception 'Mensagem inválida'; end if;
  if not exists(select 1 from public.support_conversations where id=p_conversation_id and status<>'closed' and atendimento_started_at is not null) then raise exception 'Inicie o atendimento antes de responder'; end if;
  insert into public.support_messages(conversation_id,sender,body) values(p_conversation_id,'admin',v_body) returning id into v_message;
  update public.support_conversations set unread_customer=unread_customer+1,updated_at=now() where id=p_conversation_id;
  return v_message;
end $$;

grant execute on function public.chat_expire_inactive() to anon, authenticated;
grant execute on function public.chat_admin_start(uuid) to authenticated;
grant execute on function public.chat_admin_list() to authenticated;
grant execute on function public.chat_admin_send(uuid,text) to authenticated;
