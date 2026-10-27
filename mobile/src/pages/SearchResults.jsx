import { nearbyZones, municipalityDistance } from '../lib/nearbyZones';
import { ProfessionalSearch } from '../components/ProfessionalSearch';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { CitySelect } from '../components/CitySelect';
import { AppIcon } from '../components/AppIcon';
import { MobileProCard } from '../components/MobileProCard';

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
  const [draft, setDraft] = useState({ q, category, verified, minRating });
  useEffect(() => { setDraft({ q, category, verified, minRating }); }, [q, category, verified, minRating]);
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
  const togglePanel = value => setPanel(panel === value ? '' : value);
  return <section className="search-screen">
    <header className="search-header"><button type="button" aria-label="Volver" onClick={() => navigate(exitTo, { replace: true })}><AppIcon name="back" /></button><h1>Resultados</h1></header>
    <div className="search-location"><span><AppIcon name="pin" size={19} />{city || 'Todas las ciudades'}</span><button type="button" aria-expanded={panel === 'city'} aria-controls="search-city" onClick={() => togglePanel('city')}>Cambiar</button></div>
    {panel === 'city' && <div id="search-city" className="search-panel"><label>¿Dónde necesitas el servicio?<CitySelect value={city} placeholder="Todas las ciudades" onChange={value => { update({ city: value }); try { localStorage.setItem('tm.home-city', value); } catch {} setPanel(''); }} /></label></div>}
    <div className="search-tools">{[['filters', 'Filtros', 'tools'], ['sort', 'Ordenar', 'down'], ['map', 'Ver mapa', 'pin']].map(([key, label, icon]) => <button key={key} type="button" aria-expanded={panel === key} aria-controls={`search-${key}`} onClick={() => togglePanel(key)}><AppIcon name={icon} size={16} />{label}{key === 'filters' && filtered ? <i /> : null}</button>)}</div>
    {panel === 'filters' && <form id="search-filters" className="search-panel" onSubmit={event => { event.preventDefault(); update({ q: draft.q.trim(), category: draft.category, verified: draft.verified ? '1' : '', minRating: draft.minRating }); setPanel(''); }}>
      <label>Servicio o profesional<ProfessionalSearch value={draft.q} onChange={q => setDraft(current => ({ ...current, q }))} city={city} categories={categories} /></label>
      <label>Categoría<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Todas las categorías</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Calificación mínima<select value={draft.minRating} onChange={event => setDraft({ ...draft, minRating: event.target.value })}><option value="">Todas las calificaciones</option><option value="4">4 estrellas</option><option value="4.5">4.5 estrellas</option></select></label>
      <label className="search-checkbox"><input type="checkbox" checked={draft.verified} onChange={event => setDraft({ ...draft, verified: event.target.checked })} />Solo profesionales verificados</label><button className="search-apply" type="submit">Aplicar filtros</button>
    </form>}
    {panel === 'sort' && <div id="search-sort" className="search-panel"><label>Ordenar por<select value={sort} onChange={event => { update({ sort: event.target.value === 'recommended' ? '' : event.target.value }); setPanel(''); }}><option value="recommended">Recomendados</option><option value="rating">Mejor calificados</option><option value="reviews">Más reseñas</option><option value="name">Nombre A–Z</option></select></label></div>}
    {panel === 'map' && <div id="search-map" className="search-panel"><strong>Explora {city || 'tu zona'}</strong><p>La ubicación exacta se coordina con cada profesional.</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city ? `${city}, Colombia` : 'Colombia')}`} target="_blank" rel="noreferrer">Abrir zona en Google Maps ↗</a></div>}
    {filtered && <div className="search-applied"><span>{[q, categories.find(c => String(c.id) === category)?.name, verified && 'Verificados', minRating && `★ ${minRating}+`].filter(Boolean).join(' · ')}</span><button type="button" onClick={() => update({ q: '', category: '', verified: '', minRating: '' })}>Limpiar filtros</button></div>}
    <div className="search-count" role="status" aria-live="polite">{loading ? 'Buscando profesionales…' : error ? '' : `${visible.length} ${visible.length === 1 ? 'profesional disponible' : 'profesionales disponibles'}`}</div>
    <div className="search-list" aria-busy={loading}>
      {loading ? <div className="search-loading">{[1, 2, 3, 4].map(n => <div key={n}><span /><div><i /><i /><i /></div></div>)}</div> : error ? <div className="search-empty" role="alert"><h2>No pudimos cargar los profesionales</h2><p>Revisa tu conexión e inténtalo de nuevo.</p><button type="button" className="search-apply" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> : visible.length ? visible.map(p => <MobileProCard key={p.id} professional={p} backTo={location.pathname + location.search} />) : <div className="search-empty"><AppIcon name="search" size={32} /><h2>No encontramos resultados</h2><p>Prueba otra categoría, ciudad o término de búsqueda.</p>{filtered && <button className="search-apply" type="button" onClick={() => update({ q: '', category: '', verified: '', minRating: '' })}>Quitar filtros</button>}</div>}
    </div>
    {!loading && !error && !visible.length && city && <section className="nearby-zones" aria-label="Recomendaciones de zonas">
      {nearby.state === 'unlocated' && <p>No pudimos calcular la cercanía de esta ubicación. Elige otro municipio para consultar disponibilidad.</p>}
      {nearby.state === 'loading' && <p role="status">Buscando disponibilidad en zonas cercanas…</p>}
      {nearby.state === 'error' && <div role="alert"><p>No pudimos consultar otras zonas.</p><button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar zonas</button></div>}
      {nearby.state === 'ready' && (nearby.zones.length ? <><h2>Marañeros en zonas cercanas</h2><p>No hay coincidencias en {city} con estos filtros. Puedes buscar en:</p><div>{nearby.zones.map(zone => <button type="button" key={zone.city} onClick={() => { update({ city: zone.city }); try { localStorage.setItem('tm.home-city', zone.city); } catch {} }}><strong>{zone.city}</strong><span>{zone.count} {zone.count === 1 ? 'marañero disponible' : 'marañeros disponibles'} · aprox. {Math.max(1, Math.round(zone.distance))} km</span><span aria-hidden="true">Ver disponibles →</span></button>)}</div><small>Distancias aproximadas entre municipios, en línea recta. Confirma con el profesional si atiende tu zona.</small></> : <p>Tampoco encontramos coincidencias en municipios a menos de 80 km. Puedes cambiar la ciudad o ajustar los filtros.</p>)}
    </section>}
  </section>;
}
