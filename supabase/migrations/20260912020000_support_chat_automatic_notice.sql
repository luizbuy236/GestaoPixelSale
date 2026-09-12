create table if not exists public.support_chat_notice (
  singleton boolean primary key default true check (singleton), enabled boolean not null default false,
  message text not null default '', starts_at timestamptz, ends_at timestamptz,
  updated_at timestamptz not null default now(), updated_by uuid,
  check (char_length(message) <= 2000), check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create table if not exists public.support_chat_notice_deliveries (
  conversation_id uuid primary key references public.support_conversations(id) on delete cascade,
  notice_updated_at timestamptz not null, delivered_at timestamptz not null default now()
);
alter table public.support_chat_notice enable row level security;
alter table public.support_chat_notice_deliveries enable row level security;
revoke all on public.support_chat_notice, public.support_chat_notice_deliveries from anon, authenticated;
insert into public.support_chat_notice(singleton) values(true) on conflict do nothing;

create or replace function public.chat_admin_notice_get()
returns table(enabled boolean,message text,starts_at timestamptz,ends_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$ begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  return query select n.enabled,n.message,n.starts_at,n.ends_at,n.updated_at from public.support_chat_notice n where n.singleton;
end $$;
create or replace function public.chat_admin_notice_save(p_enabled boolean,p_message text,p_starts_at timestamptz,p_ends_at timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare v_message text:=trim(coalesce(p_message,'')); begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if char_length(v_message)>2000 or (coalesce(p_enabled,false) and char_length(v_message)<1) then raise exception 'Mensagem inválida'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at then raise exception 'Período inválido'; end if;
  insert into public.support_chat_notice(singleton,enabled,message,starts_at,ends_at,updated_at,updated_by)
  values(true,coalesce(p_enabled,false),v_message,p_starts_at,p_ends_at,now(),auth.uid())
  on conflict(singleton) do update set enabled=excluded.enabled,message=excluded.message,starts_at=excluded.starts_at,ends_at=excluded.ends_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end $$;
create or replace function public.chat_customer_notice()
returns table(message text,starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$ select n.message,n.starts_at,n.ends_at from public.support_chat_notice n where n.singleton and n.enabled and now()>=n.starts_at and now()<n.ends_at $$;

create or replace function public.chat_customer_open(p_visitor_token uuid,p_name text default null,p_email text default null,p_page_url text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$ declare v_id uuid; v_notice public.support_chat_notice%rowtype; begin
  perform public.chat_expire_inactive();
  select id into v_id from public.support_conversations where visitor_token=p_visitor_token and status<>'closed' order by updated_at desc limit 1;
  if v_id is null then
    insert into public.support_conversations(visitor_token,customer_name,customer_email,page_url,last_customer_activity) values(p_visitor_token,coalesce(nullif(left(trim(p_name),80),''),'Visitante'),nullif(left(lower(trim(p_email)),160),''),left(p_page_url,500),now()) returning id into v_id;
  else
    update public.support_conversations set customer_name=coalesce(nullif(left(trim(p_name),80),''),customer_name),customer_email=coalesce(nullif(left(lower(trim(p_email)),160),''),customer_email),page_url=coalesce(left(p_page_url,500),page_url),updated_at=now(),last_customer_activity=now() where id=v_id;
  end if;
  select * into v_notice from public.support_chat_notice n where n.singleton and n.enabled and now()>=n.starts_at and now()<n.ends_at;
  if found then
    insert into public.support_chat_notice_deliveries(conversation_id,notice_updated_at) values(v_id,v_notice.updated_at)
      on conflict(conversation_id) do update set notice_updated_at=excluded.notice_updated_at,delivered_at=now()
      where support_chat_notice_deliveries.notice_updated_at<>excluded.notice_updated_at;
    if found then
      insert into public.support_messages(conversation_id,sender,body,message_type) values(v_id,'admin','⚠️ Aviso de atendimento'||E'\n'||v_notice.message,'text');
      update public.support_conversations set unread_customer=unread_customer+1,updated_at=now() where id=v_id;
    end if;
  end if;
  return v_id;
end $$;
grant execute on function public.chat_admin_notice_get() to authenticated;
grant execute on function public.chat_admin_notice_save(boolean,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.chat_customer_notice() to anon,authenticated;
grant execute on function public.chat_customer_open(uuid,text,text,text) to anon,authenticated;
