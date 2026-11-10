// SEO de una aplicación de una sola página: cada pantalla actualiza título, descripción,
// URL canónica, Open Graph y datos estructurados. Google ejecuta JavaScript y los lee.
export const SITE_URL = 'https://tumara-a.vercel.app';
export const SITE_NAME = 'TuMaraña.com';
export const DEFAULT_TITLE = 'TuMaraña.com — Encuentra profesionales confiables cerca de ti';
export const DEFAULT_DESCRIPTION = 'TuMaraña.com conecta necesidades con habilidades: encuentra plomeros, electricistas, técnicos y más profesionales verificados en Colombia y pide tu servicio en minutos.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function upsert(selector, create, content, attribute) {
  let element = document.head.querySelector(selector);
  if (!content) { element?.remove(); return; }
  if (!element) { element = create(); document.head.appendChild(element); }
  element.setAttribute(attribute, content);
}
const meta = (attr, key, content) => upsert(`meta[${attr}="${key}"]`, () => { const el = document.createElement('meta'); el.setAttribute(attr, key); return el; }, content, 'content');
const link = (rel, href) => upsert(`link[rel="${rel}"]`, () => { const el = document.createElement('link'); el.setAttribute('rel', rel); return el; }, href, 'href');

export function clip(text, max = 158) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 25))}…`;
}

export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function setSeo({ title, description, path = '/', image, noindex = false, type = 'website', jsonLd } = {}) {
  if (typeof document === 'undefined') return;
  const fullTitle = title || DEFAULT_TITLE;
  const text = clip(description || DEFAULT_DESCRIPTION);
  const url = absoluteUrl(path);
  const picture = typeof image === 'string' && image.startsWith('https://') ? image : DEFAULT_IMAGE;
  document.title = fullTitle;
  meta('name', 'description', text);
  meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  link('canonical', noindex ? '' : url);
  meta('property', 'og:type', type);
  meta('property', 'og:title', fullTitle);
  meta('property', 'og:description', text);
  meta('property', 'og:url', url);
  meta('property', 'og:image', picture);
  meta('name', 'twitter:title', fullTitle);
  meta('name', 'twitter:description', text);
  meta('name', 'twitter:image', picture);
  // Datos estructurados propios de la pantalla (el del sitio vive fijo en index.html).
  let script = document.getElementById('ld-page');
  if (!jsonLd) { script?.remove(); return; }
  if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.id = 'ld-page'; document.head.appendChild(script); }
  script.textContent = JSON.stringify(jsonLd);
}

export function professionalJsonLd(pro, path) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: pro.display_name,
    url: absoluteUrl(path),
    description: clip(pro.description, 300) || undefined,
    image: typeof pro.photo_url === 'string' && pro.photo_url.startsWith('https://') ? pro.photo_url : undefined,
    serviceType: pro.category || undefined,
    areaServed: pro.city ? { '@type': 'City', name: pro.city } : undefined,
    address: pro.city ? { '@type': 'PostalAddress', addressLocality: pro.city, addressCountry: 'CO' } : undefined,
  };
  const reviews = Number(pro.total_reviews || 0);
  if (reviews > 0 && Number(pro.rating) > 0) {
    data.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(pro.rating).toFixed(1), reviewCount: reviews, bestRating: 5, worstRating: 1 };
  }
  return JSON.parse(JSON.stringify(data));
}
