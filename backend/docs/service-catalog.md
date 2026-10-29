# Catálogo de servicios — entrega inicial

## Alcance

APK React/Capacitor: administración por propietario en `/mis-servicios`, detalle público en `/servicio/:id`, servicios en el perfil, selección en `/solicitar/:professionalId?service=:serviceId` y condiciones originales en los detalles del chat. La web conserva su interfaz actual. Compartir desde el detalle envía el enlace público existente del profesional, con el título del servicio; no presupone una ruta web de detalle aún no implementada.

Precio desde en COP o a convenir. Duración, garantía y materiales son opcionales. No se cobran pagos ni se confirma automáticamente la contratación. Activar servicios no aprueba perfiles: solo se publican cuando la cuenta está activa y el perfil aprobado.

## Activación (en este orden)

1. Ejecutar `supabase/migrations/0017_professional_services.sql` en SQL Editor como propietario. Es aditiva, conserva las solicitudes existentes y crea el bucket `service-photos`.
2. Desplegar backend con `app/service_catalog.py`, `app/routes.py` y `app/__init__.py` actualizados. No necesita nuevas claves, Firebase ni otro servicio en Render.
3. Instalar la nueva APK.
4. Con dos cuentas de prueba: crear un servicio, solicitarlo desde la otra cuenta, editar después el precio y comprobar que los detalles de la solicitud mantienen las condiciones originales. Comprobar también RLS desde Supabase con usuarios distintos y acceso anónimo.

## Seguridad y datos

- API determina el propietario desde el JWT. RLS protege lecturas/escrituras y restringe publicación a perfiles aprobados y cuentas activas.
- Fotografía: JPG/PNG/WebP, máximo almacenado 5 MB; entrada móvil hasta 20 MB con optimización compartida. Rutas dentro de `service-photos/<user-id>/...`.
- Creaciones incluyen UUID de idempotencia por borrador. Reintentos no duplican registros; reusar el UUID con datos distintos devuelve 409.
- No se elimina físicamente el servicio: se desactiva para conservar referencias.
- Trigger de base de datos captura título y condiciones al insertar una solicitud. No acepta snapshots del cliente. Bloquea cambios posteriores de servicio, snapshot y título en esas solicitudes; bloquea servicios retirados o de otro profesional.
- Las fotos antiguas no se borran automáticamente porque pueden estar referenciadas por solicitudes históricas.

## Validación disponible

18 pruebas unitarias/API del catálogo, 15 pruebas previas de push/correo y 18 comprobaciones de interfaz con API simulada. Compilación de frontend; sintaxis SQL analizada con pglast. Los tests de API simulada no sustituyen una prueba de RLS y triggers en PostgreSQL real. Migración, despliegue y validación con cuentas reales pendientes de acceso al entorno.

## Compatibilidad y reversión

La solicitud sin servicio sigue admitida. Aplicar la migración antes del backend porque las lecturas incluyen los nuevos campos. Para revertir la aplicación, conservar tablas, bucket, snapshots y columnas y volver al backend/APK anteriores; no eliminar datos ni snapshots para una reversión visual.
