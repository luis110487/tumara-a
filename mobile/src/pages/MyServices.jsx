import '../service-catalog.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { uploadPhoto, photoError } from '../lib/uploadPhoto';
import { photoSource } from '../lib/photoSource';
import { servicePrice } from '../lib/serviceCatalog';
import { AppIcon } from '../components/AppIcon';
import { ProfileModal } from '../components/ProfileModal';

export function ServiceEditor({ service, onClose, onSaved }) {
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [file,setFile]=useState(null);
  const [photo,setPhoto]=useState(photoSource(service?.photo_url)), [preview,setPreview]=useState('');
  const [priceType,setPriceType]=useState(service?.price_type || 'quote');
  const clientId=useRef(null), lock=useRef(false), photoInput=useRef(null);
  if(!clientId.current) clientId.current=crypto.randomUUID();
  useEffect(() => { if (!file) { setPreview(''); return; } const url=URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); },[file]);
  async function save(event) {
    event.preventDefault(); if(lock.current) return;
    const data=new FormData(event.currentTarget);
    const includes=String(data.get('includes') || '').split('\n').map(item=>item.trim()).filter(Boolean);
    const payload={title:String(data.get('title') || '').trim(),description:String(data.get('description') || '').trim(),price_type:priceType,price_cop:priceType==='from'?String(data.get('price') || ''):null,duration:String(data.get('duration') || '').trim(),warranty:String(data.get('warranty') || '').trim(),materials:String(data.get('materials') || '').trim(),includes,is_active:data.get('is_active')==='on'};
    if(!payload.title || !payload.description){setError('Completa el título y la descripción.');return;}
    if(includes.length>20 || includes.some(item=>item.length>180)){setError('Añade hasta 20 elementos de máximo 180 caracteres.');return;}
    if(priceType==='from' && (!/^\d+(?:\.\d{1,2})?$/.test(payload.price_cop) || Number(payload.price_cop)>9999999999.99)){setError('Escribe un precio válido con máximo dos decimales.');return;}
    lock.current=true;setBusy(true);setError('');
    try {
      payload.photo_url=file?await uploadPhoto(file,'service-photos'):photo || null;
      const path='/api/professionals/mine/services'+(service?.id?`/${service.id}`:'');
      const result=await apiFetch(path,{method:service?.id?'PATCH':'POST',body:JSON.stringify({...payload,...(!service?.id?{client_id:clientId.current}:{})})});
      if(!result?.id) throw new Error('No pudimos confirmar el guardado. Actualiza el catálogo antes de reintentar.');
      onSaved(result);
    }catch(error){setError(photoError(error));}
    finally{lock.current=false;setBusy(false);}
  }
  return <ProfileModal title={service?.id?'Editar servicio':'Nuevo servicio'} busy={busy} onClose={onClose}><form className="catalog-editor" onSubmit={save}>
    <fieldset disabled={busy}><label>Título del servicio *<input name="title" defaultValue={service?.title || ''} maxLength={200} required placeholder="Ej. Instalación eléctrica residencial" /></label>
    <label>Descripción *<textarea name="description" defaultValue={service?.description || ''} maxLength={5000} rows={4} required /></label>
    <label>Foto del servicio <small>(opcional)</small><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{setFile(event.target.files?.[0] || null);setError('');}} /></label>
    {(preview || photo) && <div className="catalog-photo-preview"><img src={preview || photo} alt="Vista previa de la foto" /><button type="button" onClick={()=>{setFile(null);setPhoto('');if(photoInput.current)photoInput.current.value='';}}>Quitar foto</button></div>}
    <p className="catalog-hint">JPG, PNG o WebP, hasta 20 MB. Las fotos grandes se optimizan antes de subirlas.</p>
    <label>Precio<select value={priceType} onChange={event=>setPriceType(event.target.value)}><option value="quote">A convenir</option><option value="from">Precio desde</option></select></label>
    {priceType==='from' && <label>Valor desde en pesos colombianos *<input name="price" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={service?.price_cop ?? ''} required inputMode="decimal" placeholder="80000" /></label>}
    <label>Tiempo estimado <small>(opcional)</small><input name="duration" defaultValue={service?.duration || ''} maxLength={100} placeholder="Ej. 2–4 horas" /></label>
    <label>Garantía <small>(opcional)</small><input name="warranty" defaultValue={service?.warranty || ''} maxLength={250} placeholder="Ej. 30 días, según condiciones" /></label>
    <label>Materiales <small>(opcional)</small><input name="materials" defaultValue={service?.materials || ''} maxLength={250} placeholder="Ej. Incluidos o suministrados por el cliente" /></label>
    <label>Qué incluye <small>(una línea por elemento)</small><textarea name="includes" rows={4} defaultValue={Array.isArray(service?.includes)?service.includes.join('\n'):''} placeholder="Mano de obra\nRevisión de la instalación" /></label>
    <label className="catalog-check"><input type="checkbox" name="is_active" defaultChecked={service?.is_active ?? true} />Servicio activo</label></fieldset>
    {error && <p className="catalog-error" role="alert">{error}</p>}
    <div className="catalog-editor-actions"><button type="submit" className="catalog-primary" disabled={busy}>{busy?'Guardando…':'Guardar servicio'}</button><button type="button" className="catalog-secondary" disabled={busy} onClick={onClose}>Cancelar</button></div>
  </form></ProfileModal>;
}

export function MyServices() {
  const [items,setItems]=useState([]),[state,setState]=useState('loading'),[editing,setEditing]=useState(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(null);
  const toggleLock=useRef(false), active=useRef(true);
  const load=useCallback(async()=>{setState('loading');setNotice('');try{const data=await apiFetch('/api/professionals/mine/services');if(!Array.isArray(data))throw new Error();if(active.current){setItems(data);setState('ready');}}catch{if(active.current)setState('error');}},[]);
  useEffect(()=>{active.current=true;load();return()=>{active.current=false;};},[load]);
  async function toggle(service){if(toggleLock.current)return;toggleLock.current=true;setBusy(service.id);setNotice('');try{const saved=await apiFetch(`/api/professionals/mine/services/${service.id}`,{method:'PATCH',body:JSON.stringify({is_active:!service.is_active})});if(!saved?.id)throw new Error();if(active.current)setItems(rows=>rows.map(item=>item.id===saved.id?saved:item));}catch(error){if(active.current)setNotice(error.message || 'No pudimos cambiar el estado.');}finally{toggleLock.current=false;if(active.current)setBusy(null);}}
  return <section className="my-services"><header className="service-header"><Link to="/mi-perfil-profesional" aria-label="Volver a mi perfil profesional"><AppIcon name="back" /></Link><h1>Mis servicios</h1><button type="button" aria-label="Actualizar catálogo" onClick={load} disabled={busy!==null || state==='loading'}><AppIcon name="refresh" /></button></header>
    <p className="catalog-hint">Los servicios activos aparecerán cuando tu perfil profesional esté aprobado. Puedes desactivarlos sin cambiar solicitudes anteriores.</p>
    <button type="button" className="catalog-primary" onClick={()=>setEditing({})} disabled={state!=='ready' || busy!==null}><AppIcon name="plus" size={20} />Crear servicio</button>
    {notice && <p className={notice==='Servicio guardado correctamente.'?'catalog-success':'catalog-error'} role={notice==='Servicio guardado correctamente.'?'status':'alert'}>{notice}</p>}
    {state==='loading'?<p className="catalog-state" role="status">Cargando tus servicios…</p>:state==='error'?<div className="catalog-state" role="alert"><p>No pudimos cargar el catálogo.</p><button type="button" className="catalog-secondary" onClick={load}>Reintentar catálogo</button></div>:!items.length?<div className="catalog-state"><h2>Publica tu primer servicio</h2><p>Añade lo que ofreces y sus condiciones para que los clientes puedan solicitarlo.</p></div>:<div className="catalog-owner-list">{items.map(service=><article key={service.id}><span className={`catalog-status${service.is_active?' is-active':''}`}>{service.is_active?'Activo':'Inactivo'}</span><h2>{service.title}</h2><p>{service.price_type==='from'?'Desde ':''}{servicePrice(service)}</p><div><button type="button" className="catalog-secondary" disabled={busy!==null} onClick={()=>setEditing(service)}>Editar</button><button type="button" className="catalog-secondary" disabled={busy!==null} onClick={()=>toggle(service)}>{busy===service.id?'Guardando…':service.is_active?'Desactivar':'Activar'}</button></div></article>)}</div>}
    {editing && <ServiceEditor service={editing} onClose={()=>setEditing(null)} onSaved={saved=>{setItems(rows=>[saved,...rows.filter(item=>item.id!==saved.id)]);setEditing(null);setNotice('Servicio guardado correctamente.');}} />}
  </section>;
}
