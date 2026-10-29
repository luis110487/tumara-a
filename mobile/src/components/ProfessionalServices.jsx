import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { AppIcon } from './AppIcon';
import { servicePrice } from '../lib/serviceCatalog';
export function ProfessionalServices({ professionalId }) {
  const [items, setItems] = useState([]), [state, setState] = useState('loading'), [retry, setRetry] = useState(0);
  const location = useLocation();
  useEffect(() => {
    let alive = true; setState('loading');
    apiFetchPublic(`/api/professionals/${professionalId}/services`).then(data => {
      if (!Array.isArray(data)) throw new Error();
      if (alive) { setItems(data); setState('ready'); }
    }).catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, [professionalId, retry]);
  return <section className="pro-service-section"><h2>Servicios que ofrece</h2>
    {state === 'loading' ? <p role="status">Cargando servicios…</p> : state === 'error' ? <div role="alert"><p>No pudimos cargar el catálogo de servicios.</p><button type="button" className="pro-secondary" onClick={() => setRetry(value => value + 1)}>Reintentar servicios</button></div> : items.length ? items.map(service => <Link key={service.id} className="pro-service-row" to={`/servicio/${service.id}`} state={{ from: `/profesional/${professionalId}`, profileFrom: location.state?.from || '/', resultsFrom: location.state?.resultsFrom }}><span><AppIcon name="tools" size={20} /></span><div className="pro-catalog-service"><strong>{service.title}</strong><small>{service.price_type === 'from' ? 'Desde ' : ''}{servicePrice(service)}</small></div><b aria-hidden="true">›</b></Link>) : <p>Este profesional aún no ha publicado servicios detallados. Puedes enviarle una solicitud para consultar tu necesidad.</p>}
  </section>;
}
