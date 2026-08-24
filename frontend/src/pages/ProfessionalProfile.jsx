import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { WhatsappButton } from '../components/WhatsappButton';

export function ProfessionalProfile() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetchPublic(`/api/professionals/${id}`).then(setP).catch(() => setError('No encontramos este profesional.'));
    apiFetchPublic(`/api/professionals/${id}/reviews`).then(setReviews).catch(() => setReviews([]));
  }, [id]);

  if (error) return <section className="profile"><p>{error}</p></section>;
  if (!p) return <section className="profile"><p>Cargando…</p></section>;

  return (
    <section className="profile">
      <Link className="back" to="/buscar">← Volver a resultados</Link>
      <div className="profile-card">
        {p.photo_url ? (
          <img className="profile-avatar" src={p.photo_url} alt={p.display_name} style={{ objectFit: 'cover' }} />
        ) : (
          <div className="profile-avatar">{p.display_name[0]}</div>
        )}
        <div>
          <span className="kicker">{p.category}</span>
          <h1>{p.display_name}</h1>
          <p>{p.city}{p.neighborhood ? ` · ${p.neighborhood}` : ''}</p>
          <p className="rating">★ {Number(p.rating).toFixed(1)} · {p.total_reviews} reseñas {p.verified && <span className="verified">✓ Verificado</span>}</p>
        </div>
        <div className="profile-actions">
          <Link className="btn primary" to={`/solicitar/${p.id}`}>Solicitar servicio</Link>
          <WhatsappButton whatsapp={p.whatsapp} professionalName={p.display_name} />
        </div>
      </div>
      <div className="profile-body">
        <h2>Sobre el profesional</h2>
        <p>{p.description}</p>
        <div className="stats">
          <div><b>{p.experience_years}</b><span>años de experiencia</span></div>
          <div><b>{Number(p.rating).toFixed(1)}</b><span>valoración</span></div>
          <div><b>{p.total_reviews}</b><span>reseñas</span></div>
        </div>
      </div>

      {(p.evidence_url_1 || p.evidence_url_2) && (
        <div className="profile-body" style={{ marginTop: '20px' }}>
          <h2>Evidencias de trabajo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {p.evidence_url_1 && <img src={p.evidence_url_1} alt="Evidencia de trabajo 1" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px' }} />}
            {p.evidence_url_2 && <img src={p.evidence_url_2} alt="Evidencia de trabajo 2" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px' }} />}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="profile-body" style={{ marginTop: '20px' }}>
          <h2>Reseñas de clientes</h2>
          <div className="request-list">
            {reviews.map(r => (
              <div key={r.id} className="request-row" style={{ cursor: 'default' }}>
                <div>
                  <p style={{ color: '#f0a400', margin: '0 0 4px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                  {r.comment && <p style={{ margin: 0 }}>{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
