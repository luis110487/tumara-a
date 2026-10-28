-- Apply after 0015. Service-role access only; no public token reads.
alter table public.push_devices add column if not exists platform text not null default 'android' check (platform in ('android','web'));
alter table public.push_outbox add column if not exists claim_token uuid;
alter table public.push_outbox add column if not exists expires_at timestamptz not null default (now()+interval '24 hours');

create or replace function public.claim_push_outbox(p_limit integer default 1)
returns setof public.push_outbox language plpgsql security definer set search_path=public as $$
begin
 update public.push_outbox set status='failed',last_error='expired_or_exhausted'
 where status in ('pending','processing') and (expires_at<=now() or (attempts>=10 and (status='pending' or locked_at<now()-interval '5 minutes')));
 return query update public.push_outbox set status='processing',locked_at=now(),attempts=attempts+1,claim_token=gen_random_uuid()
 where id in (select id from public.push_outbox where attempts<10 and available_at<=now() and expires_at>now()
 and (status='pending' or (status='processing' and locked_at<now()-interval '5 minutes'))
 order by created_at for update skip locked limit 1) returning *;
end;$$;
revoke all on function public.claim_push_outbox(integer) from public,anon,authenticated;
grant execute on function public.claim_push_outbox(integer) to service_role;
