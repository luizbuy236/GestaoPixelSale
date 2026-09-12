create or replace function public.chat_admin_delete_message(p_message_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_conversation_id uuid;
  v_sender text;
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;

  delete from public.support_messages
  where id=p_message_id
  returning conversation_id,sender into v_conversation_id,v_sender;

  if not found then raise exception 'Mensagem não encontrada'; end if;

  update public.support_conversations
  set unread_admin=case when v_sender='customer' then greatest(unread_admin-1,0) else unread_admin end,
      unread_customer=case when v_sender='admin' then greatest(unread_customer-1,0) else unread_customer end,
      updated_at=now()
  where id=v_conversation_id;
end $$;

revoke execute on function public.chat_admin_delete_message(uuid) from public,anon;
grant execute on function public.chat_admin_delete_message(uuid) to authenticated;

-- The old per-user hide endpoint is no longer part of the chat behavior.
revoke execute on function public.chat_admin_hide_message(uuid) from public,anon,authenticated;
