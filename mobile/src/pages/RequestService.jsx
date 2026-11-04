import '../service-catalog.css';
import '../request-service-refresh.css';
import '../request-brand-colors.css';
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

function ConfirmationPhotos({ files }) {
  const [previews, setPreviews] = useState([]);
  useEffect(() => { const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls); return () => urls.forEach(URL.revokeObjectURL); }, [files]);
  return previews.length ? <div className="request-confirm-photos">{previews.map((url, index) => <img key={url} src={url} alt={`Foto ${index + 1} de la solicitud`} />)}</div> : <span>Sin fotos</span>;
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
  const [step, setStep] = useState(1);
  const [confirmData, setConfirmData] = useState(null);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const formRef = useRef(null);
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
    const fields = confirmData || new FormData(event.currentTarget);
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
  function continueToConfirmation(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get('title') || '').trim();
    const description = String(fields.get('description') || '').trim();
    const date = fields.get('date');
    const time = fields.get('time');
    if (!title || !description) { setMsg('Describe tu necesidad para continuar.'); return; }
    if (Boolean(date) !== Boolean(time)) { setMsg('Completa la fecha y la hora, o deja ambas sin seleccionar.'); return; }
    const preferred = date && time ? new Date(`${date}T${time}`) : null;
    if (preferred && (!Number.isFinite(preferred.getTime()) || preferred <= new Date())) { setMsg('Elige una fecha y hora futuras.'); return; }
    setConfirmData(fields); setMsg(''); setStep(2);
  }
  function quickSchedule(days) {
    const form = formRef.current;
    if (!form) return;
    const target = new Date(); target.setDate(target.getDate() + days);
    const date = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    const dateInput = form.elements.date, timeInput = form.elements.time;
    if (dateInput) dateInput.value = date;
    if (timeInput && !timeInput.value) timeInput.value = '09:00';
  }
  return <section className="request-screen">
    <header className="request-header"><Link to={serviceId ? `/servicio/${serviceId}` : `/profesional/${id}`} state={{ from: location.state?.serviceFrom, profileFrom: location.state?.profileFrom, resultsFrom: location.state?.resultsFrom }} aria-label="Volver al perfil o servicio"><AppIcon name="back" /></Link><img className="request-brand-logo" src="/brand-logo-transparent.png" alt="TuMaraña.com" /><h1>Solicitar servicio</h1></header>
    <div className="request-progress" aria-label={`Paso ${step} de 3`}><span className={step === 1 ? 'is-current' : 'is-complete'}><b>{step > 1 ? '✓' : '1'}</b>Detalles</span><i /><span className={step === 2 ? 'is-current' : ''}><b>2</b>Confirmación</span><i /><span><b>3</b>Listo</span></div>
    {loadError ? <div className="request-state" role="alert"><h2>No pudimos cargar el profesional</h2><p>Revisa tu conexión o vuelve al perfil para elegir otro profesional.</p><button type="button" className="request-submit" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> : !p ? <div className="request-state" role="status">Cargando profesional…</div> : <>
      <div className="request-intro"><div><h1>{step === 1 ? 'Solicitar servicio' : 'Confirma tu solicitud'}</h1><p>{step === 1 ? 'Cuéntanos qué necesitas y te ayudaremos a encontrar al profesional ideal.' : 'Revisa la información antes de enviarla.'}</p></div><span className="request-intro-art" aria-hidden="true"><AppIcon name={step === 1 ? 'clipboard' : 'shield'} size={54} /></span></div>
      <Link className="request-pro" to={`/profesional/${p.id}`}>
        {p.photo_url && !photoFailed ? <img src={p.photo_url} alt="" onError={() => setPhotoFailed(true)} /> : <span className="request-avatar"><AppIcon name="user" size={28} /></span>}
        <div><h2>{p.display_name}</h2><p>{p.category || 'Profesional de servicios'}</p><div className="request-pro-rating"><span>★ {Number(p.rating || 0).toFixed(1)}</span><small>({p.total_reviews || 0})</small>{p.verified && <b>✓ Verificado</b>}</div></div>
      </Link>
      <form ref={formRef} className="request-form" onSubmit={step === 1 ? continueToConfirmation : handleSubmit} aria-busy={sending}>
        {step === 1 ? <fieldset className="request-details" disabled={sending}>
          <input name="title" type="hidden" value={service?.title || p.category || ''} readOnly />
          <section className="request-card"><header><b><AppIcon name="pin" size={22} /></b><span><strong>¿Dónde necesitas el servicio?</strong><small>Selecciona la ciudad y agrega más detalles.</small></span></header><label className="request-field"><CitySelect name="city" value={city} onChange={setCity} placeholder="Selecciona tu ciudad" /></label><label className="request-field"><span>Dirección o zona <small>(opcional)</small></span><input name="address" placeholder="Ej. Barrio, dirección o punto de referencia" maxLength={250} autoComplete="street-address" /></label></section>
          <section className="request-card"><header><b><AppIcon name="calendar" size={22} /></b><span><strong>¿Cuándo lo necesitas?</strong><small>Puedes dejarlo vacío para coordinar por chat.</small></span></header><div className="request-schedule"><label><span>Fecha</span><input name="date" type="date" min={minDate} /></label><label><span>Hora</span><input name="time" type="time" /></label></div><div className="request-quick-dates"><button type="button" onClick={() => quickSchedule(1)}>⚡ Lo antes posible</button><button type="button" onClick={() => quickSchedule(7)}>Esta semana</button><button type="button" onClick={() => quickSchedule(30)}>Este mes</button></div></section>
          <section className="request-card"><header><b><AppIcon name="clipboard" size={22} /></b><span><strong>Describe tu necesidad <i>*</i></strong><small>Mientras más detalle, mejores propuestas recibirás.</small></span></header><label className="request-field"><textarea name="description" rows={4} placeholder="Ej. Necesito instalar unos puntos de luz en mi sala, incluir materiales si es posible…" maxLength={500} required onChange={event => setDescriptionLength(event.target.value.length)} /></label><div className="request-count">{descriptionLength}/500</div><div className="request-tags"><span>Instalación</span><span>Reparación</span><span>Mantenimiento</span><span>Revisión</span></div></section>
          <section className="request-card"><header><b><AppIcon name="card" size={22} /></b><span><strong>Fotos <em>(opcional)</em></strong><small>Agrega hasta 3 fotos para que el profesional entienda mejor.</small></span></header><RequestPhotos files={photos} onChange={setPhotos} disabled={sending} /></section>
        </fieldset> : <section className="request-confirmation"><div><header><strong>Profesional seleccionado</strong><button type="button" onClick={() => setStep(1)}>Editar</button></header><span>{p.display_name}<br />{p.category || 'Profesional de servicios'}<br />★ {Number(p.rating || 0).toFixed(1)} {p.verified ? ' · ✓ Verificado' : ''}</span></div><div><header><strong>Ubicación del servicio</strong><button type="button" onClick={() => setStep(1)}>Editar</button></header><span>{city || 'Por confirmar'}{confirmData?.get('address') ? ` · ${confirmData.get('address')}` : ''}</span></div><div><header><strong>Fecha y hora</strong><button type="button" onClick={() => setStep(1)}>Editar</button></header><span>{confirmData?.get('date') && confirmData?.get('time') ? `${confirmData.get('date')} · ${confirmData.get('time')}` : 'A coordinar por chat'}</span></div><div><header><strong>Descripción del servicio</strong><button type="button" onClick={() => setStep(1)}>Editar</button></header><span>{confirmData?.get('description')}</span></div><div><header><strong>Fotos ({photos.length})</strong><button type="button" onClick={() => setStep(1)}>Editar</button></header><ConfirmationPhotos files={photos} /></div><aside><AppIcon name="chat" size={26} /><span><strong>Después de enviar tu solicitud</strong>El profesional revisará tu solicitud y se pondrá en contacto contigo por el chat de la aplicación.</span></aside></section>}
        {msg && <div className="request-error" role="alert"><p>{msg}</p><Link to="/mis-solicitudes">Ver mis solicitudes</Link></div>}
        <div className="request-action"><button className="request-submit" type="submit" disabled={sending}>{sending ? 'Enviando…' : <>{step === 1 ? 'Continuar' : 'Enviar solicitud'} <span aria-hidden="true">→</span></>}</button></div>
      </form>
    </>}
  </section>;
}
