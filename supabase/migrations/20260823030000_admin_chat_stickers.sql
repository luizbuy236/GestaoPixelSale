create or replace function public.chat_admin_send_sticker(p_conversation_id uuid,p_media_data text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_media text:=trim(p_media_data);
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  if char_length(v_media)>500000 or v_media !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then raise exception 'Figurinha inválida'; end if;
  if not exists(select 1 from public.support_conversations where id=p_conversation_id and status<>'closed' and atendimento_started_at is not null) then raise exception 'Inicie o atendimento antes de enviar figurinha'; end if;
  insert into public.support_messages(conversation_id,sender,body,message_type,media_data)
  values(p_conversation_id,'admin','Figurinha','image',v_media) returning id into v_message;
  update public.support_conversations set unread_customer=unread_customer+1,updated_at=now() where id=p_conversation_id;
  return v_message;
end $$;

grant execute on function public.chat_admin_send_sticker(uuid,text) to authenticated;
