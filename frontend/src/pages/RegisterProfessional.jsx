import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiFetchPublic, AuthRequiredError } from '../lib/apiClient';

export function RegisterProfessional() {
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const navigate = useNavigate();

  useEffect(() => {
    apiFetchPublic('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const f = e.target;
    try {
      await apiFetch('/api/professionals', {
        method: 'POST',
        body: JSON.stringify({
          display_name: f.name.value.trim(),
          category_id: f.category.value,
          city: f.city.value.trim(),
          neighborhood: f.neighborhood.value.trim(),
          experience_years: f.experience.value,
          description: f.description.value.trim(),
          whatsapp: f.whatsapp.value.trim(),
        }),
      });
      setMsg({ text: 'Perfil enviado para aprobación.', ok: true });
      f.reset();
    } catch (err) {
      if (err instanceof AuthRequiredError) return navigate('/cuenta');
      setMsg({ text: err.message, ok: false });
    }
  }

  return (
    <section className="account">
      <div>
        <span className="kicker">PROFESIONALES</span>
        <h1>Haz visible tu habilidad.</h1>
        <p>Registra tu servicio. Tu perfil quedará pendiente de revisión antes de aparecer públicamente.</p>
        <ul className="benefits">
          <li>✓ Perfil profesional</li>
          <li>✓ Solicitudes de clientes</li>
          <li>✓ Chat dentro de la plataforma</li>
        </ul>
      </div>
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <label>Nombre comercial<input name="name" required maxLength={150} /></label>
          <label>Categoría
            <select name="category" required>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="two">
            <label>Ciudad<input name="city" required maxLength={100} /></label>
            <label>Barrio<input name="neighborhood" maxLength={100} /></label>
          </div>
          <label>WhatsApp (opcional)<input name="whatsapp" placeholder="573001234567" maxLength={20} /></label>
          <label>Años de experiencia<input name="experience" type="number" min="0" max="80" defaultValue="0" /></label>
          <label>Descripción<textarea name="description" rows={6} maxLength={3000} required /></label>
          <button className="btn primary" type="submit">Enviar para aprobación</button>
        </form>
        {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>}
      </div>
    </section>
  );
}
