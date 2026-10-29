import '../search-refresh.css';
import { ProfileModal } from '../components/ProfileModal';
import { nearbyZones, municipalityDistance } from '../lib/nearbyZones';
import { ProfessionalSearch } from '../components/ProfessionalSearch';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { CitySelect } from '../components/CitySelect';
import { AppIcon } from '../components/AppIcon';
import { SearchProCard } from '../components/SearchProCard';

export function SearchResults() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [panel, setPanel] = useState('');
  const [nearby, setNearby] = useState({ state: 'idle', zones: [] });
  const q = params.get('q') || '';
  const city = params.get('city') || '';
  const category = params.get('category') || '';
  const verified = params.get('verified') === '1';
  const minRating = ['4', '4.5'].includes(params.get('minRating')) ? params.get('minRating') : '';
  const sort = params.get('sort') || 'recommended';
  const [draft, setDraft] = useState({ q, category, verified, minRating, city, sort });
  useEffect(() => { setDraft({ q, category, verified, minRating, city, sort }); }, [q, category, verified, minRating, city, sort]);
  useEffect(() => {
    apiFetchPublic('/api/categories').then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (city) qs.set('city', city);
    if (category) qs.set('category', category);
    apiFetchPublic(`/api/professionals?${qs}`)
      .then(data => { if (active) setProfessionals(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [q, city, category, retry]);
  function update(values) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    setParams(next, { state: location.state });
  }
  const visible = professionals.filter(p => (!verified || p.verified) && Number(p.rating || 0) >= Number(minRating || 0));
  useEffect(() => {
    let active = true;
    if (loading || error || !city || visible.length) { setNearby({ state: 'idle', zones: [] }); return; }
    if (municipalityDistance(city, city) === null) { setNearby({ state: 'unlocated', zones: [] }); return; }
    setNearby({ state: 'loading', zones: [] });
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    apiFetchPublic(`/api/professionals?${query}`).then(rows => {
      if (!Array.isArray(rows)) throw new Error('Invalid professionals');
      if (active) setNearby({ state: 'ready', zones: nearbyZones(rows, city, { verified, minRating }) });
    }).catch(() => { if (active) setNearby({ state: 'error', zones: [] }); });
    return () => { active = false; };
  }, [loading, error, city, q, category, verified, minRating, retry, professionals]);
  if (sort === 'rating') visible.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  if (sort === 'reviews') visible.sort((a, b) => Number(b.total_reviews || 0) - Number(a.total_reviews || 0));
  if (sort === 'name') visible.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || '', 'es'));
  const filtered = q || category || verified || minRating;
  const exitTo = /^(?:\/|\/(?:categorias|favoritos)(?:\?.*)?)$/.test(location.state?.from || '') ? location.state.from : '/';
  const categoryName = categories.find(item => String(item.id) === category)?.name;
  return <section className="search-screen search-refresh">
    <header className="search-header">
      <button type="button" aria-label="Volver" onClick={() => navigate(exitTo, { replace: true })}><AppIcon name="back" size={22} /></button>
      <form className="results-query" role="search" onSubmit={event => { event.preventDefault(); update({ q: draft.q.trim() }); document.activeElement?.blur(); }}>
        <ProfessionalSearch value={draft.q} onChange={q => setDraft(current => ({ ...current, q }))} city={city} categories={categories} professionals={professionals} placeholder={categoryName || 'Busca un servicio...'} />
        <button type="submit" aria-label="Buscar profesionales"><AppIcon name="search" size={21} /></button>
      </form>
      <h1 className="home-sr-only">{categoryName || 'Resultados de búsqueda'}</h1>
    </header>
    <div className="results-filterbar">
      <button type="button" className={!verified && !minRating && sort === 'recommended' ? 'is-selected' : ''} aria-pressed={!verified && !minRating && sort === 'recommended'} onClick={() => update({ verified: '', minRating: '', sort: '' })}>Todos</button>
      <button type="button" aria-haspopup="dialog" onClick={() => setPanel('availability')}>Disponibles</button>
      <button type="button" className={sort === 'rating' ? 'is-selected' : ''} aria-pressed={sort === 'rating'} onClick={() => update({ sort: sort === 'rating' ? '' : 'rating' })}>Mejor valorados</button>
      <button type="button" className="results-filter-icon" aria-label="Filtros de búsqueda" aria-haspopup="dialog" onClick={() => setPanel('filters')}><AppIcon name="filter" size={19} />{(verified || minRating) && <i aria-label="Hay filtros activos" />}</button>
    </div>
    {(verified || minRating) && <div className="search-applied"><span>{[verified && 'Verificados', minRating && `★ ${minRating}+`].filter(Boolean).join(' · ')}</span><button type="button" onClick={() => update({ verified: '', minRating: '' })}>Limpiar filtros</button></div>}
    <div className="search-count" role="status" aria-live="polite">{loading ? 'Buscando profesionales…' : error ? '' : `${visible.length} ${visible.length === 1 ? 'profesional encontrado' : 'profesionales encontrados'}${city ? ` · ${city}` : ''}`}</div>
    {panel && <ProfileModal key={panel} title={panel === 'availability' ? 'Consulta disponibilidad' : 'Filtros de búsqueda'} onClose={() => setPanel(current => current === panel ? '' : current)}>
      {panel === 'availability' ? <div className="results-availability"><p>La disponibilidad se confirma directamente con cada profesional. Abre su perfil para conversar o enviar una solicitud.</p><button type="button" className="search-apply" onClick={() => setPanel('')}>Ver profesionales</button></div> : <form id="search-filters" className="search-panel" onSubmit={event => { event.preventDefault(); update({ q: draft.q.trim(), city: draft.city, category: draft.category, verified: draft.verified ? '1' : '', minRating: draft.minRating, sort: draft.sort }); try { localStorage.setItem('tm.home-city', draft.city); } catch {} setPanel(''); }}>
        <label>¿Dónde necesitas el servicio?<CitySelect value={draft.city} placeholder="Todas las ciudades" onChange={city => setDraft(current => ({ ...current, city }))} /></label>
        <label>Categoría<select value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))}><option value="">Todas las categorías</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Calificación mínima<select value={draft.minRating} onChange={event => setDraft(current => ({ ...current, minRating: event.target.value }))}><option value="">Todas las calificaciones</option><option value="4">4 estrellas</option><option value="4.5">4.5 estrellas</option></select></label>
        <label>Ordenar por<select value={draft.sort} onChange={event => setDraft(current => ({ ...current, sort: event.target.value }))}><option value="recommended">Recomendados</option><option value="rating">Mejor calificados</option><option value="reviews">Más reseñas</option><option value="name">Nombre A–Z</option></select></label>
        <label className="search-checkbox"><input type="checkbox" checked={draft.verified} onChange={event => setDraft(current => ({ ...current, verified: event.target.checked }))} />Solo profesionales verificados</label>
        <button className="search-apply" type="submit">Aplicar filtros</button>
        {city && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${city}, Colombia`)}`} target="_blank" rel="noreferrer">Ver zona en Google Maps ↗</a>}
      </form>}
    </ProfileModal>}
    <div className="search-list" aria-busy={loading}>
      {loading ? <div className="search-loading">{[1, 2, 3, 4].map(n => <div key={n}><span /><div><i /><i /><i /></div></div>)}</div> : error ? <div className="search-empty" role="alert"><h2>No pudimos cargar los profesionales</h2><p>Revisa tu conexión e inténtalo de nuevo.</p><button type="button" className="search-apply" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> : visible.length ? visible.map(p => <SearchProCard key={p.id} professional={p} backTo={location.pathname + location.search} />) : <div className="search-empty"><AppIcon name="search" size={32} /><h2>No encontramos resultados</h2><p>Prueba otra categoría, ciudad o término de búsqueda.</p>{filtered && <button className="search-apply" type="button" onClick={() => update({ q: '', category: '', verified: '', minRating: '' })}>Quitar filtros</button>}</div>}
    </div>
    {!loading && !error && !visible.length && city && <section className="nearby-zones" aria-label="Recomendaciones de zonas">
      {nearby.state === 'unlocated' && <p>No pudimos calcular la cercanía de esta ubicación. Elige otro municipio para consultar disponibilidad.</p>}
      {nearby.state === 'loading' && <p role="status">Buscando disponibilidad en zonas cercanas…</p>}
      {nearby.state === 'error' && <div role="alert"><p>No pudimos consultar otras zonas.</p><button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar zonas</button></div>}
      {nearby.state === 'ready' && (nearby.zones.length ? <><h2>Marañeros en zonas cercanas</h2><p>No hay coincidencias en {city} con estos filtros. Puedes buscar en:</p><div>{nearby.zones.map(zone => <button type="button" key={zone.city} onClick={() => { update({ city: zone.city }); try { localStorage.setItem('tm.home-city', zone.city); } catch {} }}><strong>{zone.city}</strong><span>{zone.count} {zone.count === 1 ? 'marañero disponible' : 'marañeros disponibles'} · aprox. {Math.max(1, Math.round(zone.distance))} km</span><span aria-hidden="true">Ver disponibles →</span></button>)}</div><small>Distancias aproximadas entre municipios, en línea recta. Confirma con el profesional si atiende tu zona.</small></> : <p>Tampoco encontramos coincidencias en municipios a menos de 80 km. Puedes cambiar la ciudad o ajustar los filtros.</p>)}
    </section>}
  </section>;
}
