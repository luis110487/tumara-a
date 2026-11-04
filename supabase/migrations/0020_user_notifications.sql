-- Persistent, deduplicated product notifications and review prompts.
alter table public.service_requests add column if not exists status_changed_by uuid references public.profiles(id) on delete set null;
alter table public.service_requests add column if not exists completed_at timestamptz;

create table if not exists public.user_notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  title varchar(160) not null,
  body varchar(500) not null,
  target_path varchar(500) not null,
  request_id bigint references public.service_requests(id) on delete cascade,
  professional_id bigint references public.professionals(id) on delete cascade,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_recipient_created on public.user_notifications(recipient_id,created_at desc);
create index if not exists user_notifications_unread on public.user_notifications(recipient_id) where read_at is null;
alter table public.user_notifications enable row level security;
drop policy if exists user_notifications_own_read on public.user_notifications;
create policy user_notifications_own_read on public.user_notifications for select to authenticated using(recipient_id=auth.uid());
drop policy if exists user_notifications_own_update on public.user_notifications;
create policy user_notifications_own_update on public.user_notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
revoke insert,delete on public.user_notifications from anon,authenticated;
grant select,update on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;

create or replace function public.enqueue_user_notification(
  p_recipient uuid,p_type text,p_title text,p_body text,p_path text,p_dedupe text,
  p_request bigint default null,p_professional bigint default null
) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_recipient is null then return; end if;
  insert into public.user_notifications(recipient_id,event_type,title,body,target_path,request_id,professional_id,dedupe_key)
  values(p_recipient,p_type,left(p_title,160),left(p_body,500),left(p_path,500),p_request,p_professional,p_dedupe)
  on conflict(dedupe_key) do nothing;
  insert into public.push_outbox(recipient_id,event_key,title,body,path)
  values(p_recipient,'notification:'||p_dedupe,left(p_title,160),left(p_body,500),left(p_path,500))
  on conflict(event_key) do nothing;
end;$$;
revoke all on function public.enqueue_user_notification(uuid,text,text,text,text,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.enqueue_user_notification(uuid,text,text,text,text,text,bigint,bigint) to service_role;

create or replace function public.queue_product_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare pro_user uuid; recipient uuid; actor uuid; label text; admin_user uuid; pro_id bigint;
begin
  if tg_table_name='messages' then
    select case when new.sender_id=r.customer_id then p.user_id else r.customer_id end,r.professional_id
      into recipient,pro_id
      from public.service_requests r join public.professionals p on p.id=r.professional_id where r.id=new.request_id;
    perform public.enqueue_user_notification(recipient,'message_received','Nuevo mensaje','Tienes un nuevo mensaje sobre tu servicio.','/solicitud/'||new.request_id||'/chat','message:'||new.id,new.request_id,pro_id);
    return new;
  elsif tg_table_name='service_requests' then
    select user_id into pro_user from public.professionals where id=new.professional_id;
    if tg_op='INSERT' then
      perform public.enqueue_user_notification(pro_user,'request_created','Nueva solicitud','Recibiste una nueva solicitud de servicio.','/solicitud/'||new.id||'/chat','request:'||new.id,new.id,new.professional_id);
      return new;
    end if;
    if new.status is not distinct from old.status then return new; end if;
    actor:=new.status_changed_by;
    if new.status='completed' then
      perform public.enqueue_user_notification(new.customer_id,'review_requested','¿Cómo fue tu servicio?','El servicio fue marcado como terminado. Califica al profesional.','/solicitud/'||new.id||'/chat?review=1','review_request:'||new.id,new.id,new.professional_id);
      return new;
    end if;
    label:=case new.status when 'in_conversation' then 'El profesional abrió tu solicitud.' when 'quoted' then 'Recibiste una cotización.' when 'accepted' then 'La cotización fue aceptada.' when 'in_progress' then 'El servicio está en progreso.' when 'cancelled' then 'La solicitud fue cancelada.' else 'El estado de tu servicio cambió.' end;
    recipient:=case when actor=new.customer_id then pro_user else new.customer_id end;
    perform public.enqueue_user_notification(recipient,'request_'||new.status,'Actualización del servicio',label,'/solicitud/'||new.id||'/chat','status:'||new.id||':'||new.status,new.id,new.professional_id);
    return new;
  elsif tg_table_name='professionals' then
    if tg_op='INSERT' then
      for admin_user in select id from public.profiles where role='admin' and is_active=true loop
        perform public.enqueue_user_notification(admin_user,'professional_pending','Perfil pendiente','Hay un nuevo perfil profesional para revisar.','/admin/profesionales','professional_pending:'||new.id||':'||admin_user,null,new.id);
      end loop;
    elsif new.status is distinct from old.status then
      label:=case new.status when 'approved' then 'Tu perfil profesional fue aprobado.' when 'rejected' then 'Tu perfil profesional necesita correcciones.' when 'suspended' then 'Tu perfil profesional fue suspendido.' else 'El estado de tu perfil profesional cambió.' end;
      perform public.enqueue_user_notification(new.user_id,'professional_'||new.status,'Perfil profesional',label,'/mi-perfil-profesional','professional_status:'||new.id||':'||new.status,null,new.id);
    end if;
    return new;
  elsif tg_table_name='reviews' then
    select user_id into pro_user from public.professionals where id=new.professional_id;
    perform public.enqueue_user_notification(pro_user,'review_received','Nueva calificación','Recibiste una calificación de '||new.rating||' estrellas.','/profesional/'||new.professional_id,'review_received:'||new.id,new.request_id,new.professional_id);
    return new;
  end if;
  return new;
end;$$;
revoke all on function public.queue_product_notification() from public,anon,authenticated;

drop trigger if exists queue_request_push on public.service_requests;
drop trigger if exists queue_message_push on public.messages;
drop trigger if exists queue_professional_push on public.professionals;
drop trigger if exists queue_product_request_notification on public.service_requests;
create trigger queue_product_request_notification after insert or update of status on public.service_requests for each row execute function public.queue_product_notification();
drop trigger if exists queue_product_message_notification on public.messages;
create trigger queue_product_message_notification after insert on public.messages for each row execute function public.queue_product_notification();
drop trigger if exists queue_product_professional_notification on public.professionals;
create trigger queue_product_professional_notification after insert or update of status on public.professionals for each row execute function public.queue_product_notification();
drop trigger if exists queue_product_review_notification on public.reviews;
create trigger queue_product_review_notification after insert on public.reviews for each row execute function public.queue_product_notification();
