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
APP_BASE_URL=https://tumara-a.vercel.app
ACTION_TOKEN_SECRET=cadena-larga-aleatoria
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=TuMarana.com <notificaciones@tudominio.com>
SUPPORT_EMAIL=soporte@tudominio.com
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

## Seguridad y SEO

**Backend (Render)**
- La API limita las peticiones por usuario (o por IP si no hay sesión): 300 por minuto en total y límites más estrictos en
  crear solicitudes, enviar mensajes, calificar, registrarse como profesional, reiniciar contraseñas y el correo de bienvenida
  (ver `backend/app/security.py`). El límite vive en memoria de cada proceso de gunicorn, así que el efectivo es algo mayor.
- Las respuestas de error ya no incluyen el detalle interno de Supabase; se registra en el log del servidor.
  Para depurar de forma temporal se puede definir `EXPOSE_ERRORS=true` (nunca en producción).
- Un corte de red hacia Supabase devuelve un error JSON controlado (502/503) en lugar de un error 500 sin control.
- Los cuerpos de más de 2 MB se rechazan (413) antes de consultar a Supabase.
- `GET /sitemap.xml` genera el mapa del sitio con los profesionales aprobados.
- Pruebas: `cd backend && python -m unittest discover -s tests`.

**Web (Vercel)**
- `frontend/vercel.json` añade la política de seguridad de contenido (CSP), HSTS, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` y caché larga para `/assets`. Reescribe `/sitemap.xml` hacia el backend.
- Si se incorpora un servicio externo nuevo (analítica, mapas, fuentes, chat), hay que añadir su dominio a
  `script-src`, `connect-src`, `img-src` o `font-src` en esa política o el navegador lo bloqueará.
- SEO: `frontend/index.html` (metadatos, Open Graph, datos estructurados), `public/robots.txt`, `public/site.webmanifest`,
  `public/og-image.png`, y `src/lib/seo.js` + `src/components/RouteSeo.jsx` para el título, descripción y URL canónica de cada
  pantalla. Las pantallas privadas se marcan `noindex`. Cada perfil de profesional publica datos estructurados `ProfessionalService`.
- Si el dominio de producción cambia, actualizar `SITE_URL` en `src/lib/seo.js`, las URL de `index.html` y de `robots.txt`.

**APK (Android)**
- `allowBackup="false"` (los datos de sesión no se incluyen en copias de seguridad) y tráfico sin cifrar bloqueado
  (`network_security_config.xml`).
- La APK entregada es `release`, no depurable. Está firmada con la llave de depuración existente para que se instale como
  actualización; **antes de publicar en Google Play hay que firmar con una llave de producción propia** (y guardarla en un lugar seguro:
  si se pierde no se pueden publicar más actualizaciones).

