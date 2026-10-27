import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AndroidBack() {
  const navigate = useNavigate();
  useEffect(() => {
    const back = () => {
      const viewer = document.querySelector('dialog[data-photo-viewer][open]');
      if (viewer) { viewer.close(); return; }
      navigate('/', { replace: true });
    };
    window.addEventListener('tm:android-back', back);
    return () => window.removeEventListener('tm:android-back', back);
  }, [navigate]);
  return null;
}
