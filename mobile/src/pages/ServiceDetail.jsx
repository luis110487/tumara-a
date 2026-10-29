import '../service-catalog.css';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { photoSource } from '../lib/photoSource';
import { serviceIncludes } from '../lib/serviceCatalog';
import { AppIcon } from '../components/AppIcon';
import { CategoryArtwork } from '../components/CategoryArtwork';
import { ServiceConditions } from '../components/ServiceConditions';
import { PhotoViewer } from '../components/PhotoViewer';

export function ServiceDetail() {
  const { id } = useParams(), location = useLocation();
  const [service, setService] = useState(null), [state, setState] = useState('loading'), [retry, setRetry] = useState(0);
  const [failedPhoto, setFailedPhoto] = useState(false), [viewer, setViewer] = useState(false), [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true; setState('loading'); setService(null); setViewer(false); setFailedPhoto(false);
    apiFetchPublic(`/api/services/${id}`).then(data => {
      if (!data?.id || !data.professional?.id || !data.is_active) throw new Error('Unavailable');
      if (alive) { setService(data); setState('ready'); }
    }).catch(error => { if (alive) setState(error.status === 404 ? 'missing' : 'error'); });
    return () => { alive = false; };
  }, [id,retry]);
  const backTo = /^\/profesional\/\d+$/.test(location.state?.from || '') ? location.state.from : service ? `/profesional/${service.professional_id}` : '/';
  const backState = { from: location.state?.profileFrom || '/', resultsFrom: location.state?.resultsFrom };
  async function share() {
    const url = `https://tumara-a.vercel.app/profesional/${encodeURIComponent(service.professional_id)}`;
    try { if (navigator.share) await navigator.share({ title: service.title, text: `${service.title} · ${service.professional.display_name}`, url }); else { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(url); setNotice('Enlace del profesional copiado.'); } }
    catch(error) { if (error.name !== 'AbortError') setNotice('No pudimos compartir el enlace.'); }
  }
  const photo = photoSource(service?.photo_url);
  return <section className="service-detail"><header className="service-header"><Link to={backTo} state={backState} replace aria-label="Volver"><AppIcon name="back" /></Link><h1>{service?.title || 'Detalle del servicio'}</h1>{service && <button type="button" aria-label="Compartir servicio" onClick={share}><AppIcon name="share" size={21} /></button>}</header>
    {state === 'loading' ? <div className="catalog-state" role="status">Cargando servicio…</div> : state !== 'ready' ? <div className="catalog-state" role="alert"><h2>{state === 'missing' ? 'Servicio no disponible' : 'No pudimos cargar el servicio'}</h2><p>{state === 'missing' ? 'Puede que el profesional lo haya desactivado.' : 'Revisa tu conexión e inténtalo de nuevo.'}</p><button type="button" className="catalog-primary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> : <>
      <div className="service-cover">{photo && !failedPhoto ? <button type="button" aria-label="Ampliar foto del servicio" onClick={() => setViewer(true)}><img src={photo} alt={service.title} onError={() => setFailedPhoto(true)} /></button> : <div className="service-cover-placeholder"><CategoryArtwork name={service.professional.category} /><span>{service.title}</span></div>}</div>
      <ServiceConditions service={service} />
      <div className="service-description"><h2>Descripción</h2><p>{service.description}</p><h2>Qué incluye</h2>{serviceIncludes(service).length ? <ul className="service-includes">{serviceIncludes(service).map((item,index) => <li key={index}><span aria-hidden="true">✓</span>{item}</li>)}</ul> : <p>Consulta con el profesional qué incluye el trabajo antes de confirmar.</p>}<p className="service-reference-note">El precio es de referencia. Confirma el alcance y el valor final con el profesional antes de realizar el trabajo.</p><Link className="service-provider" to={`/profesional/${service.professional_id}`} state={backState}>Ver perfil de {service.professional.display_name} <span aria-hidden="true">›</span></Link>{notice && <p role="status">{notice}</p>}</div>
      <div className="service-request-bar"><Link className="catalog-primary" to={`/solicitar/${service.professional_id}?service=${service.id}`} state={{ from: `/servicio/${service.id}`, serviceFrom: backTo, profileFrom: backState.from, resultsFrom: backState.resultsFrom }}>Solicitar servicio</Link></div>
      {viewer && <PhotoViewer photos={[{url:photo,number:1}]} initialIndex={0} onClose={() => setViewer(false)} />}
    </>}
  </section>;
}
