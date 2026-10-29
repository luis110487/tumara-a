import '../service-catalog.css';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { apiFetch, apiFetchPublic, AuthRequiredError } from '../lib/apiClient';
import { loginRedirectState } from '../lib/loginRedirect';
import { readSelectedCity } from '../lib/selectedCity';
import { CitySelect } from '../components/CitySelect';
import { AppIcon } from '../components/AppIcon';
import { uploadPhoto, photoError } from '../lib/uploadPhoto';
import { servicePrice } from '../lib/serviceCatalog';

function RequestPhotos({ files, onChange, disabled }) {
  const [previews,setPreviews]=useState([]), input=useRef(null);
  useEffect(()=>{const urls=files.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(URL.revokeObjectURL);},[files]);
  function add(event){const selected=Array.from(event.target.files || []);if(selected.length)onChange([...files,...selected].slice(0,3));event.target.value='';}
  return <div className="request-photos"><div className="request-photo-list">{previews.map((url,index)=><div key={`${files[index].name}-${files[index].lastModified}`}><img src={url} alt={`Foto opcional ${index+1}`} /><button type="button" disabled={disabled} aria-label={`Quitar foto ${index+1}`} onClick={()=>onChange(files.filter((_,position)=>position!==index))}>×</button></div>)}{files.length<3&&<button type="button" className="request-photo-add" disabled={disabled} onClick={()=>input.current?.click()} aria-label="Agregar fotos"><AppIcon name="plus" size={23} /></button>}</div><input ref={input} className="request-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={add} disabled={disabled} /><small>Hasta 3 fotos JPG, PNG o WebP. Máximo 20 MB cada una.</small></div>;
}

export function RequestService() {
  const { id } = useParams();
  const [params] = useSearchParams(), location = useLocation();
  const serviceId = params.get('service');
  const [service, setService] = useState(null);
  const [p, setP] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [city, setCity] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photos,setPhotos]=useState([]);
  const submitting = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    setP(null); setService(null); setLoadError(false); setPhotoFailed(false); setMsg('');
    if (serviceId && !/^[1-9]\d*$/.test(serviceId)) { setLoadError(true); return () => { active = false; }; }
    Promise.all([apiFetchPublic(`/api/professionals/${id}`), serviceId ? apiFetchPublic(`/api/services/${serviceId}`) : Promise.resolve(null)]).then(([data, selected]) => {
      if (!data?.id || !data.display_name) throw new Error('Invalid professional');
      if (serviceId && (!selected?.id || String(selected.id) !== serviceId || !selected.is_active || String(selected.professional_id) !== String(id))) throw new Error('Unavailable service');
      if (active) { setService(selected); setP(data); setCity(readSelectedCity() || data.city || ''); }
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [id, retry, serviceId]);
  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get('title') || '').trim();
    const description = String(fields.get('description') || '').trim();
    const date = fields.get('date');
    const time = fields.get('time');
    setMsg('');
    if (!title || !description) { setMsg('Escribe el servicio y describe tu necesidad.'); return; }
    if (Boolean(date) !== Boolean(time)) { setMsg('Completa la fecha y la hora, o deja ambas sin seleccionar para coordinarlas por chat.'); return; }
    const preferred = date && time ? new Date(`${date}T${time}`) : null;
    if (preferred && (!Number.isFinite(preferred.getTime()) || preferred <= new Date())) { setMsg('Elige una fecha y hora futuras.'); return; }
    submitting.current = true; setSending(true);
    try {
      const photoUrls=await Promise.all(photos.map(file=>uploadPhoto(file,'request-photos')));
      const result = await apiFetch('/api/requests', { method: 'POST', body: JSON.stringify({
        professional_id: id, service_title: title, description, city: city.trim(),
        ...(service ? { service_id: service.id } : {}),
        photo_urls:photoUrls,
        address: String(fields.get('address') || '').trim(), preferred_date: preferred ? preferred.toISOString() : null,
      }) });
      if (!result?.id) { setMsg('No recibimos el identificador de la solicitud. Revisa Mis solicitudes antes de volver a enviarla.'); return; }
      navigate(`/solicitud/${result.id}/chat`, { replace: true });
    } catch (error) {
      if (error instanceof AuthRequiredError) { navigate('/cuenta', loginRedirectState()); return; }
      setMsg(error instanceof TypeError ? 'No pudimos confirmar el envío. Revisa tu conexión y Mis solicitudes antes de reintentar.' : photoError(error));
    } finally { submitting.current = false; setSending(false); }
  }
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <section className="request-screen">
    <header className="request-header"><Link to={serviceId ? `/servicio/${serviceId}` : `/profesional/${id}`} state={{ from: location.state?.serviceFrom, profileFrom: location.state?.profileFrom, resultsFrom: location.state?.resultsFrom }} aria-label="Volver al perfil o servicio"><AppIcon name="back" /></Link><h1>Solicitar servicio</h1></header>
    <div className="request-progress" aria-label="Paso 1 de 3"><span className="is-current"><b>1</b>Detalles</span><i /><span><b>2</b>Confirmación</span><i /><span><b>3</b>Listo</span></div>
    {loadError ? <div className="request-state" role="alert"><h2>No pudimos cargar el profesional</h2><p>Revisa tu conexión o vuelve al perfil para elegir otro profesional.</p><button type="button" className="request-submit" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> : !p ? <div className="request-state" role="status">Cargando profesional…</div> : <>
      <Link className="request-pro" to={`/profesional/${p.id}`}>
        {p.photo_url && !photoFailed ? <img src={p.photo_url} alt="" onError={() => setPhotoFailed(true)} /> : <span className="request-avatar"><AppIcon name="user" size={28} /></span>}
        <div><h2>{p.display_name}</h2><p>{p.category || 'Profesional de servicios'}</p><div className="request-pro-rating"><span>★ {Number(p.rating || 0).toFixed(1)}</span><small>({p.total_reviews || 0})</small>{p.verified && <b>✓ Verificado</b>}</div></div>
      </Link>
      <form className="request-form" onSubmit={handleSubmit} aria-busy={sending}>
        <fieldset disabled={sending}>
          <input name="title" type="hidden" value={service?.title || p.category || ''} readOnly />
          <label>Dirección del servicio<div className="request-address"><CitySelect name="city" value={city} onChange={setCity} placeholder="Selecciona tu ciudad" /><AppIcon name="pin" size={18} /></div></label>
          <label>Dirección o zona <small>(opcional)</small><input name="address" placeholder="Barrio, dirección o punto de referencia" maxLength={250} autoComplete="street-address" /></label>
          <div className="request-schedule-title">Fecha y hora <small>(opcional)</small></div><div className="request-schedule"><label><span>Fecha</span><input name="date" type="date" min={minDate} /></label><label><span>Hora</span><input name="time" type="time" /></label></div>
          <p className="request-hint">Puedes dejar ambas vacías para coordinarlas por chat.</p>
          <label>Describe tu necesidad <span>*</span><textarea name="description" rows={4} placeholder="Ej. Necesito instalar unos puntos de luz en mi sala…" maxLength={5000} required /></label>
          <label>Fotos <small>(opcional)</small><RequestPhotos files={photos} onChange={setPhotos} disabled={sending} /></label>
        </fieldset>
        {msg && <div className="request-error" role="alert"><p>{msg}</p><Link to="/mis-solicitudes">Ver mis solicitudes</Link></div>}
        <div className="request-action"><div><small>Total estimado</small><strong>{service?servicePrice(service):'A convenir'}</strong></div><button className="request-submit" type="submit" disabled={sending}>{sending ? 'Enviando…' : <>Continuar <span aria-hidden="true">→</span></>}</button></div>
      </form>
    </>}
  </section>;
}
