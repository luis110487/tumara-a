"""Pruebas del endurecimiento de la API. Ejecutar desde backend/: python -m unittest discover -s tests -v"""
import os
import unittest
from unittest import mock

os.environ.setdefault('SUPABASE_URL', 'https://prueba.supabase.co')
os.environ.setdefault('SUPABASE_ANON_KEY', 'clave-publica-de-prueba')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'clave-de-servicio-de-prueba')

import requests

from app import create_app
from app.security import limiter
from app.supabase_client import SupabaseError

USUARIO = {'id': 'u-1', 'email': 'prueba@example.com', 'user_metadata': {}}
TOKEN = {'Authorization': 'Bearer ' + 'a' * 40}


class HardeningTests(unittest.TestCase):
    def setUp(self):
        limiter.clear()
        self.app = create_app()
        self.client = self.app.test_client()

    # ---- cabeceras ----
    def test_cabeceras_de_seguridad_en_la_api(self):
        r = self.client.get('/health')
        self.assertEqual(r.headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(r.headers['X-Frame-Options'], 'DENY')
        self.assertIn("default-src 'none'", r.headers['Content-Security-Policy'])
        self.assertIn('noindex', r.headers['X-Robots-Tag'])

    def test_respuestas_con_sesion_no_se_guardan_en_cache(self):
        with mock.patch('app.routes.auth_user', return_value=None):
            r = self.client.get('/api/me', headers=TOKEN)
        self.assertEqual(r.headers['Cache-Control'], 'no-store')

    def test_cors_solo_permite_el_origen_configurado(self):
        r = self.client.options('/api/categories', headers={'Origin': 'https://sitio-malicioso.example', 'Access-Control-Request-Method': 'GET'})
        self.assertNotIn('Access-Control-Allow-Origin', r.headers)

    # ---- errores controlados ----
    def test_no_se_filtra_el_detalle_interno(self):
        secreto = 'Supabase REST 500: relation "tabla_secreta" does not exist'
        with mock.patch('app.routes.auth_user', return_value=USUARIO), mock.patch('app.routes.rest', side_effect=SupabaseError(secreto)):
            r = self.client.get('/api/me', headers=TOKEN)
        self.assertNotIn('tabla_secreta', r.get_data(as_text=True))
        self.assertNotIn('detail', r.get_json())

    def test_el_detalle_solo_sale_si_se_pide_explicitamente(self):
        self.app.config['EXPOSE_ERRORS'] = True
        with mock.patch('app.routes.auth_user', return_value=USUARIO), mock.patch('app.routes.rest', side_effect=SupabaseError('detalle')):
            r = self.client.get('/api/me', headers=TOKEN)
        self.assertEqual(r.get_json().get('detail'), 'detalle')

    def test_corte_de_red_hacia_supabase_devuelve_json_y_no_revienta(self):
        with mock.patch('app.supabase_client.requests.get', side_effect=requests.ConnectionError('sin red')):
            r = self.client.get('/api/me', headers=TOKEN)
        self.assertIn(r.status_code, (502, 503))
        self.assertIn('error', r.get_json())

    def test_error_inesperado_devuelve_500_generico_sin_traza(self):
        with mock.patch('app.routes.auth_user', return_value=USUARIO), mock.patch('app.routes.rest', side_effect=ValueError('traza interna')):
            r = self.client.get('/api/me', headers=TOKEN)
        self.assertEqual(r.status_code, 500)
        self.assertNotIn('traza interna', r.get_data(as_text=True))
        self.assertNotIn('Traceback', r.get_data(as_text=True))

    def test_ruta_inexistente_responde_json(self):
        r = self.client.get('/api/no-existe')
        self.assertEqual(r.status_code, 404)
        self.assertTrue(r.is_json)

    def test_cuerpo_demasiado_grande_se_rechaza(self):
        r = self.client.post('/api/requests', data='x' * (3 * 1024 * 1024), headers={**TOKEN, 'Content-Type': 'application/json'})
        self.assertEqual(r.status_code, 413)

    # ---- límite de peticiones ----
    def test_limite_de_peticiones_en_envio_de_correo_de_bienvenida(self):
        with mock.patch('app.routes.auth_user', return_value=USUARIO), mock.patch('app.routes.send_welcome_email'):
            codigos = [self.client.post('/api/welcome-email', headers=TOKEN).status_code for _ in range(5)]
        self.assertEqual(codigos[:3], [200, 200, 200])
        self.assertEqual(codigos[3:], [429, 429])

    def test_limite_incluye_retry_after_y_mensaje(self):
        with mock.patch('app.routes.auth_user', return_value=USUARIO), mock.patch('app.routes.send_welcome_email'):
            respuestas = [self.client.post('/api/welcome-email', headers=TOKEN) for _ in range(4)]
        self.assertTrue(respuestas[-1].headers['Retry-After'].isdigit())
        self.assertIn('error', respuestas[-1].get_json())

    def test_el_limite_es_por_usuario_y_no_bloquea_a_otros(self):
        otro = {'Authorization': 'Bearer ' + 'b' * 40}
        with mock.patch('app.routes.auth_user', return_value=USUARIO), mock.patch('app.routes.send_welcome_email'):
            for _ in range(4):
                self.client.post('/api/welcome-email', headers=TOKEN)
            r = self.client.post('/api/welcome-email', headers=otro)
        self.assertEqual(r.status_code, 200)

    # ---- SEO ----
    def test_sitemap_incluye_profesionales_aprobados(self):
        with mock.patch('app.seo.rest', return_value=[{'id': 7}, {'id': 12}]):
            r = self.client.get('/sitemap.xml')
        xml = r.get_data(as_text=True)
        self.assertEqual(r.mimetype, 'application/xml')
        self.assertIn('/profesional/7</loc>', xml)
        self.assertIn('/profesional/12</loc>', xml)
        self.assertNotIn('noindex', r.headers.get('X-Robots-Tag', ''))

    def test_sitemap_funciona_aunque_la_base_no_responda(self):
        with mock.patch('app.seo.rest', side_effect=SupabaseError('caída')):
            r = self.client.get('/sitemap.xml')
        self.assertEqual(r.status_code, 200)
        self.assertIn('<loc>', r.get_data(as_text=True))

    def test_sitemap_ignora_ids_no_numericos(self):
        with mock.patch('app.seo.rest', return_value=[{'id': "1</loc><x>"}, {'id': 3}]):
            xml = self.client.get('/sitemap.xml').get_data(as_text=True)
        self.assertNotIn('<x>', xml)
        self.assertIn('/profesional/3</loc>', xml)


if __name__ == '__main__':
    unittest.main()
