import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { setSeo, SITE_NAME } from '../lib/seo';

// Pantallas privadas o sin valor para buscadores: se marcan noindex.
const PRIVATE = [/^\/admin/, /^\/cuenta/, /^\/restablecer-contrasena/, /^\/mi-perfil/, /^\/mis-solicitudes/, /^\/solicitud\//, /^\/solicitar\//, /^\/registrar/, /^\/notificaciones/];

export function RouteSeo() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (PRIVATE.some(pattern => pattern.test(pathname))) { setSeo({ title: SITE_NAME, noindex: true, path: pathname }); return; }
    if (pathname === '/') { setSeo({ path: '/' }); return; }
    if (pathname === '/buscar') {
      const params = new URLSearchParams(search);
      const q = (params.get('q') || '').trim().slice(0, 60), city = (params.get('city') || '').trim().slice(0, 60);
      const what = q || 'Profesionales';
      const where = city ? ` en ${city}` : '';
      const canonical = new URLSearchParams();
      if (q) canonical.set('q', q);
      if (city) canonical.set('city', city);
      setSeo({
        title: `${what}${where} | ${SITE_NAME}`,
        description: `Encuentra ${q ? q.toLowerCase() : 'profesionales verificados'}${where} en TuMaraña.com: compara perfiles, calificaciones y solicita tu servicio.`,
        path: `/buscar${canonical.size ? `?${canonical}` : ''}`,
      });
      return;
    }
    // El perfil de un profesional completa su SEO cuando termina de cargar sus datos.
    if (/^\/profesional\//.test(pathname)) { setSeo({ title: `Perfil de profesional | ${SITE_NAME}`, path: pathname }); return; }
    setSeo({ title: `Página no encontrada | ${SITE_NAME}`, noindex: true, path: pathname });
  }, [pathname, search]);
  return null;
}
