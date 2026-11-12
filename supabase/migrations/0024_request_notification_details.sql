-- La notificación de una nueva solicitud indica quién la envía y qué servicio pidió.
create or replace function public.queue_product_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare pro_user uuid; recipient uuid; actor uuid; label text; admin_user uuid; pro_id bigint; customer_name text;
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
      select coalesce(nullif(trim(full_name),''),'Un cliente') into customer_name from public.profiles where id=new.customer_id;
      perform public.enqueue_user_notification(pro_user,'request_created','Nueva solicitud de '||coalesce(customer_name,'un cliente'),coalesce(customer_name,'Un cliente')||' solicitó: '||new.service_title,'/solicitud/'||new.id||'/chat','request:'||new.id,new.id,new.professional_id);
      return new;
    end if;
    if new.status is not distinct from old.status then return new; end if;
    actor:=new.status_changed_by;
    if new.status='completed' then
      perform public.enqueue_user_notification(new.customer_id,'review_requested','¿Cómo fue tu servicio?','El servicio "'||new.service_title||'" fue marcado como terminado. Califica al profesional.','/solicitud/'||new.id||'/chat?review=1','review_request:'||new.id,new.id,new.professional_id);
      return new;
    end if;
    label:=case new.status when 'in_conversation' then 'El profesional abrió tu solicitud.' when 'quoted' then 'Recibiste una cotización.' when 'accepted' then 'La cotización fue aceptada.' when 'in_progress' then 'El servicio está en progreso.' when 'cancelled' then 'La solicitud fue cancelada.' else 'El estado de tu servicio cambió.' end;
    recipient:=case when actor=new.customer_id then pro_user else new.customer_id end;
    perform public.enqueue_user_notification(recipient,'request_'||new.status,'Actualización del servicio',label||' ('||new.service_title||')','/solicitud/'||new.id||'/chat','status:'||new.id||':'||new.status,new.id,new.professional_id);
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
