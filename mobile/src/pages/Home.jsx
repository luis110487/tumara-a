import { CategoryArtwork, categoryVisual } from '../components/CategoryArtwork';
import '../home-refresh.css';
import { ProfileModal } from '../components/ProfileModal';
import { BannerAd } from '../components/BannerAd';
import { ProfessionalSearch } from '../components/ProfessionalSearch';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { CitySelect } from '../components/CitySelect';
import { AppIcon } from '../components/AppIcon';
import { MobileProCard } from '../components/MobileProCard';
import { useAuth } from '../context/AuthContext';
import { readSelectedCity } from '../lib/selectedCity';
import { useDeviceCity } from '../lib/useDeviceCity';

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
  const [city, setCity] = useState(readSelectedCity);
  const { session, role, profile } = useAuth();
  const firstName = (profile?.full_name || session?.user?.user_metadata?.full_name || "").trim().split(/\s+/)[0];
  const navigate = useNavigate();
  const gps = useDeviceCity(updateCity);

  useEffect(() => {
    let active = true;
    setCategoryState('loading'); setProfessionalState('loading');
    apiFetchPublic('/api/categories').then(data => {
      if (!active) return;
      if (!Array.isArray(data)) throw new Error('Invalid categories response');
      setCategories(data); setCategoryState('ready');
    }).catch(() => { if (active) setCategoryState('error'); });
    apiFetchPublic('/api/professionals?limit=8').then(data => {
      if (!active) return;
      if (!Array.isArray(data)) throw new Error('Invalid professionals response');
      setProfessionals(data); setProfessionalState('ready');
    }).catch(() => { if (active) setProfessionalState('error'); });
    apiFetchPublic('/api/site-texts').then(data => { if (active && data) setTexts(data); }).catch(() => {});
    return () => { active = false; };
  }, [attempt]);

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

  return <div className="home-mobile home-refresh">
    <section className="home-hero" aria-label="Encuentra servicios en tu ciudad">
      <header className="home-toolbar">
        <Link className="home-wordmark home-transparent-brand" to="/" aria-label="TuMaraña, inicio"><img src="/brand-logo-transparent.png" alt="TuMaraña.com" /></Link>
        <div className="home-toolbar-actions">
          {!session && <Link className="home-login" to="/cuenta">Ingresar</Link>}
          <Link to="/mis-solicitudes" className="home-activity" aria-label="Ver actividad de mis solicitudes"><AppIcon name="bell" /></Link>
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
      <button type="button" onClick={() => setPanel('urgent')} className="home-shortcut shortcut-red"><span><AppIcon name="bolt" size={26} filled /></span><strong>Urgentes</strong></button>
      <Link to={results(null, { sort: 'rating' })} state={{ from: '/' }} className="home-shortcut shortcut-blue"><span><AppIcon name="star" size={26} filled /></span><strong>Mejores<br />valorados</strong></Link>
      <button type="button" onClick={() => { nearbyRequested.current = true; setPanel('nearby'); gps.request(); }} className="home-shortcut shortcut-green"><span><AppIcon name="locate" size={26} /></span><strong>Cerca de mí</strong></button>
      <button type="button" onClick={() => setPanel('offers')} className="home-shortcut shortcut-purple"><span><AppIcon name="tag" size={26} filled /></span><strong>Ofertas</strong></button>
    </nav>

    <BannerAd homeFeature />

    <section className="home-section" id="categorias" aria-labelledby="home-categories-title">
      <div className="home-section-heading"><h2 id="home-categories-title">{texts.home_categories_title || 'Categorías populares'}</h2><Link to={`/categorias${city ? `?${new URLSearchParams({ city })}` : ''}`}>Ver todas</Link></div>
      {categoryState === 'loading' && <div role="status" className="home-categories-loading"><span className="home-sr-only">Cargando categorías…</span>{Array.from({ length: 4 }, (_, i) => <span key={i} aria-hidden="true" />)}</div>}
      {categoryState === 'error' && <div className="home-inline-message" role="alert"><p>No pudimos cargar las categorías.</p><button type="button" onClick={retry}>Volver a intentar</button></div>}
      {categoryState === 'ready' && (categories.length ? <div className="home-category-grid">
        {categories.slice(0, 4).map(category => {
          const visual = categoryVisual(category.name);
          return <Link className="home-category" style={{ background: visual.background }} key={category.id} to={results(category.id)} state={{ from: '/' }}>
            <span className="home-category-icon"><CategoryArtwork name={category.name} /></span><span>{category.name}</span>
          </Link>;
        })}
      </div> : <p className="home-inline-message">Aún no hay categorías disponibles.</p>)}
    </section>

    <section className="home-section home-featured" aria-labelledby="home-featured-title">
      <div className="home-section-heading"><h2 id="home-featured-title">{texts.home_professionals_title || 'Profesionales destacados'}</h2><Link to={results()} state={{ from: '/' }}>Ver todos</Link></div>
      {professionalState === 'loading' && <p className="home-inline-message" role="status">Buscando profesionales…</p>}
      {professionalState === 'error' && <div className="home-inline-message" role="alert"><p>No pudimos cargar los profesionales. Revisa tu conexión.</p><button type="button" onClick={retry}>Volver a intentar</button></div>}
      {professionalState === 'ready' && (professionals.length ? <div className="home-pro-list" role="region" aria-label="Marañeros destacados, desliza para ver más" tabIndex={0} onKeyDown={event => { if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); event.currentTarget.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * event.currentTarget.clientWidth * .9, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>{professionals.map(p => <MobileProCard key={p.id} professional={p} />)}</div>
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
