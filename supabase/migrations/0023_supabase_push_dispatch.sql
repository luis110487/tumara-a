-- Claim queued pushes for the Supabase Edge Function without altering message expiry.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.claim_push_outbox(p_limit integer default 25)
returns setof public.push_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.push_outbox
  set status='failed',last_error='expired_or_exhausted'
  where status in ('pending','processing')
    and (expires_at<=now() or (attempts>=10 and (status='pending' or locked_at<now()-interval '2 minutes')));

  return query
  with candidates as (
    select id
    from public.push_outbox
    where attempts < 10
      and available_at <= now()
      and expires_at > now()
      and (status='pending' or (status='processing' and locked_at<now()-interval '2 minutes'))
    order by available_at,id
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,25),100))
  )
  update public.push_outbox queue
  set status='processing',attempts=queue.attempts+1,locked_at=now(),claim_token=gen_random_uuid()
  from candidates
  where queue.id=candidates.id
  returning queue.*;
end;
$$;

revoke all on function public.claim_push_outbox(integer) from public,anon,authenticated;
grant execute on function public.claim_push_outbox(integer) to service_role;

