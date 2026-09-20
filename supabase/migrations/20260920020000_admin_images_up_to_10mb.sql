create or replace function public.chat_admin_send_image(p_conversation_id uuid,p_media_data text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_message uuid; v_media text:=trim(p_media_data);
begin
  if auth.uid() is null then raise exception 'Não autorizado'; end if;
  -- A 10 MB binary file grows to roughly 13.4 MB when encoded as Base64.
  if char_length(v_media)>14000000 or v_media !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' then
    raise exception 'Imagem inválida ou maior que 10 MB';
  end if;
  if not exists(select 1 from public.support_conversations where id=p_conversation_id and status<>'closed') then
    raise exception 'Conversa inválida ou encerrada';
  end if;
  insert into public.support_messages(conversation_id,sender,body,message_type,media_data)
  values(p_conversation_id,'admin','Imagem','image',v_media) returning id into v_message;
  update public.support_conversations
  set unread_customer=unread_customer+1,
      atendimento_started_at=coalesce(atendimento_started_at,now()),
      last_customer_activity=now(),
      updated_at=now()
  where id=p_conversation_id;
  return v_message;
end $$;

grant execute on function public.chat_admin_send_image(uuid,text) to authenticated;
