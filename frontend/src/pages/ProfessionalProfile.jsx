import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { WhatsappButton } from '../components/WhatsappButton';

export function ProfessionalProfile() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetchPublic(`/api/professionals/${id}`).then(setP).catch(() => setError('No encontramos este profesional.'));
  }, [id]);

  if (error) return <section className="profile"><p>{error}</p></section>;
  if (!p) return <section className="profile"><p>Cargando…</p></section>;

  return (
    <section className="profile">
      <Link className="back" to="/buscar">← Volver a resultados</Link>
      <div className="profile-card">
        <div className="profile-avatar">{p.display_name[0]}</div>
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
    </section>
  );
}
