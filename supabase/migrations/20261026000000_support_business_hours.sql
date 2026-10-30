alter table public.support_chat_notice
  add column if not exists business_days smallint[] not null default array[1,2,3,4,5]::smallint[],
  add column if not exists opens_at time not null default '09:00',
  add column if not exists closes_at time not null default '18:00',
  add column if not exists timezone text not null default 'America/Sao_Paulo';

alter table public.support_chat_notice_deliveries drop constraint if exists support_chat_notice_deliveries_pkey;
alter table public.support_chat_notice_deliveries add column if not exists delivery_key text;
update public.support_chat_notice_deliveries set delivery_key=coalesce(delivery_key,'legacy');
alter table public.support_chat_notice_deliveries alter column delivery_key set not null;
alter table public.support_chat_notice_deliveries add primary key(conversation_id,delivery_key);

drop function if exists public.chat_admin_notice_save(boolean,text,timestamptz,timestamptz);
drop function if exists public.chat_admin_notice_get();
create or replace function public.chat_admin_notice_get()
returns table(enabled boolean,message text,business_days smallint[],opens_at time,closes_at time,timezone text,updated_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$ begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  return query select n.enabled,n.message,n.business_days,n.opens_at,n.closes_at,n.timezone,n.updated_at from public.support_chat_notice n where n.singleton;
end $$;

create or replace function public.chat_admin_notice_save(p_enabled boolean,p_message text,p_business_days smallint[],p_opens_at time,p_closes_at time,p_timezone text default 'America/Sao_Paulo')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_message text:=trim(coalesce(p_message,'')); v_days smallint[];
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  select coalesce(array_agg(distinct d order by d),'{}') into v_days from unnest(coalesce(p_business_days,'{}')) d where d between 0 and 6;
  if char_length(v_message)>2000 or (coalesce(p_enabled,false) and char_length(v_message)<1) then raise exception 'Mensagem inválida'; end if;
  if coalesce(p_enabled,false) and (cardinality(v_days)=0 or p_opens_at is null or p_closes_at is null or p_opens_at=p_closes_at) then raise exception 'Horário de atendimento inválido'; end if;
  if p_timezone<>'America/Sao_Paulo' then raise exception 'Fuso horário inválido'; end if;
  insert into public.support_chat_notice(singleton,enabled,message,business_days,opens_at,closes_at,timezone,updated_at,updated_by)
  values(true,coalesce(p_enabled,false),v_message,coalesce(p_opens_at,'09:00'),coalesce(p_closes_at,'18:00'),p_timezone,now(),auth.uid())
  on conflict(singleton) do update set enabled=excluded.enabled,message=excluded.message,business_days=excluded.business_days,opens_at=excluded.opens_at,closes_at=excluded.closes_at,timezone=excluded.timezone,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end $$;

create or replace function public.chat_notice_is_outside(n public.support_chat_notice,p_now timestamptz default now()) returns boolean
language plpgsql stable set search_path=public,pg_temp as $$
declare v_local timestamp:=p_now at time zone n.timezone; v_day int:=extract(dow from v_local); v_previous int:=(v_day+6)%7; v_time time:=v_local::time;
begin
  if not n.enabled then return false; end if;
  if n.opens_at<n.closes_at then return not (v_day=any(n.business_days) and v_time>=n.opens_at and v_time<n.closes_at); end if;
  return not ((v_day=any(n.business_days) and v_time>=n.opens_at) or (v_previous=any(n.business_days) and v_time<n.closes_at));
end $$;

create or replace function public.chat_deliver_active_notice(p_conversation_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_notice public.support_chat_notice%rowtype; v_key text;
begin
  select * into v_notice from public.support_chat_notice n where n.singleton and public.chat_notice_is_outside(n);
  if not found then return; end if;
  v_key:=to_char(now() at time zone v_notice.timezone,'YYYY-MM-DD');
  insert into public.support_chat_notice_deliveries(conversation_id,notice_updated_at,delivery_key) values(p_conversation_id,v_notice.updated_at,v_key) on conflict do nothing;
  if found then
    insert into public.support_messages(conversation_id,sender,body,message_type) values(p_conversation_id,'admin','⚠️ Atendimento indisponível'||E'\n'||v_notice.message,'text');
    update public.support_conversations set unread_customer=unread_customer+1,updated_at=now() where id=p_conversation_id;
  end if;
end $$;

create or replace function public.chat_customer_notice()
returns table(message text,starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
  select n.message,null::timestamptz,null::timestamptz from public.support_chat_notice n where n.singleton and public.chat_notice_is_outside(n)
$$;

grant execute on function public.chat_admin_notice_get() to authenticated;
grant execute on function public.chat_admin_notice_save(boolean,text,smallint[],time,time,text) to authenticated;
revoke execute on function public.chat_notice_is_outside(public.support_chat_notice,timestamptz) from public,anon,authenticated;
revoke execute on function public.chat_deliver_active_notice(uuid) from public,anon,authenticated;

create or replace function public.chat_customer_open(p_visitor_token uuid,p_name text default null,p_email text default null,p_page_url text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  perform public.chat_expire_inactive();
  select id into v_id from public.support_conversations where visitor_token=p_visitor_token and status<>'closed' order by updated_at desc limit 1;
  if v_id is null then
    insert into public.support_conversations(visitor_token,customer_name,customer_email,page_url,last_customer_activity)
    values(p_visitor_token,coalesce(nullif(left(trim(p_name),80),''),'Visitante'),nullif(left(lower(trim(p_email)),160),''),left(p_page_url,500),now()) returning id into v_id;
  else
    update public.support_conversations set customer_name=coalesce(nullif(left(trim(p_name),80),''),customer_name),customer_email=coalesce(nullif(left(lower(trim(p_email)),160),''),customer_email),page_url=coalesce(left(p_page_url,500),page_url),updated_at=now(),last_customer_activity=now() where id=v_id;
  end if;
  perform public.chat_deliver_active_notice(v_id);
  return v_id;
end $$;

grant execute on function public.chat_customer_open(uuid,text,text,text) to anon,authenticated;
