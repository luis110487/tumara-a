# TuMaraña: acceso, correo y push

Cambios preparados localmente; no se han desplegado en Vercel/Render ni ejecutado migraciones en Supabase. No se han enviado correos ni notificaciones reales.

## Validación

- Compilación de frontend APK y frontend web correcta.
- Pruebas de interfaz con API/Auth simuladas: escritura por letra conserva nodo y foco en ambos campos; recuperación distingue rechazo SMTP de éxito; navegación y formularios conservan regresiones anteriores.
- 15 pruebas del servidor: autenticación y propietario del dispositivo, errores del proveedor de correo, escape HTML, reintentos push, recibos y tokens vencidos.
- Migración SQL analizada sintácticamente; pendiente validación en una base de pruebas antes de producción.
- El ajuste Android usa `adjustPan` solo durante acceso y restaura `adjustResize` al salir. Pendiente comprobar el teclado físico del móvil afectado.

## Supabase y correo

Todavía no hay conexión autorizada de Supabase disponible en esta sesión. No se ha podido leer Custom SMTP ni Auth logs. Instalar/conectar la integración de Supabase al proyecto permite continuar la auditoría; no compartir contraseñas en el chat.

1. Consultar Authentication → Email → SMTP y Auth logs para identificar el rechazo exacto. El mensaje del navegador no identifica por sí solo la causa.
2. Configurar SMTP de un proveedor verificado para `info@techdatasync.com`. El envío Auth de Supabase y el envío transaccional del backend son configuraciones distintas.
3. Comprobar dominio, DKIM, SPF y Return-Path en el panel del proveedor. La consulta pública detectó SPF `include:spf.spacemail.com`, DMARC `p=none`, DKIM de Resend publicado y ausencia de `send.techdatasync.com`; esto solo es relevante si ese es el Return-Path configurado. No añadir un segundo registro SPF.
4. Desactivar seguimiento de enlaces en correos de autenticación y comprobar los encabezados de un correo de prueba. No se puede garantizar que ningún destinatario lo clasifique como spam.
5. Revisar Site URL y allowlist exacta del destino HTTPS de recuperación usado por Account. Probar último enlace, vencido y ya utilizado. La APK usa recuperación HTTPS en navegador; no se ha implementado un deep link Android de retorno.
6. Backend: configurar `RESEND_API_KEY`, `EMAIL_FROM` con remitente verificado y `SUPPORT_EMAIL=info@techdatasync.com`. Nunca incluir claves de servicio en frontend/APK.

Referencias oficiales: [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [redirects](https://supabase.com/docs/guides/auth/redirect-urls), [dominios Resend](https://resend.com/docs/dashboard/domains/introduction).

## Activar push Android

La APK incluye integración, pero NO recibe push todavía: no existe un proyecto Firebase configurado.

1. Crear proyecto Firebase y aplicación Android con paquete `com.tumarana.app`. Incorporar su `google-services.json` a `android/app/` y recompilar. El archivo de cuenta de servicio nunca va en la APK.
2. Validar y aplicar `supabase/migrations/0015_push_delivery.sql` después de las migraciones existentes, primero en pruebas. Crea dispositivos, cola, recibos y triggers para solicitudes, mensajes y aprobación de perfiles. Las tablas quedan reservadas al servidor.
3. Desplegar el backend actualizado con `SUPABASE_SERVICE_ROLE_KEY` y credenciales FCM de servidor mediante `FCM_SERVICE_ACCOUNT_JSON` o `GOOGLE_APPLICATION_CREDENTIALS`. Activar la API FCM HTTP v1 del proyecto.
4. Ejecutar un worker persistente con `python push_worker.py` desde backend. Necesita instalar requirements y las mismas variables del backend. No se ha creado un worker ni contratado infraestructura.
5. Instalar APK recompilada, ingresar y activar notificaciones en Perfil. Probar Android 13+, permiso denegado, segundo plano, aplicación cerrada, logout/cambio de cuenta, expiración del token y apertura del destino correcto. La entrega está sujeta a permisos y restricciones del sistema.
6. Revisar cola y recibos: no se marca éxito sin dispositivos, tokens vencidos se desactivan y fallos se reintentan. Tras 10 intentos quedan para inspección. FCM aceptado no equivale a notificación vista por la persona.

La web conserva avisos/correos existentes y recuperación mejorada. No se ha añadido Web Push al navegador.

Referencias oficiales: [Firebase Android](https://firebase.google.com/docs/cloud-messaging/android/get-started), [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api).
