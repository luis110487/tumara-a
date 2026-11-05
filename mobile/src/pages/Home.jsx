import { CategoryArtwork, categoryVisual } from '../components/CategoryArtwork';
import '../home-refresh.css';
import { ProfileModal } from '../components/ProfileModal';
import { BannerAd } from '../components/BannerAd';
import { ProfessionalSearch } from '../components/ProfessionalSearch';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { CitySelect } from '../components/CitySelect';
import { AppIcon } from '../components/AppIcon';
import { NotificationBell } from '../components/NotificationBell';
import { MobileProCard } from '../components/MobileProCard';
import { useAuth } from '../context/AuthContext';
import { readSelectedCity } from '../lib/selectedCity';
import { useDeviceCity } from '../lib/useDeviceCity';

function FeaturedCrown() {
  return <svg viewBox="0 0 64 64" role="img" aria-label="Destacados">
    <path className="crown-spark crown-spark-left" d="M6 18 2 14M9 11 8 5" />
    <path className="crown-spark crown-spark-right" d="m58 18 4-4M55 11l1-6" />
    <path className="crown-body" d="M12 22 24 33 32 13l8 20 12-11-4 25H16Z" />
    <circle className="crown-tip" cx="12" cy="22" r="3" />
    <circle className="crown-tip" cx="32" cy="13" r="3" />
    <circle className="crown-tip" cx="52" cy="22" r="3" />
    <path className="crown-base" d="M17 52h30" />
  </svg>;
}

export function Home() {
  const [categories, setCategories] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [texts, setTexts] = useState({});
  const [categoryState, setCategoryState] = useState('loading');
  const [professionalState, setProfessionalState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState('');
  const [panel, setPanel] = useState('');
  const [verified, setVerified] = useState(false);
  const nearbyRequested = useRef(false);
  const featuredScrollTop = useRef(0);
  const [city, setCity] = useState(readSelectedCity);
  const { session, role, profile } = useAuth();
  const firstName = (profile?.full_name || session?.user?.user_metadata?.full_name || "").trim().split(/\s+/)[0];
  const navigate = useNavigate();
  const location = useLocation();
  const gps = useDeviceCity(updateCity);

  useEffect(() => {
    const requested = location.state?.openPanel;
    if (!['urgent', 'offers'].includes(requested)) return;
    setPanel(requested);
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    let active = true;
    setCategoryState('loading'); setProfessionalState('loading');
    apiFetchPublic('/api/categories').then(data => {
      if (!active) return;
      if (!Array.isArray(data)) throw new Error('Invalid categories response');
      setCategories(data); setCategoryState('ready');
    }).catch(() => { if (active) setCategoryState('error'); });
    apiFetchPublic('/api/professionals').then(data => {
      if (!active) return;
      if (!Array.isArray(data)) throw new Error('Invalid professionals response');
      setProfessionals(data); setProfessionalState('ready');
    }).catch(() => { if (active) setProfessionalState('error'); });
    apiFetchPublic('/api/site-texts').then(data => { if (active && data) setTexts(data); }).catch(() => {});
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent('tm:bottom-nav-visibility', { detail: { hidden: false } }));
  }, []);

  function updateCity(value) {
    setCity(value);
    if (nearbyRequested.current) {
      nearbyRequested.current = false;
      setPanel('');
      navigate(`/buscar?${new URLSearchParams({ city: value })}`, { state: { from: '/' } });
    }
    try { localStorage.setItem('tm.home-city', value); } catch { /* Selection still works for this visit. */ }
  }
  function changeCity(value) { gps.markManual(); updateCity(value); }
  function results(categoryId, filters = {}) {
    const params = new URLSearchParams();
    if (q.trim() && categoryId == null) params.set('q', q.trim());
    if (city) params.set('city', city);
    if (categoryId != null) params.set('category', categoryId);
    if (verified) params.set('verified', '1');
    Object.entries(filters).forEach(([key, value]) => params.set(key, value));
    return `/buscar${params.size ? `?${params}` : ''}`;
  }
  function retry() { setAttempt(value => value + 1); }
  function handleFeaturedScroll(event) {
    const current = event.currentTarget.scrollTop;
    const delta = current - featuredScrollTop.current;
    if (current <= 2 || delta < -2) {
      window.dispatchEvent(new CustomEvent('tm:bottom-nav-visibility', { detail: { hidden: false } }));
    } else if (delta > 2) {
      window.dispatchEvent(new CustomEvent('tm:bottom-nav-visibility', { detail: { hidden: true } }));
    }
    featuredScrollTop.current = current;
  }

  return <div className="home-mobile home-refresh">
    <section className="home-hero" aria-label="Encuentra servicios en tu ciudad">
      <header className="home-toolbar">
        <Link className="home-wordmark home-transparent-brand" to="/" aria-label="TuMaraña, inicio"><img src="/brand-logo-transparent.png" alt="TuMaraña.com" /></Link>
        <div className="home-toolbar-actions">
          {!session && <Link className="home-login" to="/cuenta">Ingresar</Link>}
          <NotificationBell className="home-activity" />
        </div>
      </header>
      <div className="home-hero-copy">
        <p className="home-greeting">{firstName ? `Hola, ${firstName}` : 'Hola'} <span aria-hidden="true">👋</span></p>
        <h1><span>¿Qué servicio</span><br /><span>necesitas hoy?</span></h1>
      </div>
      <div className="home-hero-figure" aria-hidden="true"><img src="/home-house.png" alt="" /></div>
    </section>

    <form className="home-search" role="search" onSubmit={event => { event.preventDefault(); navigate(results(), { state: { from: '/' } }); }}>
      <label className="home-query"><button className="home-search-submit" type="submit" aria-label="Buscar profesionales"><AppIcon name="search" size={21} /></button><span className="home-sr-only">Servicio o profesional</span>
        <ProfessionalSearch value={q} onChange={setQ} city={city} categories={categories} professionals={professionals} maxLength={100} placeholder="Busca un servicio..." />
      </label>
      <button className="home-filter-button" type="button" aria-label="Ubicación y filtros de búsqueda" onClick={() => setPanel('filters')}><AppIcon name="filter" size={20} /><span className="home-sr-only">Filtros</span></button>
    </form>

    <nav className="home-shortcuts" aria-label="Encuentra un profesional">
      <button type="button" onClick={() => setPanel('urgent')} className="home-shortcut shortcut-red"><span><AppIcon name="bolt" size={20} filled /></span><strong>Urgentes</strong></button>
      <Link to={results(null, { sort: 'rating' })} state={{ from: '/' }} className="home-shortcut shortcut-blue"><span><AppIcon name="star" size={20} filled /></span><strong>Mejores<br />valorados</strong></Link>
      <button type="button" onClick={() => { nearbyRequested.current = true; setPanel('nearby'); gps.request(); }} className="home-shortcut shortcut-green"><span><AppIcon name="locate" size={20} /></span><strong>Cerca de mí</strong></button>
      <button type="button" onClick={() => setPanel('offers')} className="home-shortcut shortcut-purple"><span><AppIcon name="tag" size={20} filled /></span><strong>Ofertas</strong></button>
    </nav>

    <BannerAd homeFeature />

    <section className="home-section home-featured" aria-labelledby="home-featured-title">
      <div className="home-featured-heading"><span className="home-featured-crown"><FeaturedCrown /></span><span><h2 id="home-featured-title">Marañeros destacados</h2><small>Profesionales verificados y recomendados</small></span><Link to={results()} state={{ from: '/' }}>Ver todos <b aria-hidden="true">›</b></Link></div>
      {professionalState === 'loading' && <p className="home-inline-message" role="status">Buscando profesionales…</p>}
      {professionalState === 'error' && <div className="home-inline-message" role="alert"><p>No pudimos cargar los profesionales. Revisa tu conexión.</p><button type="button" onClick={retry}>Volver a intentar</button></div>}
      {professionalState === 'ready' && (professionals.length ? <div className="home-pro-list" role="region" aria-label={`Marañeros destacados, ${professionals.length} profesionales disponibles. Desliza para verlos todos`} tabIndex={0} onScroll={handleFeaturedScroll}>{professionals.map((p, index) => <MobileProCard key={p.id} professional={p} tone={index} />)}</div>
        : <p className="home-inline-message">Pronto encontrarás profesionales aquí. Mientras tanto, prueba buscar por servicio.</p>)}
    </section>
    {panel && <ProfileModal title={panel === 'filters' ? 'Ubicación y filtros' : panel === 'urgent' ? '¿Necesitas ayuda pronto?' : panel === 'nearby' ? 'Profesionales cerca de ti' : 'Ofertas'} onClose={() => { nearbyRequested.current = false; setPanel(''); }}>
      {panel === 'offers' ? <div className="home-panel-content"><p>Aún no hay ofertas publicadas.</p><p>Puedes explorar los profesionales y consultar directamente sus servicios.</p><button className="home-primary-link" type="button" onClick={() => navigate(results(), { state: { from: '/' } })}>Explorar profesionales</button></div> : <div className="home-panel-content">
        {panel === 'urgent' && <p>Encuentra un profesional y consulta su disponibilidad antes de enviar tu solicitud. La atención inmediata depende de cada profesional.</p>}
        {panel === 'nearby' && <p>Usaremos el GPS para buscar en tu ciudad. También puedes elegirla manualmente.</p>}
        <label className="home-location home-search-location" id="home-city"><AppIcon name="pin" size={20} /><span className="home-sr-only">Ciudad para buscar profesionales</span><CitySelect value={city} onChange={value => { nearbyRequested.current = false; changeCity(value); }} placeholder="Tu ciudad o municipio" /></label>
        <button type="button" className="home-gps-action" disabled={gps.busy} onClick={gps.request}><AppIcon name="pin" size={17} />{gps.busy ? 'Ubicando…' : 'Usar GPS del móvil'}</button>
        {gps.denied && <button type="button" className="home-gps-action" onClick={gps.openSettings}>Abrir permisos</button>}
        {gps.notice && <p role="status">{gps.notice}</p>}
        {panel === 'filters' && <label className="home-verified-filter"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} />Solo profesionales verificados</label>}
        <button type="button" className="home-panel-search" onClick={() => navigate(results(), { state: { from: '/' } })}>Buscar profesionales <AppIcon name="search" size={18} /></button>
      </div>}
    </ProfileModal>}
    {role !== 'professional' && role !== 'admin' && <Link className="home-professional-cta" to="/registrar"><span><strong>¿Ofreces un servicio?</strong><small>Da a conocer tu trabajo en TuMaraña.</small></span><span>Soy profesional →</span></Link>}
  </div>;
}
