import { photoSource } from '../lib/photoSource';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppIcon } from './AppIcon';
import { useLocalFavorites } from '../lib/useLocalFavorites';

export function MobileProCard({ professional: p, backTo }) {
  const location = useLocation();
  const { has, toggle } = useLocalFavorites();
  const [error, setError] = useState(false);
  const saved = has(p.id);
  const photo = photoSource(p.photo_url);
  const [failedPhoto, setFailedPhoto] = useState('');
  return <article className="home-pro-card">
    <Link to={`/profesional/${p.id}`} state={{ from: backTo || location.pathname + location.search, resultsFrom: location.state?.from || '/' }} className="home-pro-detail">
      {photo && failedPhoto !== photo ? <img src={photo} alt="" loading="lazy" onError={() => setFailedPhoto(photo)} /> : <span className="home-pro-initial">{p.display_name?.[0] || 'P'}</span>}
      <div><h3>{p.display_name}</h3><p>{p.category}</p>
        <div className="home-pro-rating"><span>★ {Number(p.rating || 0).toFixed(1)}</span><small>({p.total_reviews || 0})</small>{p.verified && <b>✓ Verificado</b>}</div>
        <p className="home-pro-city"><AppIcon name="pin" size={13} />{p.city || 'Ver ubicación'}</p>
      </div>
    </Link>
    <button type="button" className="home-save" aria-label={`${saved ? 'Quitar de' : 'Guardar en'} favoritos a ${p.display_name}`}
      aria-pressed={saved} onClick={() => setError(!toggle(p))}><AppIcon name="heart" size={20} filled={saved} /></button>
    {error && <p className="home-save-error" role="alert">No pudimos guardar el cambio en este dispositivo.</p>}
  </article>;
}
