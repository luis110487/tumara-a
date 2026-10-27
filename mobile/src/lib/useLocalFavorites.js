import { useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '../context/AuthContext';

const EMPTY = '[]';
const listen = callback => {
  window.addEventListener('tm-favorites', callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener('tm-favorites', callback); window.removeEventListener('storage', callback); };
};

export function useLocalFavorites() {
  const { user } = useAuth();
  const key = `tm.favorites.${user?.id || 'guest'}`;
  const read = useCallback(() => { try { return localStorage.getItem(key) || EMPTY; } catch { return EMPTY; } }, [key]);
  const raw = useSyncExternalStore(listen, read, () => EMPTY);
  let items;
  try { const parsed = JSON.parse(raw); items = Array.isArray(parsed) ? parsed.filter(p => p && p.id != null && typeof p.display_name === 'string') : []; }
  catch { items = []; }
  function toggle(professional) {
    try {
      const parsed = JSON.parse(read());
      const current = Array.isArray(parsed) ? parsed.filter(p => p && p.id != null) : [];
      const exists = current.some(p => String(p.id) === String(professional.id));
      const { id, display_name, category, city, rating, total_reviews, verified, photo_url } = professional;
      const next = exists ? current.filter(p => String(p.id) !== String(id))
        : [...current, { id, display_name, category, city, rating, total_reviews, verified, photo_url }];
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event('tm-favorites'));
      return true;
    } catch { return false; }
  }
  return { items, toggle, has: id => items.some(p => String(p.id) === String(id)) };
}
