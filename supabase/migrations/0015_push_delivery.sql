-- Durable Android push delivery. Apply using Supabase SQL Editor as project owner.
create table if not exists public.push_devices (
 installation_id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
 token text not null unique check (length(token) between 10 and 4096), enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
create index if not exists push_devices_user on public.push_devices(user_id) where enabled;
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
grant all on public.push_devices to service_role;
create table if not exists public.push_outbox (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id) on delete cascade,
 event_key text not null unique, title text not null, body text not null, path text not null,
 status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
 attempts integer not null default 0, available_at timestamptz not null default now(), locked_at timestamptz,
 created_at timestamptz not null default now(), sent_at timestamptz, last_error text
);
create index if not exists push_outbox_ready on public.push_outbox(available_at) where status in ('pending','processing');
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;
grant all on public.push_outbox to service_role;
create table if not exists public.push_receipts (
 event_id uuid not null references public.push_outbox(id) on delete cascade,
 installation_id uuid not null references public.push_devices(installation_id) on delete cascade,
 delivered_at timestamptz not null default now(), primary key(event_id,installation_id)
);
alter table public.push_receipts enable row level security;
revoke all on public.push_receipts from anon,authenticated;
grant all on public.push_receipts to service_role;
create or replace function public.claim_push_outbox(p_limit integer default 25)
returns setof public.push_outbox language sql security definer set search_path=public as $$
 update public.push_outbox set status='processing',locked_at=now(),attempts=attempts+1
 where id in (select id from public.push_outbox where attempts<10 and available_at<=now()
 and (status='pending' or (status='processing' and locked_at<now()-interval '5 minutes'))
 order by created_at for update skip locked limit greatest(1,least(p_limit,100))) returning *;
$$;
revoke all on function public.claim_push_outbox(integer) from public,anon,authenticated;
grant execute on function public.claim_push_outbox(integer) to service_role;
create or replace function public.queue_activity_push() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid; route text; kind text; message text; pro_id uuid; admin_id uuid;
begin
 if tg_table_name='messages' then
  select case when new.sender_id=r.customer_id then p.user_id else r.customer_id end into recipient
  from public.service_requests r join public.professionals p on p.id=r.professional_id where r.id=new.request_id;
  route='/solicitud/'||new.request_id||'/chat';kind='message:'||new.id;message='Tienes un nuevo mensaje sobre tu servicio.';
 elsif tg_table_name='service_requests' then
  select user_id into pro_id from public.professionals where id=new.professional_id;
  route='/solicitud/'||new.id||'/chat';
  if tg_op='INSERT' then recipient=pro_id;kind='request:'||new.id;message='Recibiste una nueva solicitud de servicio.';
  elsif new.status is distinct from old.status then
   foreach recipient in array array[new.customer_id,pro_id] loop
    if recipient is not null then insert into public.push_outbox(recipient_id,event_key,title,body,path)
    values(recipient,'status:'||new.id||':'||new.updated_at||':'||recipient,'TuMaraña','El estado de tu servicio cambió.',route) on conflict(event_key) do nothing;end if;
   end loop;return new;
  else return new;end if;
 elsif tg_table_name='professionals' then
  if tg_op='INSERT' then
   for admin_id in select id from public.profiles where role='admin' and is_active=true loop
    insert into public.push_outbox(recipient_id,event_key,title,body,path) values(admin_id,'new_profile:'||new.id||':'||admin_id,'TuMaraña','Hay un nuevo perfil profesional para revisar.','/admin/profesionales') on conflict(event_key) do nothing;
   end loop;return new;
  elsif new.status is distinct from old.status then
   recipient=new.user_id;route='/mi-perfil-profesional';kind='profile:'||new.id||':'||new.status||':'||gen_random_uuid();message='El estado de tu perfil profesional cambió.';
  else return new;end if;
 else return new;end if;
 if recipient is not null then insert into public.push_outbox(recipient_id,event_key,title,body,path)
 values(recipient,kind,'TuMaraña',message,route) on conflict(event_key) do nothing;end if;
 return new;
end;$$;
revoke all on function public.queue_activity_push() from public,anon,authenticated;
drop trigger if exists queue_request_push on public.service_requests;
create trigger queue_request_push after insert or update of status on public.service_requests for each row execute function public.queue_activity_push();
drop trigger if exists queue_message_push on public.messages;
create trigger queue_message_push after insert on public.messages for each row execute function public.queue_activity_push();
drop trigger if exists queue_professional_push on public.professionals;
create trigger queue_professional_push after insert or update of status on public.professionals for each row execute function public.queue_activity_push();
