-- Ejecutar completo en Supabase > SQL Editor (0025, 0026 y 0027 en este orden). 0024 ya no hace falta: 0026 lo reemplaza.

-- Hasta 10 fotos de evidencia por solicitud y archivos adjuntos (imágenes y documentos) en el chat.
begin;
create or replace function public.valid_request_photos(items jsonb) returns boolean
language sql immutable set search_path=public as $$
 select case when jsonb_typeof(items)='array' then jsonb_array_length(items)<=10 and not exists(
  select 1 from jsonb_array_elements(items) item where jsonb_typeof(item)<>'string'
  or length(item #>> '{}') not between 1 and 1000) else false end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('chat-files','chat-files',true,10485760,array[
 'image/jpeg','image/png','image/webp','application/pdf','text/plain',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists chat_files_read on storage.objects;
create policy chat_files_read on storage.objects for select using(bucket_id='chat-files');
drop policy if exists chat_files_insert on storage.objects;
create policy chat_files_insert on storage.objects for insert to authenticated with check(
 bucket_id='chat-files' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists chat_files_delete on storage.objects;
create policy chat_files_delete on storage.objects for delete to authenticated using(
 bucket_id='chat-files' and (storage.foldername(name))[1]=auth.uid()::text
);
commit;

-- Todas las notificaciones y pushes indican el nombre de quien actúa (cliente o marañero con su oficio).
create or replace function public.queue_product_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare pro_user uuid; recipient uuid; actor uuid; label text; admin_user uuid; pro_id bigint; customer_name text; pro_name text; actor_name text; reviewer_name text;
begin
  if tg_table_name='messages' then
    select coalesce(nullif(trim(pr.full_name),''),'Alguien') into actor_name from public.profiles pr where pr.id=new.sender_id;
    select case when new.sender_id=r.customer_id then p.user_id else r.customer_id end,r.professional_id
      into recipient,pro_id
      from public.service_requests r join public.professionals p on p.id=r.professional_id where r.id=new.request_id;
    select 'El marañero '||trim(p.display_name||' '||coalesce(c.name,'')) into pro_name from public.professionals p left join public.categories c on c.id=p.category_id where p.id=pro_id;
    if new.sender_id is distinct from (select customer_id from public.service_requests where id=new.request_id) then actor_name:=coalesce(pro_name,'El marañero'); end if;
    perform public.enqueue_user_notification(recipient,'message_received','Mensaje de '||actor_name,actor_name||' te envió un mensaje.','/solicitud/'||new.request_id||'/chat','message:'||new.id,new.request_id,pro_id);
    return new;
  elsif tg_table_name='service_requests' then
    select user_id into pro_user from public.professionals where id=new.professional_id;
    if tg_op='INSERT' then
      select coalesce(nullif(trim(full_name),''),'Un cliente') into customer_name from public.profiles where id=new.customer_id;
      perform public.enqueue_user_notification(pro_user,'request_created',coalesce(customer_name,'Un cliente')||' te envió una solicitud',coalesce(customer_name,'Un cliente')||' te envió una solicitud: '||new.service_title,'/solicitud/'||new.id||'/chat','request:'||new.id,new.id,new.professional_id);
      return new;
    end if;
    if new.status is not distinct from old.status then return new; end if;
    actor:=new.status_changed_by;
    select p.display_name||' '||coalesce(c.name,'') into pro_name from public.professionals p left join public.categories c on c.id=p.category_id where p.id=new.professional_id;
    pro_name:=trim(coalesce(pro_name,'El marañero'));
    select coalesce(nullif(trim(full_name),''),'El cliente') into customer_name from public.profiles where id=new.customer_id;
    if new.status='completed' then
      perform public.enqueue_user_notification(new.customer_id,'review_requested','Califica a '||pro_name,pro_name||' marcó el servicio "'||new.service_title||'" como terminado. Califica al marañero.','/solicitud/'||new.id||'/chat?review=1','review_request:'||new.id,new.id,new.professional_id);
      return new;
    end if;
    actor_name:=case when actor=new.customer_id then customer_name else 'El marañero '||pro_name end;
    label:=actor_name||case new.status when 'in_conversation' then ' abrió tu solicitud.' when 'quoted' then ' te envió una cotización.' when 'accepted' then ' aceptó la solicitud.' when 'in_progress' then ' puso el servicio en progreso.' when 'cancelled' then ' canceló la solicitud.' else ' cambió el estado del servicio.' end;
    recipient:=case when actor=new.customer_id then pro_user else new.customer_id end;
    perform public.enqueue_user_notification(recipient,'request_'||new.status,actor_name,label||' ('||new.service_title||')','/solicitud/'||new.id||'/chat','status:'||new.id||':'||new.status,new.id,new.professional_id);
    return new;
  elsif tg_table_name='professionals' then
    if tg_op='INSERT' then
      for admin_user in select id from public.profiles where role='admin' and is_active=true loop
        perform public.enqueue_user_notification(admin_user,'professional_pending','Perfil pendiente','Hay un nuevo perfil de marañero para revisar.','/admin/profesionales','professional_pending:'||new.id||':'||admin_user,null,new.id);
      end loop;
    elsif new.status is distinct from old.status then
      label:=case new.status when 'approved' then 'Tu perfil de marañero fue aprobado.' when 'rejected' then 'Tu perfil de marañero necesita correcciones.' when 'suspended' then 'Tu perfil de marañero fue suspendido.' else 'El estado de tu perfil de marañero cambió.' end;
      perform public.enqueue_user_notification(new.user_id,'professional_'||new.status,'Perfil de marañero',label,'/mi-perfil-profesional','professional_status:'||new.id||':'||new.status,null,new.id);
    end if;
    return new;
  elsif tg_table_name='reviews' then
    select user_id into pro_user from public.professionals where id=new.professional_id;
    select coalesce(nullif(trim(full_name),''),'Un cliente') into reviewer_name from public.profiles where id=new.customer_id;
    perform public.enqueue_user_notification(pro_user,'review_received','Calificación de '||reviewer_name,reviewer_name||' te calificó con '||new.rating||' estrellas.','/profesional/'||new.professional_id,'review_received:'||new.id,new.request_id,new.professional_id);
    return new;
  end if;
  return new;
end;$$;
revoke all on function public.queue_product_notification() from public,anon,authenticated;

-- El marañero puede publicar hasta 10 fotos de trabajos realizados.
alter table public.professionals add column if not exists evidence_url_3 text;
alter table public.professionals add column if not exists evidence_url_4 text;
alter table public.professionals add column if not exists evidence_url_5 text;
alter table public.professionals add column if not exists evidence_url_6 text;
alter table public.professionals add column if not exists evidence_url_7 text;
alter table public.professionals add column if not exists evidence_url_8 text;
alter table public.professionals add column if not exists evidence_url_9 text;
alter table public.professionals add column if not exists evidence_url_10 text;
