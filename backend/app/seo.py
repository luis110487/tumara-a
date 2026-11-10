"""SEO: mapa del sitio con las páginas públicas y los perfiles de profesionales aprobados.

Vercel lo publica en /sitemap.xml mediante una reescritura (ver frontend/vercel.json).
"""
import logging
from xml.sax.saxutils import escape

from flask import Blueprint, Response

from .email_client import APP_BASE_URL
from .supabase_client import rest, SupabaseError

log = logging.getLogger('tumarana.seo')
seo = Blueprint('seo', __name__)

# (ruta, prioridad, frecuencia de cambio)
STATIC_PAGES = [('/', '1.0', 'daily'), ('/buscar', '0.9', 'daily')]
MAX_PROFESSIONALS = 5000


def build_sitemap(professional_ids):
    urls = [(f'{APP_BASE_URL}{path}', priority, frequency) for path, priority, frequency in STATIC_PAGES]
    urls += [(f'{APP_BASE_URL}/profesional/{int(pid)}', '0.7', 'weekly') for pid in professional_ids]
    items = ''.join(
        f'<url><loc>{escape(loc)}</loc><changefreq>{frequency}</changefreq><priority>{priority}</priority></url>'
        for loc, priority, frequency in urls
    )
    return f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>'


@seo.get('/sitemap.xml')
def sitemap():
    try:
        rows = rest('professionals', {'select': 'id', 'status': 'eq.approved', 'order': 'id.asc', 'limit': str(MAX_PROFESSIONALS)})
        ids = [row['id'] for row in rows if isinstance(row, dict) and str(row.get('id', '')).isdigit()]
    except SupabaseError as error:
        # Si la base no responde, se publica al menos el mapa con las páginas fijas.
        log.warning('Sitemap sin profesionales: %s', error)
        ids = []
    response = Response(build_sitemap(ids), mimetype='application/xml')
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response
