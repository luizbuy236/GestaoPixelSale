alter table public.support_conversations
  add column if not exists last_customer_activity timestamptz;

update public.support_conversations
set last_customer_activity = coalesce(last_customer_activity, updated_at);

alter table public.support_conversations
  alter column last_customer_activity set default now(),
  alter column last_customer_activity set not null;

alter table public.support_messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'image')),
  add column if not exists media_data text;

create or replace function public.chat_expire_inactive()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.support_conversations
  set status = 'closed', updated_at = now()
  where status <> 'closed'
    and last_customer_activity <= now() - interval '5 minutes';
end $$;

create or replace function public.chat_customer_open(p_visitor_token uuid, p_name text default null, p_email text default null, p_page_url text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  perform public.chat_expire_inactive();
  select id into v_id from public.support_conversations
  where visitor_token=p_visitor_token and status<>'closed' order by updated_at desc limit 1;
  if v_id is null then
    insert into public.support_conversations(visitor_token,customer_name,customer_email,page_url,last_customer_activity)
    values(p_visitor_token,coalesce(nullif(left(trim(p_name),80),''),'Visitante'),nullif(left(lower(trim(p_email)),160),''),left(p_page_url,500),now())
    returning id into v_id;
  else
    update public.support_conversations set
      customer_name=coalesce(nullif(left(trim(p_name),80),''),customer_name),
      customer_email=coalesce(nullif(left(lower(trim(p_email)),160),''),customer_email),
      page_url=coalesce(left(p_page_url,500),page_url), updated_at=now(), last_customer_activity=now()
    where id=v_id;
  end if;
  return v_id;
end $$;

create or replace function public.chat_customer_send(p_visitor_token uuid, p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_body text:=trim(p_body);
begin
  perform public.chat_expire_inactive();
  if char_length(v_body) not between 1 and 2000 then raise exception 'Mensagem inválida'; end if;
  if not exists(select 1 from public.support_conversations where id=p_conversation_id and visitor_token=p_visitor_token and status<>'closed') then raise exception 'Conversa inválida'; end if;
  insert into public.support_messages(conversation_id,sender,body,message_type) values(p_conversation_id,'customer',v_body,'text') returning id into v_message;
  update public.support_conversations set unread_admin=unread_admin+1,updated_at=now(),last_customer_activity=now() where id=p_conversation_id;
  return v_message;
end $$;

create or replace function public.chat_customer_send_image(p_visitor_token uuid, p_conversation_id uuid, p_media_data text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_media text:=trim(p_media_data);
begin
  perform public.chat_expire_inactive();
  if char_length(v_media) > 2000000 or v_media !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' then raise exception 'Imagem inválida ou muito grande'; end if;
  if not exists(select 1 from public.support_conversations where id=p_conversation_id and visitor_token=p_visitor_token and status<>'closed') then raise exception 'Conversa inválida'; end if;
  insert into public.support_messages(conversation_id,sender,body,message_type,media_data)
  values(p_conversation_id,'customer','Imagem','image',v_media) returning id into v_message;
  update public.support_conversations set unread_admin=unread_admin+1,updated_at=now(),last_customer_activity=now() where id=p_conversation_id;
  return v_message;
end $$;

drop function if exists public.chat_customer_messages(uuid,uuid);
create function public.chat_customer_messages(p_visitor_token uuid, p_conversation_id uuid)
returns table(id uuid,sender text,body text,message_type text,media_data text,created_at timestamptz) language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.chat_expire_inactive();
  if not exists(select 1 from public.support_conversations c where c.id=p_conversation_id and c.visitor_token=p_visitor_token) then raise exception 'Conversa inválida'; end if;
  update public.support_conversations set unread_customer=0 where support_conversations.id=p_conversation_id;
  return query select m.id,m.sender,m.body,m.message_type,m.media_data,m.created_at from public.support_messages m where m.conversation_id=p_conversation_id order by m.created_at;
end $$;

create or replace function public.chat_admin_list()
returns table(id uuid,customer_name text,customer_email text,page_url text,status text,unread_admin integer,updated_at timestamptz,last_message text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  perform public.chat_expire_inactive();
  return query select c.id,c.customer_name,c.customer_email,c.page_url,c.status,c.unread_admin,c.updated_at,
    (select case when m.message_type='image' then '📷 Imagem' else m.body end from public.support_messages m where m.conversation_id=c.id order by m.created_at desc limit 1)
  from public.support_conversations c order by (c.status='closed'),c.updated_at desc;
end $$;

drop function if exists public.chat_admin_messages(uuid);
create function public.chat_admin_messages(p_conversation_id uuid)
returns table(id uuid,sender text,body text,message_type text,media_data text,created_at timestamptz) language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  perform public.chat_expire_inactive();
  update public.support_conversations set unread_admin=0 where support_conversations.id=p_conversation_id;
  return query select m.id,m.sender,m.body,m.message_type,m.media_data,m.created_at from public.support_messages m where m.conversation_id=p_conversation_id order by m.created_at;
end $$;

grant execute on function public.chat_expire_inactive() to anon, authenticated;
grant execute on function public.chat_customer_send_image(uuid,uuid,text) to anon, authenticated;
grant execute on function public.chat_customer_messages(uuid,uuid) to anon, authenticated;
grant execute on function public.chat_admin_messages(uuid) to authenticated;
