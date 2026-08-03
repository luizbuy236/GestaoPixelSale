do $$
begin
  if exists (select 1 from auth.users where lower(email) = lower('admin@pixelsale.com')) then
    raise exception 'The former administrator email is still present.';
  end if;

  if (select count(*) from auth.users where lower(email) = lower('lluiz7628rd@gmail.com')) <> 1 then
    raise exception 'The new administrator email is not uniquely registered.';
  end if;

  if not exists (
    select 1
    from auth.identities identities
    join auth.users users on users.id = identities.user_id
    where lower(users.email) = lower('lluiz7628rd@gmail.com')
      and identities.provider = 'email'
      and lower(identities.identity_data ->> 'email') = lower('lluiz7628rd@gmail.com')
  ) then
    raise exception 'The administrator email identity was not updated.';
  end if;
end
$$;
