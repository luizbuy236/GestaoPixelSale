-- The first staff reply starts the service automatically, so an open
-- conversation can be answered without a separate "start" action.
create or replace function public.chat_admin_send(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_body text:=trim(p_body);
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if char_length(v_body) not between 1 and 2000 then raise exception 'Mensagem inválida'; end if;
  if not exists(select 1 from public.support_conversations where id=p_conversation_id and status<>'closed') then raise exception 'Conversa inválida ou encerrada'; end if;
  insert into public.support_messages(conversation_id,sender,body) values(p_conversation_id,'admin',v_body) returning id into v_message;
  update public.support_conversations
  set unread_customer=unread_customer+1,
      atendimento_started_at=coalesce(atendimento_started_at,now()),
      last_customer_activity=now(),
      updated_at=now()
  where id=p_conversation_id;
  return v_message;
end $$;

create or replace function public.chat_admin_send_sticker(p_conversation_id uuid,p_media_data text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_media text:=trim(p_media_data);
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if char_length(v_media)>500000 or v_media !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then raise exception 'Figurinha inválida'; end if;
  if not exists(select 1 from public.support_conversations where id=p_conversation_id and status<>'closed') then raise exception 'Conversa inválida ou encerrada'; end if;
  insert into public.support_messages(conversation_id,sender,body,message_type,media_data)
  values(p_conversation_id,'admin','Figurinha','image',v_media) returning id into v_message;
  update public.support_conversations
  set unread_customer=unread_customer+1,
      atendimento_started_at=coalesce(atendimento_started_at,now()),
      last_customer_activity=now(),
      updated_at=now()
  where id=p_conversation_id;
  return v_message;
end $$;

grant execute on function public.chat_admin_send(uuid,text) to authenticated;
grant execute on function public.chat_admin_send_sticker(uuid,text) to authenticated;
