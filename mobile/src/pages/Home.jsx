import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { CitySelect } from '../components/CitySelect';
import { AppIcon, categoryAppearance } from '../components/AppIcon';
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
  const [city, setCity] = useState(readSelectedCity);
  const { session, role } = useAuth();
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
    try { localStorage.setItem('tm.home-city', value); } catch { /* Selection still works for this visit. */ }
  }
  function changeCity(value) { gps.markManual(); updateCity(value); }
  function results(categoryId) {
    const params = new URLSearchParams();
    if (q.trim() && categoryId == null) params.set('q', q.trim());
    if (city) params.set('city', city);
    if (categoryId != null) params.set('category', categoryId);
    return `/buscar${params.size ? `?${params}` : ''}`;
  }
  function retry() { setAttempt(value => value + 1); }

  return <div className="home-mobile">
    <section className="home-hero" aria-label="Encuentra servicios en tu ciudad">
      <header className="home-toolbar">
        <Link className="home-wordmark home-transparent-brand" to="/" aria-label="TuMaraña, inicio"><img src="/brand-logo-transparent.png" alt="TuMaraña.com" /></Link>
        <div className="home-toolbar-actions">
          {!session && <Link className="home-login" to="/cuenta">Ingresar</Link>}
          <Link to="/mis-solicitudes" className="home-activity" aria-label="Ver actividad de mis solicitudes"><AppIcon name="bell" /></Link>
        </div>
      </header>
      <label className="home-location home-top-location">
        <AppIcon name="pin" size={19} /><span className="home-sr-only">Ciudad de búsqueda</span>
        <CitySelect value={city} onChange={changeCity} placeholder="Elige tu ciudad" /><AppIcon name="down" size={18} />
      </label>
      <div className="home-hero-copy"><h1>¿Qué servicio<br />necesitas hoy?</h1><p>Conecta con quien<br />sabe hacerlo.</p></div>
      <div className="home-hero-figure" aria-hidden="true"><img src="/hero-professionals.webp" alt="" /></div>
    </section>

    <form className="home-search" role="search" onSubmit={event => { event.preventDefault(); navigate(results(), { state: { from: '/' } }); }}>
      <label className="home-query"><AppIcon name="search" size={21} /><span className="home-sr-only">Servicio o profesional</span>
        <input name="q" value={q} onChange={event => setQ(event.target.value)} placeholder="Ej. plomero, electricista…" maxLength={200} enterKeyHint="search" autoComplete="off" />
      </label>
      <label className="home-location home-search-location"><AppIcon name="pin" size={21} /><span className="home-sr-only">Ciudad para buscar profesionales</span>
        <CitySelect value={city} onChange={changeCity} placeholder="Tu ciudad o municipio" /><AppIcon name="down" size={18} />
      </label>
      <button className="home-search-button" type="submit"><AppIcon name="search" size={21} />Buscar</button>
    </form>

    <div className="home-gps-controls">
      <button type="button" className="home-gps-action" disabled={gps.busy} onClick={gps.request}><AppIcon name="pin" size={17} />{gps.busy ? 'Ubicando…' : 'Usar GPS del móvil'}</button>
      {gps.denied && <button type="button" className="home-gps-action" onClick={gps.openSettings}>Abrir permisos</button>}
      {gps.notice && <p role="status">{gps.notice}</p>}
    </div>

    <section className="home-section" id="categorias" aria-labelledby="home-categories-title">
      <div className="home-section-heading"><h2 id="home-categories-title">{texts.home_categories_title || 'Categorías populares'}</h2><Link to={`/categorias${city ? `?${new URLSearchParams({ city })}` : ''}`}>Ver todas</Link></div>
      {categoryState === 'loading' && <div role="status" className="home-categories-loading"><span className="home-sr-only">Cargando categorías…</span>{Array.from({ length: 8 }, (_, i) => <span key={i} aria-hidden="true" />)}</div>}
      {categoryState === 'error' && <div className="home-inline-message" role="alert"><p>No pudimos cargar las categorías.</p><button type="button" onClick={retry}>Volver a intentar</button></div>}
      {categoryState === 'ready' && (categories.length ? <div className="home-category-grid">
        {categories.slice(0, 8).map(category => {
          const [icon, color, background] = categoryAppearance(category.name);
          return <Link className="home-category" key={category.id} to={results(category.id)} state={{ from: '/' }}>
            <span className="home-category-icon" style={{ color, background }}><AppIcon name={icon} size={30} /></span><span style={category.name?.length > 16 ? { fontSize: '10px' } : undefined}>{category.name}</span>
          </Link>;
        })}
      </div> : <p className="home-inline-message">Aún no hay categorías disponibles.</p>)}
    </section>

    <section className="home-section home-featured" aria-labelledby="home-featured-title">
      <div className="home-section-heading"><h2 id="home-featured-title">{texts.home_professionals_title || 'Profesionales destacados'}</h2><Link to={results()} state={{ from: '/' }}>Ver todos</Link></div>
      {professionalState === 'loading' && <p className="home-inline-message" role="status">Buscando profesionales…</p>}
      {professionalState === 'error' && <div className="home-inline-message" role="alert"><p>No pudimos cargar los profesionales. Revisa tu conexión.</p><button type="button" onClick={retry}>Volver a intentar</button></div>}
      {professionalState === 'ready' && (professionals.length ? <div className="home-pro-list">{professionals.map(p => <MobileProCard key={p.id} professional={p} />)}</div>
        : <p className="home-inline-message">Pronto encontrarás profesionales aquí. Mientras tanto, prueba buscar por servicio.</p>)}
    </section>
    {role !== 'professional' && role !== 'admin' && <Link className="home-professional-cta" to="/registrar"><span><strong>¿Ofreces un servicio?</strong><small>Da a conocer tu trabajo en TuMaraña.</small></span><span>Soy profesional →</span></Link>}
  </div>;
}
