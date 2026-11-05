-- Queue one 24-hour and one 1-hour reminder for each accepted service.
-- Dedupe keys make repeated worker executions safe.
create or replace function public.queue_due_service_reminders()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  service record;
  professional_user uuid;
  reminder_kind text;
  reminder_title text;
  reminder_body text;
  queued integer := 0;
begin
  for service in
    select id,customer_id,professional_id,service_title,preferred_date
    from public.service_requests
    where status in ('accepted','in_progress')
      and preferred_date is not null
      and preferred_date >= now()
      and preferred_date <= now() + interval '24 hours'
  loop
    select user_id into professional_user
    from public.professionals
    where id=service.professional_id;

    if service.preferred_date <= now() + interval '1 hour' then
      reminder_kind := '1h';
      reminder_title := 'Tu servicio comienza pronto';
      reminder_body := service.service_title || ' está programado dentro de una hora.';
    else
      reminder_kind := '24h';
      reminder_title := 'Servicio programado para mañana';
      reminder_body := service.service_title || ' está programado dentro de las próximas 24 horas.';
    end if;

    perform public.enqueue_user_notification(
      service.customer_id,'service_reminder_'||reminder_kind,reminder_title,reminder_body,
      '/solicitud/'||service.id||'/chat',
      'service_reminder:'||reminder_kind||':'||service.id||':'||service.customer_id,
      service.id,service.professional_id
    );
    perform public.enqueue_user_notification(
      professional_user,'service_reminder_'||reminder_kind,reminder_title,reminder_body,
      '/solicitud/'||service.id||'/chat',
      'service_reminder:'||reminder_kind||':'||service.id||':'||professional_user,
      service.id,service.professional_id
    );
    queued := queued + case when professional_user is null then 1 else 2 end;
  end loop;
  return queued;
end;
$$;

revoke all on function public.queue_due_service_reminders() from public,anon,authenticated;
grant execute on function public.queue_due_service_reminders() to service_role;
