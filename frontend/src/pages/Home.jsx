import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { CategoryCard } from '../components/CategoryCard';
import { ProCard } from '../components/ProCard';
import { CitySelect } from '../components/CitySelect';
import { BannerAd } from '../components/BannerAd';
import { useAuth } from '../context/AuthContext';

const DEFAULT_TEXTS = {
  home_categories_title: 'Categorías populares',
  home_professionals_title: 'Profesionales destacados',
  home_how_it_works_title: 'Así de fácil',
  hero_image_url: '/hero-professionals.webp',
};

export function Home() {
  const [categories, setCategories] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [texts, setTexts] = useState(DEFAULT_TEXTS);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();
  const { role } = useAuth();

  useEffect(() => {
    apiFetchPublic('/api/categories').then(setCategories).catch(() => setCategories([]));
    apiFetchPublic('/api/professionals?limit=8').then(setProfessionals).catch(() => setProfessionals([]));
    apiFetchPublic('/api/site-texts').then(t => setTexts({ ...DEFAULT_TEXTS, ...t })).catch(() => {});
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    navigate(`/buscar?${params.toString()}`);
  }

  return (
    <>
      <section className="tm-hero">
        <div className="tm-hero-copy">
          <span className="tm-kicker">TU MARAÑA.COM</span>
          <h1>Conectamos<br />necesidades<br /><em>con habilidades</em></h1>
          <p>Encuentra profesionales confiables para realizar cualquier servicio que necesites en tu hogar o negocio.</p>
        </div>
        <div className="tm-hero-art">
          <div className="tm-circle tm-yellow" />
          <div className="tm-circle tm-blue" />
          <img className="tm-hero-photo" src={texts.hero_image_url} alt="Profesionales de limpieza y mantenimiento de TuMaraña.com" />
        </div>
        <form className="tm-search" onSubmit={handleSearch}>
          <div className="tm-field"><span>⌕</span><div><small>¿QUÉ SERVICIO NECESITAS?</small>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ej. Plomero, Electricista, Pintor" /></div></div>
          <div className="tm-field"><span>⌖</span><div><small>UBICACIÓN</small>
            <CitySelect value={city} onChange={setCity} placeholder="Tu ciudad o zona" /></div></div>
          <div className="tm-field"><span>⌄</span><div><small>CATEGORÍA</small>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div></div>
          <button type="submit">Buscar</button>
        </form>
        <div className="tm-actions">
          <a className="tm-btn tm-primary" href="/buscar">▣ Buscar un profesional</a>
          {role !== 'professional' && role !== 'admin' && <a className="tm-btn tm-outline" href="/registrar">♙ Soy profesional</a>}
        </div>
      </section>

      <section className="tm-section" id="categorias">
        <div className="tm-section-head"><h2>{texts.home_categories_title}</h2><a href="/buscar">Ver todas las categorías →</a></div>
        <div className="tm-category-grid">
          {categories.slice(0, 7).map((c, i) => <CategoryCard key={c.id} category={c} index={i} />)}
          <a className="tm-category" href="/buscar"><div className="tm-cat-icon tm-tile-navy">•••</div><strong>Más categorías</strong></a>
        </div>
      </section>

      <section className="tm-section tm-featured" id="profesionales">
        <div className="tm-section-head"><h2>{texts.home_professionals_title}</h2><a href="/buscar">Ver todos los profesionales →</a></div>
        <div className="tm-pro-grid">
          {professionals.length ? professionals.map(p => <ProCard key={p.id} p={p} />) : <div className="empty">Conecta Supabase para mostrar profesionales.</div>}
        </div>
      </section>

      <BannerAd />

      <section className="tm-section" id="como-funciona">
        <div className="tm-section-head"><h2>{texts.home_how_it_works_title}</h2></div>
        <div className="steps">
          <article><b>01</b><h3>Busca</h3><p>Encuentra el servicio que necesitas y filtra por ubicación.</p></article>
          <article><b>02</b><h3>Compara</h3><p>Revisa experiencia, valoraciones y perfiles verificados.</p></article>
          <article><b>03</b><h3>Conecta</h3><p>Solicita el servicio y conversa directamente con el profesional.</p></article>
        </div>
      </section>
    </>
  );
}
