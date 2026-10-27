import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { readSelectedCity } from '../lib/selectedCity';
import { AppIcon, categoryAppearance } from '../components/AppIcon';

const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

export function Categories() {
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [storedCity] = useState(readSelectedCity);
  const [params, setParams] = useSearchParams();
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const query = params.get('q') || '';
  const city = params.get('city') ?? storedCity;

  useEffect(() => {
    let active = true;
    setStatus('loading');
    apiFetchPublic('/api/categories').then(data => {
      if (!Array.isArray(data) || data.some(item => !item || item.id == null || typeof item.name !== 'string' || !item.name.trim())) {
        throw new Error('Invalid categories response');
      }
      if (active) { setCategories(data); setStatus('ready'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  function updateQuery(value) {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  }
  const filter = normalize(query);
  const filtered = categories.filter(category => normalize(`${category.name} ${category.description || ''}`).includes(filter));
  function categoryResults(id) {
    const next = new URLSearchParams({ category: String(id) });
    if (city) next.set('city', city);
    return `/buscar?${next}`;
  }

  return <section className="mobile-categories" aria-labelledby="categories-title">
    <header className="categories-header">
      <div className="categories-titlebar">
        <button type="button" className="categories-icon-button" aria-label="Volver" onClick={() => navigate('/', { replace: true })}><AppIcon name="back" size={22} /></button>
        <h1 id="categories-title">Categorías</h1>
        <button type="button" className="categories-icon-button" aria-label="Buscar categoría" onClick={() => inputRef.current?.focus()}><AppIcon name="search" size={23} /></button>
      </div>
      <form className="categories-search" role="search" onSubmit={event => { event.preventDefault(); inputRef.current?.blur(); }}>
        <AppIcon name="search" size={19} />
        <label className="home-sr-only" htmlFor="category-search">Buscar por categoría o servicio</label>
        <input ref={inputRef} id="category-search" name="categoryQuery" type="search" value={query} onChange={event => updateQuery(event.target.value)}
          placeholder="Buscar categoría…" autoComplete="off" maxLength={150} enterKeyHint="search" />
        {query && <button className="categories-clear" type="button" aria-label="Limpiar búsqueda" onClick={() => { updateQuery(''); inputRef.current?.focus(); }}>×</button>}
      </form>
      {city && <p className="categories-city"><AppIcon name="pin" size={13} /><span>Resultados en {city}</span></p>}
    </header>

    <div className="categories-content">
      {status === 'loading' && <div className="categories-loading" role="status"><span className="home-sr-only">Cargando categorías…</span>{Array.from({ length: 8 }, (_, i) => <div key={i} aria-hidden="true"><span /><i /></div>)}</div>}
      {status === 'error' && <div className="categories-empty" role="alert"><AppIcon name="grid" size={36} /><h2>No pudimos cargar las categorías</h2><p>Revisa tu conexión y vuelve a intentarlo.</p><button className="home-primary-link" type="button" onClick={() => setAttempt(value => value + 1)}>Volver a intentar</button></div>}
      {status === 'ready' && <>
        <p className="home-sr-only" role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'categoría disponible' : 'categorías disponibles'}</p>
        {filtered.length ? <ul className="categories-list">
          {filtered.map(category => {
            const [icon, color, background] = categoryAppearance(category.name);
            return <li key={category.id}><Link className="category-row" to={categoryResults(category.id)} state={{ from: '/categorias' + window.location.search }}>
              <span className="category-row-icon" style={{ color, background }}><AppIcon name={icon} size={31} /></span>
              <span className="category-summary"><strong>{category.name}</strong><span>{category.description?.trim() || 'Encuentra profesionales de este oficio'}</span></span>
              <span className="category-chevron" aria-hidden="true">›</span>
            </Link></li>;
          })}
        </ul> : <div className="categories-empty"><AppIcon name={categories.length ? 'search' : 'grid'} size={36} />
          <h2>{categories.length ? 'No encontramos esa categoría' : 'Aún no hay categorías disponibles'}</h2>
          <p>{categories.length ? 'Prueba con otro oficio o servicio.' : 'Vuelve más tarde para explorar los servicios.'}</p>
          {query && <button className="home-primary-link" type="button" onClick={() => { updateQuery(''); inputRef.current?.focus(); }}>Ver todas las categorías</button>}
        </div>}
      </>}
    </div>
  </section>;
}
