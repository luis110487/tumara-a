import { Link } from 'react-router-dom';

export function ProCard({ p }) {
  return (
    <article className="tm-pro-card">
      <div className="tm-avatar">{p.display_name[0]}</div>
      <div className="tm-pro-info">
        <h3>{p.display_name}</h3>
        <p>{p.category}{p.city ? ` · ${p.city}` : ''}</p>
        <div>
          <span className="tm-rating">★ {Number(p.rating).toFixed(1)}</span>
          <span className="tm-reviews">({p.total_reviews})</span>
          {p.verified && <span className="tm-verified">✓ Verificado</span>}
        </div>
      </div>
      <Link className="tm-pro-link" to={`/profesional/${p.id}`}>→</Link>
    </article>
  );
}
