import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function AndroidBack() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const back = () => {
      const viewer = document.querySelector('dialog[data-photo-viewer][open],dialog[data-profile-modal][open]');
      if (viewer) { if (viewer.dataset.closeBlocked !== 'true') viewer.close(); return; }
      const origin = location.state?.from;
      const target = /^\/(?:mi-perfil|mi-perfil-profesional|mis-solicitudes|mis-servicios|servicio\/\d+|profesional\/\d+|favoritos|categorias|buscar)(?:\?.*)?$/.test(origin || '') && origin !== location.pathname + location.search ? origin : location.pathname === '/mi-perfil-profesional' ? '/mi-perfil' : '/';
      const resultsOrigin = /^(?:\/|\/(?:categorias|favoritos)(?:\?.*)?)$/.test(location.state?.resultsFrom || '') ? location.state.resultsFrom : '/';
      const returnState = target === '/mi-perfil' ? { panel: location.state?.returnPanel } : /^\/buscar(?:\?|$)/.test(target) ? { from: resultsOrigin } : /^\/profesional\//.test(target) ? { from: location.state?.profileFrom || '/', resultsFrom: location.state?.resultsFrom } : /^\/servicio\//.test(target) ? { from: location.state?.serviceFrom, profileFrom: location.state?.profileFrom, resultsFrom: location.state?.resultsFrom } : undefined;
      navigate(target, { replace: true, state: returnState });
    };
    window.addEventListener('tm:android-back', back);
    return () => window.removeEventListener('tm:android-back', back);
  }, [navigate, location.pathname, location.search, location.state]);
  return null;
}
