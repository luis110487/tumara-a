import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, apiFetchPublic, AuthRequiredError } from '../lib/apiClient';
import { uploadEvidencePhoto } from '../lib/uploadEvidence';
import { CityPicker } from '../components/CityPicker';
import { useAuth } from '../context/AuthContext';

export function RegisterProfessional() {
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [formKey, setFormKey] = useState(0);
  const [uploading, setUploading] = useState(false);
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

  if (!profileLoading && role === 'admin') {
    return (
      <section className="account">
        <div>
          <span className="kicker">PROFESIONALES</span>
          <h1>Esta opción no está disponible para administradores</h1>
          <p>Las cuentas de administrador no pueden registrar un perfil profesional.</p>
          <Link className="btn primary" to="/">Volver al inicio</Link>
        </div>
      </section>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const f = e.target;
    setMsg({ text: '', ok: false });
    try {
      setUploading(true);
      const file1 = f.evidence1.files?.[0];
      const file2 = f.evidence2.files?.[0];
      const [evidence_url_1, evidence_url_2] = await Promise.all([
        file1 ? uploadEvidencePhoto(file1) : null,
        file2 ? uploadEvidencePhoto(file2) : null,
      ]);
      setUploading(false);

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
          evidence_url_1,
          evidence_url_2,
        }),
      });
      setMsg({ text: 'Perfil enviado para aprobación.', ok: true });
      f.reset();
      setFormKey(k => k + 1);
    } catch (err) {
      setUploading(false);
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
          <p className="signup-hint">Evidencias de trabajo (opcional): sube hasta 2 fotos de trabajos realizados.</p>
          <label>Foto de evidencia 1<input type="file" name="evidence1" accept="image/*" /></label>
          <label>Foto de evidencia 2<input type="file" name="evidence2" accept="image/*" /></label>
          <button className="btn primary" type="submit" disabled={uploading}>{uploading ? 'Subiendo fotos...' : 'Enviar para aprobación'}</button>
        </form>
        {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>}
      </div>
    </section>
  );
}
