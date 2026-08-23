create or replace function public.chat_admin_start(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  update public.support_conversations
  set atendimento_started_at = now(),
      last_customer_activity = now(),
      status = 'open',
      updated_at = now()
  where id = p_conversation_id;
  if not found then raise exception 'Conversa inválida'; end if;
end $$;

grant execute on function public.chat_admin_start(uuid) to authenticated;
