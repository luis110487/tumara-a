import { Link } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { MobileProCard } from '../components/MobileProCard';
import { useLocalFavorites } from '../lib/useLocalFavorites';

export function Favorites() {
  const { items } = useLocalFavorites();
  return <section className="mobile-favorites">
    <header className="mobile-page-title"><Link to="/" aria-label="Volver al inicio"><AppIcon name="back" /></Link><h1>Mis favoritos</h1></header>
    <p className="home-local-note">Guardados en este dispositivo.</p>
    {items.length ? <div className="home-pro-list">{items.map(p => <MobileProCard key={p.id} professional={p} />)}</div>
      : <div className="home-empty"><AppIcon name="heart" size={35} /><h2>Encuentra a tu profesional ideal</h2><p>Toca el corazón de un profesional para guardarlo aquí.</p><Link className="home-primary-link" to="/">Explorar profesionales</Link></div>}
  </section>;
}
