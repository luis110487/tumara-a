# APK TuMaraña

Esta carpeta contiene la aplicación Android y su interfaz independiente de frontend/ (web).

1. Instalar dependencias con npm ci.
2. Configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local (usar solo clave pública).
3. Ejecutar npm run build y npx cap sync android.
4. Desde android/, ejecutar gradlew.bat assembleDebug con Java 17 y Android SDK configurados.

Consultar ../docs/notificaciones-v16.md antes de activar push. Firebase y SMTP siguen pendientes de configuración externa.
