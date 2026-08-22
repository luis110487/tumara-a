# Deploy TuMaraña.com: Supabase + Render

## 1. Supabase

- Crear un proyecto PostgreSQL.
- Abrir SQL Editor.
- Ejecutar `supabase/schema.sql` completo.
- En Authentication > Providers, habilitar Email.
- Configurar la URL del sitio cuando el dominio esté disponible.

### Crear administrador

Después de registrar tu cuenta, consulta tu UUID en Authentication > Users y ejecuta:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DEL_USUARIO';
```

## 2. Render

Subir el repositorio a GitHub y crear un Web Service con root directory `tumarana`.

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
SECRET_KEY=<Render puede generarla>
SESSION_COOKIE_SECURE=true
FORCE_HTTPS=true
```

## 3. Pruebas antes de abrir al público

- `/health` debe devolver `{"status":"ok"}`.
- Crear cuenta.
- Confirmar login.
- Registrar profesional.
- Confirmar que queda `pending`.
- Promover administrador y aprobar profesional.
- Buscar profesional aprobado.
- Crear solicitud como cliente.
- Verificar que el profesional puede leerla.
- Enviar mensajes desde ambos usuarios.
- Confirmar Realtime.
- Confirmar que un usuario distinto recibe 403/no puede leer la solicitud.

## Seguridad

- RLS está activado en todas las tablas sensibles.
- El backend valida el JWT mediante Supabase Auth.
- Las operaciones mutantes de API no usan una service-role key.
- CSP, HSTS, X-Frame-Options y nosniff están configurados.
- No se almacenan contraseñas en la aplicación.
