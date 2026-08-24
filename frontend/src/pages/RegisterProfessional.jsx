import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, apiFetchPublic, AuthRequiredError } from '../lib/apiClient';
import { CityPicker } from '../components/CityPicker';
import { useAuth } from '../context/AuthContext';

export function RegisterProfessional() {
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [formKey, setFormKey] = useState(0);
  const navigate = useNavigate();
  const { role, profileLoading } = useAuth();

  useEffect(() => {
    apiFetchPublic('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  if (!profileLoading && role === 'professional') {
    return (
      <section className="account">
        <div>
          <span className="kicker">PROFESIONALES</span>
          <h1>Ya tienes un perfil profesional</h1>
          <p>Puedes ver o editar tu perfil desde "Mi perfil profesional" en el menú.</p>
          <Link className="btn primary" to="/mi-perfil-profesional">Ir a mi perfil profesional</Link>
        </div>
      </section>
    );
  }

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
      setFormKey(k => k + 1);
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
        <form onSubmit={handleSubmit} key={formKey}>
          <label>Nombre comercial<input name="name" required maxLength={150} /></label>
          <label>Categoría
            <select name="category" required>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <CityPicker name="city" required />
          <label>Barrio<input name="neighborhood" maxLength={100} /></label>
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
