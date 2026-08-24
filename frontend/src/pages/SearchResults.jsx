import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { CitySelect } from '../components/CitySelect';

export function SearchResults() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const q = params.get('q') || '';
  const city = params.get('city') || '';
  const category = params.get('category') || '';

  useEffect(() => {
    apiFetchPublic('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (city) qs.set('city', city);
    if (category) qs.set('category', category);
    apiFetchPublic(`/api/professionals?${qs.toString()}`)
      .then(setProfessionals)
      .catch(() => setProfessionals([]))
      .finally(() => setLoading(false));
  }, [q, city, category]);

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  }

  return (
    <section className="results">
      <div className="results-head"><span className="kicker">DIRECTORIO</span><h1>Encuentra el profesional que necesitas</h1></div>
      <form className="filters" onSubmit={e => e.preventDefault()}>
        <input defaultValue={q} onBlur={e => updateParam('q', e.target.value)} placeholder="Servicio o profesional" />
        <CitySelect value={city} onChange={v => updateParam('city', v)} placeholder="Ciudad" />
        <select value={category} onChange={e => updateParam('category', e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn primary" type="submit">Buscar</button>
      </form>
      <div className="result-grid">
        {loading && <div className="empty">Cargando…</div>}
        {!loading && professionals.length === 0 && (
          <div className="empty"><h2>No encontramos resultados</h2><p>Prueba otra categoría, ciudad o término de búsqueda.</p></div>
        )}
        {!loading && professionals.map(p => (
          <article className="result-card" key={p.id}>
            {p.photo_url ? (
              <img className="profile-avatar small" src={p.photo_url} alt={p.display_name} style={{ objectFit: 'cover' }} />
            ) : (
              <div className="profile-avatar small">{p.display_name[0]}</div>
            )}
            <div>
              <h2>{p.display_name}</h2>
              <p>{p.category} · {p.city}</p>
              <p>{p.description.slice(0, 150)}{p.description.length > 150 ? '…' : ''}</p>
              <span className="rating">★ {Number(p.rating).toFixed(1)} · {p.total_reviews} reseñas</span>
              {p.verified && <span className="verified">✓ Verificado</span>}
            </div>
            <Link className="btn outline" to={`/profesional/${p.id}`}>Ver perfil</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
