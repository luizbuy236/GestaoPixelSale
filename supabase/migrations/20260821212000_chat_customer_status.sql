create or replace function public.chat_customer_status(p_visitor_token uuid, p_conversation_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_status text;
begin
  perform public.chat_expire_inactive();
  select status into v_status
  from public.support_conversations
  where id = p_conversation_id and visitor_token = p_visitor_token;
  if v_status is null then raise exception 'Conversa inválida'; end if;
  return v_status;
end $$;

grant execute on function public.chat_customer_status(uuid,uuid) to anon, authenticated;
