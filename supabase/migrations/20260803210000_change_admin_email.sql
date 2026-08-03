do $$
declare
  admin_user_id uuid;
begin
  if exists (select 1 from auth.users where lower(email) = lower('lluiz7628rd@gmail.com')) then
    raise notice 'The target administrator email already exists; no change was needed.';
    return;
  end if;

  select id into admin_user_id
  from auth.users
  where lower(email) = lower('admin@pixelsale.com');

  if admin_user_id is null then
    raise exception 'Administrator user admin@pixelsale.com was not found.';
  end if;

  update auth.users
  set email = 'lluiz7628rd@gmail.com',
      email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_confirm_status = 0,
      updated_at = now()
  where id = admin_user_id;

  update auth.identities
  set identity_data = jsonb_set(
        jsonb_set(identity_data, '{email}', to_jsonb('lluiz7628rd@gmail.com'::text), true),
        '{email_verified}', 'true'::jsonb, true
      ),
      updated_at = now()
  where user_id = admin_user_id and provider = 'email';
end
$$;
