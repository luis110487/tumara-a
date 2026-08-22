# Deploy TuMaraña.com: Supabase + Render + Vercel

## 1. Supabase

- Crear un proyecto PostgreSQL.
- Abrir SQL Editor.
- Ejecutar `supabase/schema.sql` completo.
- Ejecutar cada archivo en `supabase/migrations/` en orden (ej. `0002_add_professional_whatsapp.sql`).
- En Authentication > Providers, habilitar Email.
- Configurar la URL del sitio cuando el dominio esté disponible.

### Crear administrador

Después de registrar tu cuenta, consulta tu UUID en Authentication > Users y ejecuta:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DEL_USUARIO';
```

## 2. Backend en Render

Subir el repositorio a GitHub y crear un Web Service con root directory `backend` (ya configurado en `backend/render.yaml`).

Build:

```text
pip install -r requirements.txt
```

Start:

```text
gunicorn --workers 2 --threads 4 --timeout 60 -b 0.0.0.0:$PORT "app:create_app()"
```

Variables:

```text
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
FRONTEND_ORIGIN=https://tumarana.vercel.app
FORCE_HTTPS=true
```

## 3. Frontend en Vercel

Crear un proyecto apuntando a la carpeta `frontend` (build Vite, configurado en `frontend/vercel.json`).

Variables (Project Settings, con prefijo `VITE_` para que Vite las incluya en el build):

```text
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

Actualizar en `frontend/vercel.json` los dos `REPLACE_WITH_RENDER_BACKEND` con el dominio real de Render antes de desplegar.

## 4. Pruebas antes de abrir al público

- `/health` debe devolver `{"status":"ok"}`.
- Crear cuenta.
- Confirmar login.
- Registrar profesional (incluyendo WhatsApp opcional).
- Confirmar que queda `pending`.
- Promover administrador y aprobar profesional.
- Buscar profesional aprobado, verificar botón de WhatsApp en su perfil.
- Crear solicitud como cliente.
- Verificar que el profesional puede leerla.
- Enviar mensajes desde ambos usuarios y confirmar Realtime.
- Cambiar el estado de la solicitud desde el chat y verificar que se refleja para ambos.
- Revisar "Mis solicitudes" como cliente y como profesional.
- Confirmar que un usuario distinto recibe 403/no puede leer ni modificar la solicitud.
- Confirmar que las llamadas del frontend en Vercel a la API en Render no muestran errores de CORS.

## Seguridad

- RLS está activado en todas las tablas sensibles.
- El backend valida el JWT mediante Supabase Auth (Bearer token, sin cookies de sesión).
- Las operaciones mutantes de API no usan una service-role key.
- CORS restringido al dominio del frontend (`FRONTEND_ORIGIN`).
- Cabeceras de seguridad (HSTS, X-Frame-Options, nosniff, etc.) configuradas en el backend.
- No se almacenan contraseñas en la aplicación.
