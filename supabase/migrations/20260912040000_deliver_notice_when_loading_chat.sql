create or replace function public.chat_deliver_active_notice(p_conversation_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_notice public.support_chat_notice%rowtype;
begin
  select * into v_notice
  from public.support_chat_notice n
  where n.singleton and n.enabled and now()>=n.starts_at and now()<n.ends_at;

  if not found then return; end if;

  insert into public.support_chat_notice_deliveries(conversation_id,notice_updated_at)
  values(p_conversation_id,v_notice.updated_at)
  on conflict(conversation_id) do update
    set notice_updated_at=excluded.notice_updated_at,delivered_at=now()
    where support_chat_notice_deliveries.notice_updated_at<>excluded.notice_updated_at;

  if found then
    insert into public.support_messages(conversation_id,sender,body,message_type)
    values(p_conversation_id,'admin','⚠️ Aviso de atendimento'||E'\n'||v_notice.message,'text');
    update public.support_conversations
    set unread_customer=unread_customer+1,updated_at=now()
    where id=p_conversation_id;
  end if;
end $$;

create or replace function public.chat_customer_messages(p_visitor_token uuid,p_conversation_id uuid)
returns table(id uuid,sender text,body text,message_type text,media_data text,created_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.chat_expire_inactive();
  if not exists(
    select 1 from public.support_conversations c
    where c.id=p_conversation_id and c.visitor_token=p_visitor_token
  ) then raise exception 'Conversa inválida'; end if;

  -- Também entrega ao reabrir um chat já salvo, não apenas ao criar a conversa.
  perform public.chat_deliver_active_notice(p_conversation_id);
  update public.support_conversations set unread_customer=0 where support_conversations.id=p_conversation_id;

  return query
    select m.id,m.sender,m.body,m.message_type,m.media_data,m.created_at
    from public.support_messages m
    where m.conversation_id=p_conversation_id
    order by m.created_at;
end $$;

revoke execute on function public.chat_deliver_active_notice(uuid) from public,anon,authenticated;
grant execute on function public.chat_customer_messages(uuid,uuid) to anon,authenticated;
