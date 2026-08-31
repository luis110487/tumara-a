-- Internal in-app alerts for admins
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id bigint generated always as identity primary key,
  type text NOT NULL DEFAULT 'new_user',
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(is_read);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_notifications_admin_read ON public.admin_notifications;
CREATE POLICY admin_notifications_admin_read ON public.admin_notifications
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS admin_notifications_admin_update ON public.admin_notifications;
CREATE POLICY admin_notifications_admin_update ON public.admin_notifications
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Auto-create a notification whenever a new profile (user) is created
CREATE OR REPLACE FUNCTION public.notify_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, message, link)
  VALUES ('new_user', 'Nuevo usuario registrado: ' || NEW.full_name, '/admin/usuarios');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_user ON public.profiles;
CREATE TRIGGER trg_notify_new_user AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_new_user();

-- Allow realtime updates on this table (for the live bell counter)
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
