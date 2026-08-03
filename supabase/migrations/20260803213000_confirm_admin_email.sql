update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmation_token = '',
    updated_at = now()
where lower(email) = lower('lluiz7628rd@gmail.com');
