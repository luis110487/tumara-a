import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, AuthRequiredError } from '../lib/apiClient';
import { StatusBadge } from '../components/StatusBadge';

function RequestRow({ r }) {
  return (
    <Link className="request-row" to={`/solicitud/${r.id}/chat`}>
      <div>
        <h3>{r.service_title}</h3>
        <p>{r.city || 'Sin ciudad especificada'}</p>
      </div>
      <StatusBadge status={r.status} />
    </Link>
  );
}

export function MyRequests() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/requests/mine')
      .then(setData)
      .catch(err => {
        if (err instanceof AuthRequiredError) return navigate('/cuenta');
        setError(err.message);
      });
  }, [navigate]);

  return (
    <section className="results">
      <div className="results-head"><span className="kicker">TUS SOLICITUDES</span><h1>Mis solicitudes</h1></div>
      {error && <div className="msg error">{error}</div>}
      {data && (
        <>
          <h2 className="requests-subhead">Como cliente</h2>
          <div className="request-list">
            {data.as_customer.length ? data.as_customer.map(r => <RequestRow r={r} key={r.id} />) : <div className="empty">Aún no has solicitado ningún servicio.</div>}
          </div>
          <h2 className="requests-subhead">Como profesional</h2>
          <div className="request-list">
            {data.as_professional.length ? data.as_professional.map(r => <RequestRow r={r} key={r.id} />) : <div className="empty">No tienes solicitudes recibidas.</div>}
          </div>
        </>
      )}
    </section>
  );
}
