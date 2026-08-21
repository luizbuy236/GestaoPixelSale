create extension if not exists pgcrypto;

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_token uuid not null,
  customer_name text not null default 'Visitante',
  customer_email text,
  page_url text,
  status text not null default 'open' check (status in ('open','pending','closed')),
  unread_admin integer not null default 0,
  unread_customer integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender text not null check (sender in ('customer','admin')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists support_conversations_visitor_idx on public.support_conversations(visitor_token, updated_at desc);
create index if not exists support_conversations_status_idx on public.support_conversations(status, updated_at desc);
create index if not exists support_messages_conversation_idx on public.support_messages(conversation_id, created_at);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_conversations, public.support_messages from anon, authenticated;

create or replace function public.chat_customer_open(p_visitor_token uuid, p_name text default null, p_email text default null, p_page_url text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  select id into v_id from public.support_conversations
  where visitor_token=p_visitor_token and status<>'closed' order by updated_at desc limit 1;
  if v_id is null then
    insert into public.support_conversations(visitor_token,customer_name,customer_email,page_url)
    values(p_visitor_token,coalesce(nullif(left(trim(p_name),80),''),'Visitante'),nullif(left(lower(trim(p_email)),160),''),left(p_page_url,500))
    returning id into v_id;
  else
    update public.support_conversations set
      customer_name=coalesce(nullif(left(trim(p_name),80),''),customer_name),
      customer_email=coalesce(nullif(left(lower(trim(p_email)),160),''),customer_email),
      page_url=coalesce(left(p_page_url,500),page_url), updated_at=now()
    where id=v_id;
  end if;
  return v_id;
end $$;

create or replace function public.chat_customer_send(p_visitor_token uuid, p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_body text:=trim(p_body);
begin
  if char_length(v_body) not between 1 and 2000 then raise exception 'Mensagem inválida'; end if;
  if not exists(select 1 from public.support_conversations where id=p_conversation_id and visitor_token=p_visitor_token and status<>'closed') then raise exception 'Conversa inválida'; end if;
  insert into public.support_messages(conversation_id,sender,body) values(p_conversation_id,'customer',v_body) returning id into v_message;
  update public.support_conversations set unread_admin=unread_admin+1,updated_at=now() where id=p_conversation_id;
  return v_message;
end $$;

create or replace function public.chat_customer_messages(p_visitor_token uuid, p_conversation_id uuid)
returns table(id uuid,sender text,body text,created_at timestamptz) language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists(select 1 from public.support_conversations c where c.id=p_conversation_id and c.visitor_token=p_visitor_token) then raise exception 'Conversa inválida'; end if;
  update public.support_conversations set unread_customer=0 where support_conversations.id=p_conversation_id;
  return query select m.id,m.sender,m.body,m.created_at from public.support_messages m where m.conversation_id=p_conversation_id order by m.created_at;
end $$;

create or replace function public.chat_admin_list()
returns table(id uuid,customer_name text,customer_email text,page_url text,status text,unread_admin integer,updated_at timestamptz,last_message text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  return query select c.id,c.customer_name,c.customer_email,c.page_url,c.status,c.unread_admin,c.updated_at,
    (select m.body from public.support_messages m where m.conversation_id=c.id order by m.created_at desc limit 1)
  from public.support_conversations c order by (c.status='closed'),c.updated_at desc;
end $$;

create or replace function public.chat_admin_messages(p_conversation_id uuid)
returns table(id uuid,sender text,body text,created_at timestamptz) language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  update public.support_conversations set unread_admin=0 where support_conversations.id=p_conversation_id;
  return query select m.id,m.sender,m.body,m.created_at from public.support_messages m where m.conversation_id=p_conversation_id order by m.created_at;
end $$;

create or replace function public.chat_admin_send(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_body text:=trim(p_body);
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if char_length(v_body) not between 1 and 2000 then raise exception 'Mensagem inválida'; end if;
  insert into public.support_messages(conversation_id,sender,body) values(p_conversation_id,'admin',v_body) returning id into v_message;
  update public.support_conversations set unread_customer=unread_customer+1,updated_at=now() where id=p_conversation_id;
  return v_message;
end $$;

create or replace function public.chat_admin_status(p_conversation_id uuid,p_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if p_status not in ('open','pending','closed') then raise exception 'Status inválido'; end if;
  update public.support_conversations set status=p_status,updated_at=now() where id=p_conversation_id;
end $$;

grant execute on function public.chat_customer_open(uuid,text,text,text) to anon, authenticated;
grant execute on function public.chat_customer_send(uuid,uuid,text) to anon, authenticated;
grant execute on function public.chat_customer_messages(uuid,uuid) to anon, authenticated;
grant execute on function public.chat_admin_list() to authenticated;
grant execute on function public.chat_admin_messages(uuid) to authenticated;
grant execute on function public.chat_admin_send(uuid,text) to authenticated;
grant execute on function public.chat_admin_status(uuid,text) to authenticated;
