create or replace function public.chat_admin_notice_save(
  p_enabled boolean,
  p_message text,
  p_business_days smallint[],
  p_opens_at time,
  p_closes_at time,
  p_timezone text default 'America/Sao_Paulo'
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_message text:=trim(coalesce(p_message,''));
  v_days smallint[];
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;

  select coalesce(array_agg(distinct d order by d),'{}')
    into v_days
    from unnest(coalesce(p_business_days,'{}')) d
   where d between 0 and 6;

  if char_length(v_message)>2000 or (coalesce(p_enabled,false) and char_length(v_message)<1) then
    raise exception 'Mensagem inválida';
  end if;
  if coalesce(p_enabled,false) and (cardinality(v_days)=0 or p_opens_at is null or p_closes_at is null or p_opens_at=p_closes_at) then
    raise exception 'Horário de atendimento inválido';
  end if;
  if p_timezone<>'America/Sao_Paulo' then
    raise exception 'Fuso horário inválido';
  end if;

  insert into public.support_chat_notice(
    singleton,
    enabled,
    message,
    business_days,
    opens_at,
    closes_at,
    timezone,
    updated_at,
    updated_by
  ) values (
    true,
    coalesce(p_enabled,false),
    v_message,
    v_days,
    coalesce(p_opens_at,'09:00'),
    coalesce(p_closes_at,'18:00'),
    p_timezone,
    now(),
    auth.uid()
  )
  on conflict(singleton) do update set
    enabled=excluded.enabled,
    message=excluded.message,
    business_days=excluded.business_days,
    opens_at=excluded.opens_at,
    closes_at=excluded.closes_at,
    timezone=excluded.timezone,
    updated_at=excluded.updated_at,
    updated_by=excluded.updated_by;
end
$$;

grant execute on function public.chat_admin_notice_save(boolean,text,smallint[],time,time,text) to authenticated;
