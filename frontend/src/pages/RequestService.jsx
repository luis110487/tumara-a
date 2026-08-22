import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch, apiFetchPublic, AuthRequiredError } from '../lib/apiClient';

export function RequestService() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiFetchPublic(`/api/professionals/${id}`).then(setP).catch(() => setP(null));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    const f = e.target;
    try {
      const j = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          professional_id: id,
          service_title: f.title.value.trim(),
          description: f.description.value.trim(),
          city: f.city.value.trim(),
          address: f.address.value.trim(),
          preferred_date: f.date.value ? new Date(f.date.value).toISOString() : null,
        }),
      });
      navigate(`/solicitud/${j.id}/chat`);
    } catch (err) {
      if (err instanceof AuthRequiredError) return navigate('/cuenta');
      setMsg(err.message);
    }
  }

  if (!p) return <section className="account"><p>Cargando…</p></section>;

  return (
    <section className="account">
      <div>
        <span className="kicker">SOLICITUD</span>
        <h1>Contacta a {p.display_name}</h1>
        <p>{p.category} · {p.city}{p.neighborhood ? ` · ${p.neighborhood}` : ''}</p>
        <p>Describe lo que necesitas. Después podrás continuar la conversación dentro de TuMaraña.com.</p>
      </div>
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <label>Servicio solicitado<input name="title" required maxLength={200} defaultValue={`${p.category} — solicitud`} /></label>
          <label>Descripción<textarea name="description" rows={6} maxLength={5000} required placeholder="¿Qué necesitas que haga el profesional?" /></label>
          <div className="two">
            <label>Ciudad<input name="city" maxLength={100} defaultValue={p.city} /></label>
            <label>Dirección / zona<input name="address" maxLength={250} /></label>
          </div>
          <label>Fecha y horario preferido<input name="date" type="datetime-local" /></label>
          <button className="btn primary" type="submit">Enviar solicitud y abrir chat</button>
        </form>
        {msg && <div className="msg error">{msg}</div>}
      </div>
    </section>
  );
}
